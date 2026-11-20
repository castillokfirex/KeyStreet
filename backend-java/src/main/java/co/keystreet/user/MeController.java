package co.keystreet.user;

import co.keystreet.auth.dto.UserSummary;
import co.keystreet.common.ApiException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
public class MeController {

  private final UserRepository userRepository;

  public MeController(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  @GetMapping
  @Transactional(readOnly = true)
  public UserSummary me(@AuthenticationPrincipal Jwt jwt) {
    UUID userId = UUID.fromString(jwt.getSubject());
    User u =
        userRepository
            .findById(userId)
            .orElseThrow(
                () -> new ApiException(HttpStatus.UNAUTHORIZED, "USER_NOT_FOUND", "Usuario invalido"));
    return new UserSummary(u.getId(), u.getEmail(), u.getFullName(), u.getRole(), u.getTenantId());
  }
}
