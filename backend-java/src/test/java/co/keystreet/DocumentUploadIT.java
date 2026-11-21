package co.keystreet;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.postRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import co.keystreet.documents.TempFileJanitor;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;

class DocumentUploadIT extends AbstractIT {

  @Autowired private TempFileJanitor tempFileJanitor;

  @Test
  void pdfValidationRejectsInvalidFormatsAndOversize() throws Exception {
    String admin = loginToken("key-street", "admin@keystreet.co", "KeyStreet2026!");

    // 415: archivo de texto renombrado a .pdf
    mockMvc
        .perform(
            multipart("/api/v1/admin/documents")
                .file(new MockMultipartFile("file", "fake.pdf", "application/pdf", PdfTestFixtures.fakePdf()))
                .header("Authorization", "Bearer " + admin))
        .andExpect(status().isUnsupportedMediaType());

    // 422: PDF cifrado
    mockMvc
        .perform(
            multipart("/api/v1/admin/documents")
                .file(new MockMultipartFile("file", "enc.pdf", "application/pdf", PdfTestFixtures.encryptedPdf()))
                .header("Authorization", "Bearer " + admin))
        .andExpect(status().isUnprocessableEntity());

    // 422: PDF con JavaScript embebido
    mockMvc
        .perform(
            multipart("/api/v1/admin/documents")
                .file(new MockMultipartFile("file", "js.pdf", "application/pdf", PdfTestFixtures.withJsPdf()))
                .header("Authorization", "Bearer " + admin))
        .andExpect(status().isUnprocessableEntity());

    // 413: PDF excede max-mb=1 del perfil test
    mockMvc
        .perform(
            multipart("/api/v1/admin/documents")
                .file(
                    new MockMultipartFile(
                        "file",
                        "big.pdf",
                        "application/pdf",
                        PdfTestFixtures.oversizedDummyPdf(1_150_000)))
                .header("Authorization", "Bearer " + admin))
        .andExpect(status().isPayloadTooLarge());
  }

