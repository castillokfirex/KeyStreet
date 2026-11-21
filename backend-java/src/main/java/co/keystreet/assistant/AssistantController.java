package co.keystreet.assistant;

import co.keystreet.assistant.dto.AssistantDtos.AssistantQueryRequest;
import co.keystreet.assistant.dto.AssistantDtos.AssistantQueryResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/assistant")
public class AssistantController {

  private final AssistantService assistantService;

  public AssistantController(AssistantService assistantService) {
    this.assistantService = assistantService;
  }

  @PostMapping("/query")
  public AssistantQueryResponse query(
      @Valid @RequestBody AssistantQueryRequest req,
      @AuthenticationPrincipal Jwt jwt,
      HttpServletRequest httpReq) {
    UUID userId = jwt != null ? UUID.fromString(jwt.getSubject()) : null;
    String channel =
        (jwt != null && "ADMIN_TENANT".equals(jwt.getClaimAsString("role")))
            ? "ADMIN"
            : "STOREFRONT";
    String ip = httpReq.getHeader("X-Forwarded-For");
    if (ip == null || ip.isBlank()) {
      ip = httpReq.getRemoteAddr();
    }
    return assistantService.ask(req, userId, channel, ip);
  }
}
