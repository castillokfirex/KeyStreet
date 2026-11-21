package co.keystreet.documents;

import co.keystreet.catalog.dto.PagedResponse;
import co.keystreet.common.ApiException;
import co.keystreet.config.KeyStreetProperties;
import co.keystreet.documents.dto.DocumentDtos.DocumentDetailResponse;
import co.keystreet.documents.dto.DocumentDtos.DocumentUploadResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/admin/documents")
public class DocumentController {

  private final DocumentService documentService;
  private final KeyStreetProperties props;

  public DocumentController(DocumentService documentService, KeyStreetProperties props) {
    this.documentService = documentService;
    this.props = props;
  }

  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<DocumentUploadResponse> upload(
      @RequestPart("file") MultipartFile file,
      @RequestParam(required = false) String title,
      @AuthenticationPrincipal Jwt jwt,
      HttpServletRequest request) {
    if (props.getSecurity().isRequireHttpsUpload() && !isHttps(request)) {
      throw new ApiException(
          HttpStatus.UPGRADE_REQUIRED,
          "HTTPS_REQUIRED",
          "La carga temporal de PDF requiere una conexion HTTPS.");
    }
    UUID userId = UUID.fromString(jwt.getSubject());
    return ResponseEntity.status(HttpStatus.ACCEPTED)
        .body(documentService.upload(file, title, userId));
  }

  @GetMapping
  public PagedResponse<DocumentDetailResponse> list(
      @RequestParam(required = false) DocumentStatus status,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int pageSize) {
    return documentService.list(status, page, pageSize);
  }

  @GetMapping("/{id}")
  public DocumentDetailResponse get(@PathVariable UUID id) {
    return documentService.get(id);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id) {
    documentService.delete(id);
    return ResponseEntity.noContent().build();
  }

  private static boolean isHttps(HttpServletRequest req) {
    return req.isSecure() || "https".equalsIgnoreCase(req.getHeader("X-Forwarded-Proto"));
  }
}
