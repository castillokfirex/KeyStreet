package co.keystreet.documents;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.TenantId;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "documents")
public class Document {

  @Id
  private UUID id;

  @TenantId
  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "uploaded_by")
  private UUID uploadedBy;

  @Column(nullable = false, length = 200)
  private String title;

  @Column(name = "original_filename", nullable = false, length = 255)
  private String originalFilename;

  @Column(name = "mime_type", nullable = false, length = 50)
  private String mimeType = "application/pdf";

  @Column(name = "size_bytes", nullable = false)
  private long sizeBytes;

  @JdbcTypeCode(SqlTypes.CHAR)
  @Column(name = "sha256_hash", nullable = false, length = 64)
  private String sha256Hash;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 12)
  private DocumentStatus status = DocumentStatus.PROCESSING;

  @Column(name = "page_count")
  private Integer pageCount;

  @Column(name = "ocr_page_count", nullable = false)
  private int ocrPageCount = 0;

  @Column(name = "chunk_count", nullable = false)
  private int chunkCount = 0;

  @Column(name = "embedding_model", length = 80)
  private String embeddingModel;

  @Column(name = "embedding_dim")
  private Short embeddingDim;

  @Column(name = "error_code", length = 60)
  private String errorCode;

  @Column(name = "error_message", length = 500)
  private String errorMessage;

  @Column(name = "temp_file_deleted_at")
  private Instant tempFileDeletedAt;

  @Column(name = "temp_file_deletion_verified", nullable = false)
  private boolean tempFileDeletionVerified = false;

  @Column(name = "processing_started_at", nullable = false)
  private Instant processingStartedAt = Instant.now();

  @Column(name = "indexed_at")
  private Instant indexedAt;

  @Column(name = "created_at", insertable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", insertable = false, updatable = false)
  private Instant updatedAt;

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public UUID getTenantId() {
    return tenantId;
  }

  public void setTenantId(UUID tenantId) {
    this.tenantId = tenantId;
  }

  public UUID getUploadedBy() {
    return uploadedBy;
  }

  public void setUploadedBy(UUID uploadedBy) {
    this.uploadedBy = uploadedBy;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getOriginalFilename() {
    return originalFilename;
  }

  public void setOriginalFilename(String originalFilename) {
    this.originalFilename = originalFilename;
  }

  public String getMimeType() {
    return mimeType;
  }

  public void setMimeType(String mimeType) {
    this.mimeType = mimeType;
  }

  public long getSizeBytes() {
    return sizeBytes;
  }

  public void setSizeBytes(long sizeBytes) {
    this.sizeBytes = sizeBytes;
  }

  public String getSha256Hash() {
    return sha256Hash;
  }

  public void setSha256Hash(String sha256Hash) {
    this.sha256Hash = sha256Hash;
  }

  public DocumentStatus getStatus() {
    return status;
  }

  public void setStatus(DocumentStatus status) {
    this.status = status;
  }

  public Integer getPageCount() {
    return pageCount;
  }

  public void setPageCount(Integer pageCount) {
    this.pageCount = pageCount;
  }

  public int getOcrPageCount() {
    return ocrPageCount;
  }

  public void setOcrPageCount(int ocrPageCount) {
    this.ocrPageCount = ocrPageCount;
  }

  public int getChunkCount() {
    return chunkCount;
  }

  public void setChunkCount(int chunkCount) {
    this.chunkCount = chunkCount;
  }

  public String getEmbeddingModel() {
    return embeddingModel;
  }

  public void setEmbeddingModel(String embeddingModel) {
    this.embeddingModel = embeddingModel;
  }

  public Short getEmbeddingDim() {
    return embeddingDim;
  }

  public void setEmbeddingDim(Short embeddingDim) {
    this.embeddingDim = embeddingDim;
  }

  public String getErrorCode() {
    return errorCode;
  }

  public void setErrorCode(String errorCode) {
    this.errorCode = errorCode;
  }

  public String getErrorMessage() {
    return errorMessage;
  }

  public void setErrorMessage(String errorMessage) {
    this.errorMessage = errorMessage;
  }

  public Instant getTempFileDeletedAt() {
    return tempFileDeletedAt;
  }

  public void setTempFileDeletedAt(Instant tempFileDeletedAt) {
    this.tempFileDeletedAt = tempFileDeletedAt;
  }

  public boolean isTempFileDeletionVerified() {
    return tempFileDeletionVerified;
  }

  public void setTempFileDeletionVerified(boolean tempFileDeletionVerified) {
    this.tempFileDeletionVerified = tempFileDeletionVerified;
  }

  public Instant getProcessingStartedAt() {
    return processingStartedAt;
  }

  public void setProcessingStartedAt(Instant processingStartedAt) {
    this.processingStartedAt = processingStartedAt;
  }

  public Instant getIndexedAt() {
    return indexedAt;
  }

  public void setIndexedAt(Instant indexedAt) {
    this.indexedAt = indexedAt;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
