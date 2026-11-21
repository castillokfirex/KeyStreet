package co.keystreet.auth;

import co.keystreet.config.KeyStreetProperties;
import co.keystreet.user.User;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.context.annotation.Bean;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

  private final KeyStreetProperties props;
  private final SecretKey secretKey;
  private final JwtEncoder encoder;

  public JwtService(KeyStreetProperties props) {
    this.props = props;
    byte[] keyBytes = props.getSecurity().getJwtSecret().getBytes(StandardCharsets.UTF_8);
    this.secretKey = new SecretKeySpec(keyBytes, "HmacSHA256");
    this.encoder = new NimbusJwtEncoder(new ImmutableSecret<>(this.secretKey));
  }

  public String issueAccessToken(User user) {
    Instant now = Instant.now();
    long ttlMinutes = props.getSecurity().getAccessTtlMinutes();
    JwtClaimsSet claims =
        JwtClaimsSet.builder()
            .issuer(props.getSecurity().getJwtIssuer())
            .subject(user.getId().toString())
            .issuedAt(now)
            .expiresAt(now.plus(ttlMinutes, ChronoUnit.MINUTES))
            .id(UUID.randomUUID().toString())
            .claim("tid", user.getTenantId().toString())
            .claim("role", user.getRole().name())
            .build();
    JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
    return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
  }

  public long accessTtlSeconds() {
    return props.getSecurity().getAccessTtlMinutes() * 60L;
  }

  @Bean
  public JwtDecoder jwtDecoder() {
    return NimbusJwtDecoder.withSecretKey(secretKey).macAlgorithm(MacAlgorithm.HS256).build();
  }

  @Bean
  public JwtAuthenticationConverter jwtAuthenticationConverter() {
    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(
        jwt -> {
          String role = jwt.getClaimAsString("role");
          if (role == null || role.isBlank()) {
            return List.of();
          }
          return List.of(new SimpleGrantedAuthority("ROLE_" + role));
        });
    return converter;
  }
}
