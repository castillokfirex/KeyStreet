package co.keystreet;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.encryption.AccessPermission;
import org.apache.pdfbox.pdmodel.encryption.StandardProtectionPolicy;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.interactive.action.PDActionJavaScript;

public final class PdfTestFixtures {

  private PdfTestFixtures() {}

  public static byte[] validPdf(String text) throws IOException {
    try (PDDocument doc = new PDDocument();
        ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      PDPage page = new PDPage();
      doc.addPage(page);
      try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
        cs.beginText();
        cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
        cs.newLineAtOffset(50, 700);
        cs.showText(text);
        cs.endText();
      }
      doc.save(out);
      return out.toByteArray();
    }
  }

  public static byte[] fakePdf() {
    return "Esto es texto plano renombrado como pdf".getBytes(StandardCharsets.UTF_8);
  }

  public static byte[] encryptedPdf() throws IOException {
    try (PDDocument doc = new PDDocument();
        ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      doc.addPage(new PDPage());
      AccessPermission ap = new AccessPermission();
      StandardProtectionPolicy spp = new StandardProtectionPolicy("owner", "user", ap);
      spp.setEncryptionKeyLength(128);
      doc.protect(spp);
      doc.save(out);
      return out.toByteArray();
    }
  }

  public static byte[] withJsPdf() throws IOException {
    try (PDDocument doc = new PDDocument();
        ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      doc.addPage(new PDPage());
      doc.getDocumentCatalog().setOpenAction(new PDActionJavaScript("app.alert('xss');"));
      doc.save(out);
      return out.toByteArray();
    }
  }

  public static byte[] oversizedDummyPdf(int minBytes) throws IOException {
    byte[] base = validPdf("Large PDF payload");
    if (base.length >= minBytes) {
      return base;
    }
    byte[] padded = new byte[minBytes];
    System.arraycopy(base, 0, padded, 0, base.length);
    for (int i = base.length; i < padded.length; i++) {
      padded[i] = ' ';
    }
    return padded;
  }
}
