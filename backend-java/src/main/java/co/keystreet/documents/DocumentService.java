package co.keystreet.documents;

import co.keystreet.catalog.dto.PagedResponse;
import co.keystreet.common.ApiException;
import co.keystreet.documents.TempPdfStore.StoredTempPdf;
import co.keystreet.documents.dto.DocumentDtos.DocumentDetailResponse;
import co.keystreet.documents.dto.DocumentDtos.DocumentErrorInfo;
import co.keystreet.documents.dto.DocumentDtos.DocumentUploadResponse;
import co.keystreet.documents.dto.DocumentDtos.IngestionResultRequest;
import co.keystreet.documents.dto.DocumentDtos.TempFileInfo;
import co.keystreet.tenant.TenantContext;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DocumentService {

  private final DocumentRepository documentRepository;
  private final PdfValidator pdfValidator;
  private final TempPdfStore tempPdfStore;
  private final JdbcTemplate jdbcTemplate;
  private final ApplicationEventPublisher eventPublisher;

  public DocumentService(
      DocumentRepository documentRepository,
      PdfValidator pdfValidator,
      TempPdfStore tempPdfStore,
      JdbcTemplate jdbcTemplate,
      ApplicationEventPublisher eventPublisher) {
    this.documentRepository = documentRepository;
    this.pdfValidator = pdfValidator;
    this.tempPdfStore = tempPdfStore;
    this.jdbcTemplate = jdbcTemplate;
    this.eventPublisher = eventPublisher;
  }

  @Transactional
  public DocumentUploadResponse upload(MultipartFile file, String titleOverride, UUID uploadedBy) {
    UUID tenantId = TenantContext.require();
    pdfValidator.validateMultipartMeta(file);

    UUID tempId = UUID.randomUUID();
    StoredTempPdf stored;
    try {
      stored = tempPdfStore.saveStreaming(tenantId, tempId, file.getInputStream());
    } catch (IOException ex) {
      throw new ApiException(
          HttpStatus.INTERNAL_SERVER_ERROR, "TEMP_WRITE_ERROR", "No se pudo recibir el PDF");
    }

    Path activeTempPath = stored.path();
    try {
      int pageCount = pdfValidator.validateStoredPdf(activeTempPath);
      String sha256 = stored.sha256Hex();
      String origName =
          file.getOriginalFilename() != null ? file.getOriginalFilename().trim() : "documento.pdf";
      String title = deriveTitle(titleOverride, origName);

      Optional<Document> existingOpt = documentRepository.findBySha256Hash(sha256);
      Document doc;
      if (existingOpt.isPresent()) {
        Document existing = existingOpt.get();
        if (existing.getStatus() != DocumentStatus.FAILED) {
          tempPdfStore.deleteVerified(activeTempPath);
          throw new ApiException(
              HttpStatus.CONFLICT,
              "DOCUMENT_DUPLICATE",
              "Este PDF ya existe en el indice.",
              Map.of("existingDocumentId", existing.getId()));
        }
        jdbcTemplate.update("DELETE FROM document_chunks WHERE document_id = ?", existing.getId());
        Path targetPath = tempPdfStore.pathFor(tenantId, existing.getId());
        Files.move(activeTempPath, targetPath, StandardCopyOption.REPLACE_EXISTING);
        activeTempPath = targetPath;
        doc = existing;
      } else {
        doc = new Document();
        doc.setId(tempId);
        doc.setTenantId(tenantId);
      }

      doc.setUploadedBy(uploadedBy);
      doc.setTitle(title);
      doc.setOriginalFilename(truncate(origName, 255));
      doc.setMimeType("application/pdf");
      doc.setSizeBytes(stored.sizeBytes());
      doc.setSha256Hash(sha256);
      doc.setStatus(DocumentStatus.PROCESSING);
      doc.setPageCount(pageCount);
      doc.setOcrPageCount(0);
      doc.setChunkCount(0);
      doc.setEmbeddingModel(null);
      doc.setEmbeddingDim(null);
      doc.setErrorCode(null);
      doc.setErrorMessage(null);
      doc.setTempFileDeletedAt(null);
      doc.setTempFileDeletionVerified(false);
      doc.setProcessingStartedAt(Instant.now());
      doc.setIndexedAt(null);

      Document saved = documentRepository.saveAndFlush(doc);
      eventPublisher.publishEvent(
          new DocumentUploadedEvent(
              saved.getId(), tenantId, activeTempPath.toString(), sha256, saved.getTitle()));

      return new DocumentUploadResponse(
          saved.getId(),
          saved.getTitle(),
          saved.getStatus(),
          saved.getSha256Hash(),
          saved.getSizeBytes(),
          saved.getCreatedAt() != null ? saved.getCreatedAt() : Instant.now());
    } catch (ApiException ex) {
      tempPdfStore.deleteVerified(activeTempPath);
      throw ex;
    } catch (Exception ex) {
      tempPdfStore.deleteVerified(activeTempPath);
      throw new ApiException(
          HttpStatus.INTERNAL_SERVER_ERROR, "UPLOAD_FAILED", "Error al procesar el PDF");
    }
  }

  @Transactional(readOnly = true)
  public PagedResponse<DocumentDetailResponse> list(
      DocumentStatus status, int page, int pageSize) {
    int safeSize = Math.max(1, Math.min(pageSize, 50));
    PageRequest pr = PageRequest.of(Math.max(0, page), safeSize);
    Page<Document> res =
        status != null
            ? documentRepository.findByStatusOrderByCreatedAtDesc(status, pr)
            : documentRepository.findAllByOrderByCreatedAtDesc(pr);
    return new PagedResponse<>(
        res.getContent().stream().map(DocumentService::toDetail).toList(),
        res.getNumber(),
        res.getSize(),
        res.getTotalElements(),
        res.getTotalPages());
  }

  @Transactional(readOnly = true)
  public DocumentDetailResponse get(UUID id) {
    Document doc =
        documentRepository
            .findById(id)
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.NOT_FOUND, "DOCUMENT_NOT_FOUND", "Documento no encontrado"));
    return toDetail(doc);
  }

  @Transactional
  public void delete(UUID id) {
    Document doc =
        documentRepository
            .findById(id)
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.NOT_FOUND, "DOCUMENT_NOT_FOUND", "Documento no encontrado"));
    Path tempPath = tempPdfStore.pathFor(doc.getTenantId(), doc.getId());
    tempPdfStore.deleteVerified(tempPath);
    documentRepository.delete(doc);
  }

  @Transactional
  public void handleIngestionResult(UUID documentId, IngestionResultRequest req) {
    Path tempPath = tempPdfStore.pathFor(req.tenantId(), documentId);
    Document doc = documentRepository.findById(documentId).orElse(null);
    if (doc == null) {
      tempPdfStore.deleteVerified(tempPath);
      throw new ApiException(
          HttpStatus.NOT_FOUND, "DOCUMENT_NOT_FOUND", "Documento no encontrado");
    }

    if (req.status() == DocumentStatus.INDEXED) {
      Map<String, Object> stats =
          jdbcTemplate.queryForMap(
              "SELECT count(*) AS cnt, min(embedding_model) AS min_m, max(embedding_model) AS max_m "
                  + "FROM document_chunks WHERE document_id = ? AND embedding IS NOT NULL",
              documentId);
      long dbCount = ((Number) stats.get("cnt")).longValue();
      String minModel = (String) stats.get("min_m");
      String maxModel = (String) stats.get("max_m");

      boolean valid =
          req.chunkCount() > 0
              && dbCount == req.chunkCount()
              && req.embeddingModel() != null
              && req.embeddingModel().equals(minModel)
              && req.embeddingModel().equals(maxModel);

      if (valid) {
        doc.setStatus(DocumentStatus.INDEXED);
        doc.setChunkCount(req.chunkCount());
        doc.setPageCount(req.pageCount() != null ? req.pageCount() : doc.getPageCount());
        doc.setOcrPageCount(req.ocrPageCount());
        doc.setEmbeddingModel(req.embeddingModel());
        doc.setEmbeddingDim(req.embeddingDim());
        doc.setErrorCode(null);
        doc.setErrorMessage(null);
        doc.setIndexedAt(Instant.now());
      } else {
        doc.setStatus(DocumentStatus.FAILED);
        doc.setErrorCode("VERIFICATION_MISMATCH");
        doc.setErrorMessage("Conteo de fragmentos o modelo no coincide en base de datos");
      }
    } else {
      doc.setStatus(DocumentStatus.FAILED);
      doc.setErrorCode(
          req.errorCode() != null && !req.errorCode().isBlank()
              ? truncate(req.errorCode(), 60)
              : "INGESTION_FAILED");
      doc.setErrorMessage(truncate(req.errorMessage(), 500));
    }

    boolean deleted = tempPdfStore.deleteVerified(tempPath);
    doc.setTempFileDeletionVerified(deleted);
    if (deleted) {
      doc.setTempFileDeletedAt(Instant.now());
    }
    documentRepository.save(doc);
  }

  @Transactional
  public void markFailedAndDeleteTemp(UUID documentId, String errorCode, String errorMessage) {
    documentRepository
        .findById(documentId)
        .ifPresent(
            doc -> {
              if (doc.getStatus() == DocumentStatus.PROCESSING) {
                doc.setStatus(DocumentStatus.FAILED);
                doc.setErrorCode(truncate(errorCode, 60));
                doc.setErrorMessage(truncate(errorMessage, 500));
                boolean deleted =
                    tempPdfStore.deleteVerified(
                        tempPdfStore.pathFor(doc.getTenantId(), doc.getId()));
                doc.setTempFileDeletionVerified(deleted);
                if (deleted) {
                  doc.setTempFileDeletedAt(Instant.now());
                }
                documentRepository.save(doc);
              }
            });
  }

  @Transactional
  public int expireStaleProcessingDocs(Instant cutoff) {
    var stale =
        documentRepository.findByStatusAndProcessingStartedAtBefore(
            DocumentStatus.PROCESSING, cutoff);
    for (Document doc : stale) {
      doc.setStatus(DocumentStatus.FAILED);
      doc.setErrorCode("TIMEOUT");
      doc.setErrorMessage("Tiempo de espera agotado durante la indexacion.");
      boolean deleted =
          tempPdfStore.deleteVerified(tempPdfStore.pathFor(doc.getTenantId(), doc.getId()));
      doc.setTempFileDeletionVerified(deleted);
      if (deleted) {
        doc.setTempFileDeletedAt(Instant.now());
      }
      documentRepository.save(doc);
    }
    return stale.size();
  }

  public static DocumentDetailResponse toDetail(Document d) {
    DocumentErrorInfo err =
        d.getErrorCode() != null ? new DocumentErrorInfo(d.getErrorCode(), d.getErrorMessage()) : null;
    return new DocumentDetailResponse(
        d.getId(),
        d.getTitle(),
        d.getOriginalFilename(),
        d.getStatus(),
        d.getSha256Hash(),
        d.getSizeBytes(),
        d.getPageCount(),
        d.getOcrPageCount(),
        d.getChunkCount(),
        d.getEmbeddingModel(),
        d.getEmbeddingDim(),
        new TempFileInfo(
            d.getTempFileDeletedAt() != null, d.isTempFileDeletionVerified(), d.getTempFileDeletedAt()),
        err,
        d.getProcessingStartedAt(),
        d.getIndexedAt(),
        d.getCreatedAt());
  }

  private static String deriveTitle(String titleOverride, String filename) {
    if (titleOverride != null && !titleOverride.isBlank()) {
      return truncate(titleOverride.trim(), 200);
    }
    String base = filename.replaceFirst("(?i)\\.pdf$", "").replace('_', ' ').replace('-', ' ').trim();
    return truncate(base.isEmpty() ? "Documento PDF" : base, 200);
  }

  private static String truncate(String s, int max) {
    if (s == null) {
      return null;
    }
    return s.length() <= max ? s : s.substring(0, max);
  }
}
