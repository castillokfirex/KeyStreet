package co.keystreet.auth;

import co.keystreet.auth.AuthService.LoginResult;
import co.keystreet.auth.dto.AuthResponse;
import co.keystreet.auth.dto.LoginRequest;
import co.keystreet.auth.dto.RegisterRequest;
import co.keystreet.auth.dto.UserSummary;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/register")
  public ResponseEntity<UserSummary> register(@Valid @RequestBody RegisterRequest req) {
    return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(req));
  }

  @PostMapping("/login")
  public ResponseEntity<AuthResponse> login(
      @Valid @RequestBody LoginRequest req, HttpServletRequest request) {
    LoginResult result = authService.login(req);
    return ResponseEntity.ok()
        .header(
            HttpHeaders.SET_COOKIE,
            authService.buildRefreshCookie(result.rawRefreshToken(), isHttps(request)).toString())
        .body(result.response());
  }

  @PostMapping("/refresh")
  public ResponseEntity<AuthResponse> refresh(
      @CookieValue(name = AuthService.REFRESH_COOKIE_NAME, required = false) String refreshCookie,
      HttpServletRequest request) {
    LoginResult result = authService.refresh(refreshCookie);
    return ResponseEntity.ok()
        .header(
            HttpHeaders.SET_COOKIE,
            authService.buildRefreshCookie(result.rawRefreshToken(), isHttps(request)).toString())
        .body(result.response());
  }

  @PostMapping("/logout")
  public ResponseEntity<Void> logout(
      @CookieValue(name = AuthService.REFRESH_COOKIE_NAME, required = false) String refreshCookie,
      HttpServletRequest request) {
    authService.logout(refreshCookie);
    return ResponseEntity.noContent()
        .header(
            HttpHeaders.SET_COOKIE,
            authService.clearRefreshCookie(isHttps(request)).toString())
        .build();
  }

  private static boolean isHttps(HttpServletRequest req) {
    return req.isSecure() || "https".equalsIgnoreCase(req.getHeader("X-Forwarded-Proto"));
  }
}
