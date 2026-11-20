package co.keystreet.documents;

import co.keystreet.documents.dto.DocumentDtos.IngestionResultRequest;
import co.keystreet.tenant.TenantContext;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/v1/documents")
public class IngestionCallbackController {

  private final DocumentService documentService;

  public IngestionCallbackController(DocumentService documentService) {
    this.documentService = documentService;
  }

  @PostMapping("/{id}/ingestion-result")
  public ResponseEntity<Void> ingestionResult(
      @PathVariable UUID id, @Valid @RequestBody IngestionResultRequest req) {
    TenantContext.set(req.tenantId());
    try {
      documentService.handleIngestionResult(id, req);
      return ResponseEntity.noContent().build();
    } finally {
      TenantContext.clear();
    }
  }
}
