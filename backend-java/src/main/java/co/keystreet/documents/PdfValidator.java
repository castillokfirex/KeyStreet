package co.keystreet.documents;

import co.keystreet.common.ApiException;
import co.keystreet.config.KeyStreetProperties;
import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.Set;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSArray;
import org.apache.pdfbox.cos.COSBase;
import org.apache.pdfbox.cos.COSDictionary;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.cos.COSObject;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.apache.tika.Tika;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class PdfValidator {

  private static final byte[] PDF_MAGIC = "%PDF-".getBytes(StandardCharsets.US_ASCII);
  private static final Set<String> FORBIDDEN_NAMES =
      Set.of("JS", "JavaScript", "Launch", "EmbeddedFiles", "RichMedia");

  private final KeyStreetProperties props;
  private final Tika tika = new Tika();

  public PdfValidator(KeyStreetProperties props) {
    this.props = props;
  }

  public void validateMultipartMeta(MultipartFile file) {
    if (file == null || file.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "EMPTY_FILE", "El archivo PDF esta vacio");
    }
    long maxBytes = props.getPdf().getMaxMb() * 1024L * 1024L;
    if (file.getSize() > maxBytes) {
      throw new ApiException(
          HttpStatus.PAYLOAD_TOO_LARGE,
          "PAYLOAD_TOO_LARGE",
          "El PDF supera el limite de " + props.getPdf().getMaxMb() + " MB");
    }
    String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().trim();
    if (!name.toLowerCase().endsWith(".pdf")) {
      throw new ApiException(
          HttpStatus.UNSUPPORTED_MEDIA_TYPE,
          "INVALID_EXTENSION",
          "Solo se permiten archivos .pdf");
    }
    String ct = file.getContentType();
    if (ct == null || !ct.toLowerCase().startsWith("application/pdf")) {
      throw new ApiException(
          HttpStatus.UNSUPPORTED_MEDIA_TYPE,
          "INVALID_CONTENT_TYPE",
          "Content-Type debe ser application/pdf");
    }
  }

  public int validateStoredPdf(Path pdfPath) {
    try {
      byte[] head = new byte[1024];
      int read;
      try (InputStream in = Files.newInputStream(pdfPath)) {
        read = in.readNBytes(head, 0, head.length);
      }
      if (read < PDF_MAGIC.length) {
        throw new ApiException(
            HttpStatus.UNSUPPORTED_MEDIA_TYPE, "INVALID_PDF", "Archivo PDF invalido");
      }
      for (int i = 0; i < PDF_MAGIC.length; i++) {
        if (head[i] != PDF_MAGIC[i]) {
          throw new ApiException(
              HttpStatus.UNSUPPORTED_MEDIA_TYPE,
              "INVALID_PDF_MAGIC",
              "El archivo no es un PDF valido");
        }
      }
      String detected = tika.detect(pdfPath);
      if (!"application/pdf".equalsIgnoreCase(detected)) {
        throw new ApiException(
            HttpStatus.UNSUPPORTED_MEDIA_TYPE,
            "MIME_MISMATCH",
            "Tipo real detectado (" + detected + ") no corresponde a PDF");
      }

      if (props.getPdf().isClamavEnabled()) {
        scanWithClamAv(pdfPath);
      }

      try (PDDocument doc = Loader.loadPDF(pdfPath.toFile())) {
        if (doc.isEncrypted()) {
          throw new ApiException(
              HttpStatus.UNPROCESSABLE_ENTITY,
              "PDF_ENCRYPTED",
              "No se admiten PDFs cifrados o protegidos con contrasena");
        }
        int pages = doc.getNumberOfPages();
        if (pages <= 0) {
          throw new ApiException(
              HttpStatus.UNPROCESSABLE_ENTITY, "PDF_EMPTY", "El PDF no contiene paginas");
        }
        if (pages > props.getPdf().getMaxPages()) {
          throw new ApiException(
              HttpStatus.UNPROCESSABLE_ENTITY,
              "PDF_TOO_MANY_PAGES",
              "El PDF excede el limite de " + props.getPdf().getMaxPages() + " paginas");
        }
        Set<COSBase> visited = Collections.newSetFromMap(new IdentityHashMap<>());
        if (containsForbiddenContent(doc.getDocumentCatalog().getCOSObject(), visited)) {
          throw new ApiException(
              HttpStatus.UNPROCESSABLE_ENTITY,
              "PDF_ACTIVE_CONTENT",
              "El PDF contiene JavaScript, acciones o archivos embebidos no permitidos");
        }
        return pages;
      } catch (InvalidPasswordException ex) {
        throw new ApiException(
            HttpStatus.UNPROCESSABLE_ENTITY,
            "PDF_ENCRYPTED",
            "No se admiten PDFs cifrados o protegidos con contrasena");
      }
    } catch (ApiException ex) {
      throw ex;
    } catch (IOException ex) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, "PDF_CORRUPT", "No se pudo leer el archivo PDF");
    }
  }

  private boolean containsForbiddenContent(COSBase node, Set<COSBase> visited) {
    if (node == null || !visited.add(node)) {
      return false;
    }
    if (node instanceof COSObject obj) {
      return containsForbiddenContent(obj.getObject(), visited);
    }
    if (node instanceof COSDictionary dict) {
      for (var entry : dict.entrySet()) {
        COSName key = entry.getKey();
        if (FORBIDDEN_NAMES.contains(key.getName())) {
          return true;
        }
        if (COSName.S.equals(key) && entry.getValue() instanceof COSName valName) {
          if (FORBIDDEN_NAMES.contains(valName.getName())) {
            return true;
          }
        }
        if (containsForbiddenContent(entry.getValue(), visited)) {
          return true;
        }
      }
    } else if (node instanceof COSArray arr) {
      for (COSBase item : arr) {
        if (containsForbiddenContent(item, visited)) {
          return true;
        }
      }
    }
    return false;
  }

  private void scanWithClamAv(Path path) throws IOException {
    String host = props.getPdf().getClamavHost();
    int port = props.getPdf().getClamavPort();
    try (Socket socket = new Socket()) {
      socket.connect(new InetSocketAddress(host, port), 5000);
      socket.setSoTimeout(15000);
      DataOutputStream out = new DataOutputStream(socket.getOutputStream());
      out.write("zINSTREAM\0".getBytes(StandardCharsets.US_ASCII));
      byte[] buf = new byte[8192];
      try (InputStream in = Files.newInputStream(path)) {
        int n;
        while ((n = in.read(buf)) != -1) {
          out.writeInt(n);
          out.write(buf, 0, n);
        }
      }
      out.writeInt(0);
      out.flush();
      ByteArrayOutputStream resp = new ByteArrayOutputStream();
      byte[] rbuf = new byte[256];
      int r;
      while ((r = socket.getInputStream().read(rbuf)) != -1) {
        resp.write(rbuf, 0, r);
      }
      String result = resp.toString(StandardCharsets.US_ASCII);
      if (result.contains("FOUND")) {
        throw new ApiException(
            HttpStatus.UNPROCESSABLE_ENTITY,
            "PDF_MALWARE_DETECTED",
            "El archivo fue rechazado por el escaner de seguridad");
      }
    }
  }
}