  @Test
  void ephemeralLifecycleDeletesTempFileAfterVerifiedCallbackAndRejectsDuplicates()
      throws Exception {
    String admin = loginToken("key-street", "admin@keystreet.co", "KeyStreet2026!");
    WIREMOCK.stubFor(
        com.github.tomakehurst.wiremock.client.WireMock.post(urlEqualTo("/internal/v1/ingest"))
            .willReturn(aResponse().withStatus(202).withBody("{\"jobId\":\"1\"}")));

    byte[] validBytes = PdfTestFixtures.validPdf("Guia de tallas Key Street " + System.nanoTime());
    MvcResult uploadRes =
        mockMvc
            .perform(
                multipart("/api/v1/admin/documents")
                    .file(new MockMultipartFile("file", "guia_tallas.pdf", "application/pdf", validBytes))
                    .param("title", "Guia Tallas IT")
                    .header("Authorization", "Bearer " + admin))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.status").value("PROCESSING"))
            .andReturn();

    UUID docId =
        UUID.fromString(
            objectMapper.readTree(uploadRes.getResponse().getContentAsString()).get("id").asText());
    Path expectedTemp = TEMP_PDF_DIR.resolve(TENANT_KEY_STREET.toString()).resolve(docId + ".pdf");
    assertThat(Files.exists(expectedTemp)).isTrue();

    // Esperar despacho @Async a WireMock
    Thread.sleep(400);
    WIREMOCK.verify(postRequestedFor(urlEqualTo("/internal/v1/ingest")));

    // Duplicado mientras esta PROCESSING o INDEXED -> 409
    mockMvc
        .perform(
            multipart("/api/v1/admin/documents")
                .file(new MockMultipartFile("file", "guia_tallas.pdf", "application/pdf", validBytes))
                .header("Authorization", "Bearer " + admin))
        .andExpect(status().isConflict());

    // Insertar chunks reales como keystreet_rag y enviar callback verificado
    insertFakeChunksAsRag(TENANT_KEY_STREET, docId, 3, "models/gemini-embedding-001");
    String cbBody =
        objectMapper.writeValueAsString(
            Map.of(
                "tenantId", TENANT_KEY_STREET,
                "status", "INDEXED",
                "chunkCount", 3,
                "pageCount", 1,
                "ocrPageCount", 0,
                "embeddingModel", "models/gemini-embedding-001",
                "embeddingDim", 768));

    mockMvc
        .perform(
            post("/internal/v1/documents/{id}/ingestion-result", docId)
                .header("X-Internal-Token", INTERNAL_TOKEN)
                .contentType(MediaType.APPLICATION_JSON)
                .content(cbBody))
        .andExpect(status().isNoContent());

    assertThat(Files.exists(expectedTemp)).isFalse();

    mockMvc
        .perform(
            get("/api/v1/admin/documents/{id}", docId)
                .header("Authorization", "Bearer " + admin))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("INDEXED"))
        .andExpect(jsonPath("$.chunkCount").value(3))
        .andExpect(jsonPath("$.tempFile.deleted").value(true))
        .andExpect(jsonPath("$.tempFile.verified").value(true));
  }

  @Test
  void mismatchedCallbackMarksFailedAndDeletesTempAndJanitorCleansOrphans() throws Exception {
    String admin = loginToken("key-street", "admin@keystreet.co", "KeyStreet2026!");
    WIREMOCK.stubFor(
        com.github.tomakehurst.wiremock.client.WireMock.post(urlEqualTo("/internal/v1/ingest"))
            .willReturn(aResponse().withStatus(202)));

    byte[] pdf2 = PdfTestFixtures.validPdf("Callback mismatch " + System.nanoTime());
    MvcResult uploadRes =
        mockMvc
            .perform(
                multipart("/api/v1/admin/documents")
                    .file(new MockMultipartFile("file", "mismatch.pdf", "application/pdf", pdf2))
                    .header("Authorization", "Bearer " + admin))
            .andExpect(status().isAccepted())
            .andReturn();
    UUID docId =
        UUID.fromString(
            objectMapper.readTree(uploadRes.getResponse().getContentAsString()).get("id").asText());
    Path temp = TEMP_PDF_DIR.resolve(TENANT_KEY_STREET.toString()).resolve(docId + ".pdf");

    // Callback dice 5 chunks pero hay 0 en BD -> VERIFICATION_MISMATCH y archivo borrado
    String badCb =
        objectMapper.writeValueAsString(
            Map.of(
                "tenantId", TENANT_KEY_STREET,
                "status", "INDEXED",
                "chunkCount", 5,
                "pageCount", 1,
                "ocrPageCount", 0,
                "embeddingModel", "models/gemini-embedding-001",
                "embeddingDim", 768));

    mockMvc
        .perform(
            post("/internal/v1/documents/{id}/ingestion-result", docId)
                .header("X-Internal-Token", INTERNAL_TOKEN)
                .contentType(MediaType.APPLICATION_JSON)
                .content(badCb))
        .andExpect(status().isNoContent());

    assertThat(Files.exists(temp)).isFalse();
    mockMvc
        .perform(
            get("/api/v1/admin/documents/{id}", docId).header("Authorization", "Bearer " + admin))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("FAILED"))
        .andExpect(jsonPath("$.error.code").value("VERIFICATION_MISMATCH"))
        .andExpect(jsonPath("$.tempFile.verified").value(true));

    // Janitor borra archivo huerfano vencido
    Path orphan = TEMP_PDF_DIR.resolve(TENANT_KEY_STREET.toString()).resolve("orphan.pdf");
    Files.createDirectories(orphan.getParent());
    Files.write(orphan, PdfTestFixtures.validPdf("orphan"));
    tempFileJanitor.sweepExpiredFiles(Instant.now().plus(1, ChronoUnit.MINUTES));
    assertThat(Files.exists(orphan)).isFalse();
  }
}
