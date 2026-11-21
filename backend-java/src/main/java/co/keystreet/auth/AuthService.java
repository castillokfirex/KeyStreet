package co.keystreet.auth;

import co.keystreet.auth.dto.AuthResponse;
import co.keystreet.auth.dto.LoginRequest;
import co.keystreet.auth.dto.RegisterRequest;
import co.keystreet.auth.dto.UserSummary;
import co.keystreet.common.ApiException;
import co.keystreet.config.KeyStreetProperties;
import co.keystreet.tenant.TenantContext;
import co.keystreet.user.Role;
import co.keystreet.user.User;
import co.keystreet.user.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

  public static final String REFRESH_COOKIE_NAME = "ks_rt";
  private static final SecureRandom RNG = new SecureRandom();

  private final UserRepository userRepository;
  private final RefreshTokenRepository refreshTokenRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;
  private final KeyStreetProperties props;

  public AuthService(
      UserRepository userRepository,
      RefreshTokenRepository refreshTokenRepository,
      PasswordEncoder passwordEncoder,
      JwtService jwtService,
      KeyStreetProperties props) {
    this.userRepository = userRepository;
    this.refreshTokenRepository = refreshTokenRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
    this.props = props;
  }

  public record LoginResult(AuthResponse response, String rawRefreshToken) {}

  @Transactional
  public UserSummary register(RegisterRequest req) {
    String email = req.email().trim().toLowerCase();
    if (userRepository.existsByEmailIgnoreCase(email)) {
      throw new ApiException(HttpStatus.CONFLICT, "EMAIL_EXISTS", "El correo ya esta registrado");
    }
    User user = new User();
    user.setTenantId(TenantContext.require());
    user.setEmail(email);
    user.setFullName(req.fullName().trim());
    user.setPasswordHash(passwordEncoder.encode(req.password()));
    user.setRole(Role.CUSTOMER);
    user.setActive(true);
    User saved = userRepository.save(user);
    return toSummary(saved);
  }

  @Transactional
  public LoginResult login(LoginRequest req) {
    String email = req.email().trim().toLowerCase();
    User user =
        userRepository
            .findByEmailIgnoreCase(email)
            .filter(User::isActive)
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Credenciales invalidas"));

    if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
      throw new ApiException(
          HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Credenciales invalidas");
    }

    user.setLastLoginAt(Instant.now());
    userRepository.save(user);

    String rawRefresh = issueRefreshToken(user);
    String access = jwtService.issueAccessToken(user);
    return new LoginResult(
        new AuthResponse(access, "Bearer", jwtService.accessTtlSeconds(), toSummary(user)),
        rawRefresh);
  }

  @Transactional(noRollbackFor = ApiException.class)
  public LoginResult refresh(String rawRefreshToken) {
    if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "MISSING_REFRESH", "Sesion no valida");
    }
    String hash = sha256Hex(rawRefreshToken);
    RefreshToken existing =
        refreshTokenRepository
            .findByTokenHash(hash)
            .orElseThrow(
                () -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH", "Sesion no valida"));

    Instant now = Instant.now();
    if (existing.getRevokedAt() != null) {
      // Deteccion de reutilizacion: revocar toda la familia de tokens del usuario
      refreshTokenRepository.revokeAllActiveByUserId(existing.getUserId(), now);
      throw new ApiException(
          HttpStatus.UNAUTHORIZED, "REFRESH_REUSED", "Sesion revocada por seguridad");
    }
    if (existing.getExpiresAt().isBefore(now)) {
      existing.setRevokedAt(now);
      refreshTokenRepository.save(existing);
      throw new ApiException(HttpStatus.UNAUTHORIZED, "REFRESH_EXPIRED", "Sesion expirada");
    }

    existing.setRevokedAt(now);
    refreshTokenRepository.save(existing);

    User user =
        userRepository
            .findById(existing.getUserId())
            .filter(User::isActive)
            .orElseThrow(
                () -> new ApiException(HttpStatus.UNAUTHORIZED, "USER_DISABLED", "Usuario inactivo"));

    String newRefresh = issueRefreshToken(user);
    String access = jwtService.issueAccessToken(user);
    return new LoginResult(
        new AuthResponse(access, "Bearer", jwtService.accessTtlSeconds(), toSummary(user)),
        newRefresh);
  }

  @Transactional
  public void logout(String rawRefreshToken) {
    if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
      return;
    }
    refreshTokenRepository
        .findByTokenHash(sha256Hex(rawRefreshToken))
        .ifPresent(
            rt -> {
              if (rt.getRevokedAt() == null) {
                rt.setRevokedAt(Instant.now());
                refreshTokenRepository.save(rt);
              }
            });
  }

  public ResponseCookie buildRefreshCookie(String rawToken, boolean httpsRequest) {
    return ResponseCookie.from(REFRESH_COOKIE_NAME, rawToken)
        .httpOnly(true)
        .secure(props.getSecurity().isCookieSecure() || httpsRequest)
        .sameSite("Strict")
        .path("/api/v1/auth")
        .maxAge(Duration.ofDays(props.getSecurity().getRefreshTtlDays()))
        .build();
  }

  public ResponseCookie clearRefreshCookie(boolean httpsRequest) {
    return ResponseCookie.from(REFRESH_COOKIE_NAME, "")
        .httpOnly(true)
        .secure(props.getSecurity().isCookieSecure() || httpsRequest)
        .sameSite("Strict")
        .path("/api/v1/auth")
        .maxAge(0)
        .build();
  }

  private String issueRefreshToken(User user) {
    byte[] bytes = new byte[32];
    RNG.nextBytes(bytes);
    String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

    RefreshToken rt = new RefreshToken();
    rt.setTenantId(UUID.fromString(user.getTenantId().toString()));
    rt.setUserId(user.getId());
    rt.setTokenHash(sha256Hex(raw));
    rt.setExpiresAt(Instant.now().plus(props.getSecurity().getRefreshTtlDays(), ChronoUnit.DAYS));
    refreshTokenRepository.save(rt);
    return raw;
  }

  private static UserSummary toSummary(User u) {
    return new UserSummary(u.getId(), u.getEmail(), u.getFullName(), u.getRole(), u.getTenantId());
  }

  static String sha256Hex(String value) {
    try {
      MessageDigest md = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(md.digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }
}
