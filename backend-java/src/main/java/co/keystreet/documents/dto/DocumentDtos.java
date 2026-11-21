package co.keystreet.documents.dto;

import co.keystreet.documents.DocumentStatus;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public final class DocumentDtos {
  private DocumentDtos() {}

  public record DocumentUploadResponse(
      UUID id,
      String title,
      DocumentStatus status,
      String sha256,
      long sizeBytes,
      Instant createdAt) {}

  public record TempFileInfo(boolean deleted, boolean verified, Instant deletedAt) {}

  public record DocumentErrorInfo(String code, String message) {}

  public record DocumentDetailResponse(
      UUID id,
      String title,
      String originalFilename,
      DocumentStatus status,
      String sha256,
      long sizeBytes,
      Integer pageCount,
      int ocrPageCount,
      int chunkCount,
      String embeddingModel,
      Short embeddingDim,
      TempFileInfo tempFile,
      DocumentErrorInfo error,
      Instant processingStartedAt,
      Instant indexedAt,
      Instant createdAt) {}

  public record IngestionResultRequest(
      @NotNull UUID tenantId,
      @NotNull DocumentStatus status,
      int chunkCount,
      Integer pageCount,
      int ocrPageCount,
      String embeddingModel,
      Short embeddingDim,
      String errorCode,
      String errorMessage) {}
}
