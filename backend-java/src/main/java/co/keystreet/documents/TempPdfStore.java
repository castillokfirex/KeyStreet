package co.keystreet.documents;

import co.keystreet.config.KeyStreetProperties;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class TempPdfStore {

  private static final Logger log = LoggerFactory.getLogger(TempPdfStore.class);
  private static final boolean POSIX =
      FileSystems.getDefault().supportedFileAttributeViews().contains("posix");

  private final Path baseDir;

  public TempPdfStore(KeyStreetProperties props) {
    this.baseDir = Path.of(props.getPdf().getTmpDir()).toAbsolutePath().normalize();
  }

  public record StoredTempPdf(Path path, String sha256Hex, long sizeBytes) {}

  public Path baseDir() {
    return baseDir;
  }

  public Path pathFor(UUID tenantId, UUID documentId) {
    return baseDir.resolve(tenantId.toString()).resolve(documentId + ".pdf");
  }

  public StoredTempPdf saveStreaming(UUID tenantId, UUID documentId, InputStream source)
      throws IOException {
    Path tenantDir = baseDir.resolve(tenantId.toString());
    Files.createDirectories(tenantDir);
    Path target = pathFor(tenantId, documentId);

    MessageDigest md;
    try {
      md = MessageDigest.getInstance("SHA-256");
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }

    long total = 0;
    try (DigestInputStream dis = new DigestInputStream(source, md);
        OutputStream out = Files.newOutputStream(target)) {
      byte[] buf = new byte[16384];
      int n;
      while ((n = dis.read(buf)) != -1) {
        out.write(buf, 0, n);
        total += n;
      }
    }

    if (POSIX) {
      try {
        Files.setPosixFilePermissions(target, PosixFilePermissions.fromString("rw-r-----"));
      } catch (IOException e) {
        log.debug("No se pudieron ajustar permisos POSIX en {}: {}", target, e.getMessage());
      }
    }

    return new StoredTempPdf(target, HexFormat.of().formatHex(md.digest()), total);
  }

  public boolean deleteVerified(Path path) {
    if (path == null) {
      return true;
    }
    for (int attempt = 1; attempt <= 2; attempt++) {
      try {
        Files.deleteIfExists(path);
        if (Files.notExists(path)) {
          return true;
        }
        Thread.sleep(50);
      } catch (InterruptedException ie) {
        Thread.currentThread().interrupt();
        break;
      } catch (IOException ex) {
        log.warn("Intento {} de borrar {} fallo: {}", attempt, path, ex.getMessage());
      }
    }
    boolean gone = Files.notExists(path);
    if (!gone) {
      log.error("ALERTA: no se pudo eliminar el PDF temporal {}", path);
    }
    return gone;
  }
}
