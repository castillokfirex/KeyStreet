package co.keystreet.common;

import co.keystreet.config.KeyStreetProperties;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import org.springframework.stereotype.Component;

@Component
public class ClientIpHasher {

  private final String salt;

  public ClientIpHasher(KeyStreetProperties props) {
    this.salt = props.getSecurity().getJwtSecret();
  }

  public String hash(String ip) {
    if (ip == null || ip.isBlank()) {
      return null;
    }
    try {
      MessageDigest md = MessageDigest.getInstance("SHA-256");
      byte[] digest = md.digest((salt + ":" + ip).getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(digest);
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }
}
