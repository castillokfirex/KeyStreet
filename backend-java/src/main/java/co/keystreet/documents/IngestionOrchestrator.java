package co.keystreet.documents;

import co.keystreet.assistant.RagClient;
import co.keystreet.assistant.dto.AssistantDtos.RagIngestPayload;
import co.keystreet.tenant.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class IngestionOrchestrator {

  private static final Logger log = LoggerFactory.getLogger(IngestionOrchestrator.class);

  private final RagClient ragClient;
  private final DocumentService documentService;

  public IngestionOrchestrator(RagClient ragClient, DocumentService documentService) {
    this.ragClient = ragClient;
    this.documentService = documentService;
  }

  @Async("taskExecutor")
  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void onDocumentUploaded(DocumentUploadedEvent event) {
    TenantContext.set(event.tenantId());
    try {
      RagIngestPayload payload =
          new RagIngestPayload(
              event.documentId(),
              event.tenantId(),
              event.filePath(),
              event.sha256(),
              event.title());
      long[] backoffsMs = {500L, 1500L};
      Exception lastError = null;
      for (int attempt = 1; attempt <= 3; attempt++) {
        try {
          ragClient.ingest(payload);
          return;
        } catch (Exception ex) {
          lastError = ex;
          log.warn(
              "Intento {}/3 enviando doc {} a rag-service fallo: {}",
              attempt,
              event.documentId(),
              ex.getMessage());
          if (attempt <= backoffsMs.length) {
            try {
              Thread.sleep(backoffsMs[attempt - 1]);
            } catch (InterruptedException ie) {
              Thread.currentThread().interrupt();
              break;
            }
          }
        }
      }
      log.error(
          "No se pudo despachar doc {} al rag-service: {}",
          event.documentId(),
          lastError != null ? lastError.getMessage() : "unknown");
      documentService.markFailedAndDeleteTemp(
          event.documentId(),
          "RAG_UNAVAILABLE",
          "El motor RAG no respondio al iniciar la indexacion.");
    } finally {
      TenantContext.clear();
    }
  }
}
