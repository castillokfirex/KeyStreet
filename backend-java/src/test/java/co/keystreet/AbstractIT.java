package co.keystreet;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.core.WireMockConfiguration;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

@SpringBootTest
@AutoConfigureMockMvc
public abstract class AbstractIT {

  protected static final UUID TENANT_KEY_STREET =
      UUID.fromString("00000000-0000-4000-8000-000000000001");
  protected static final UUID TENANT_B =
      UUID.fromString("00000000-0000-4000-8000-000000000002");
  protected static final String INTERNAL_TOKEN = "test-internal-token-1234567890abcdef";
  protected static final String TEST_JWT_SECRET =
      "KeyStreetTestJwtSecretMustBeAtLeastSixtyFourBytesLongForHs256Security2026!";

  protected static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>(
              DockerImageName.parse("pgvector/pgvector:pg16").asCompatibleSubstituteFor("postgres"))
          .withDatabaseName("keystreet")
          .withUsername("postgres")
          .withPassword("postgres_test_pw");

  protected static final WireMockServer WIREMOCK =
      new WireMockServer(WireMockConfiguration.options().dynamicPort());

  protected static final Path TEMP_PDF_DIR;

  static {
    try {
      TEMP_PDF_DIR = Files.createTempDirectory("ks-pdf-tmp-it-");
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
    POSTGRES.start();
    WIREMOCK.start();
    initDatabase();
  }

  private static void initDatabase() {
    Path repoRoot = locateRepoRoot();
    try (Connection conn =
            DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Statement st = conn.createStatement()) {
      st.execute(
          "CREATE ROLE keystreet_app LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD 'app_test_pw';"
              + "CREATE ROLE keystreet_rag LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD 'rag_test_pw';");
      st.execute(Files.readString(repoRoot.resolve("db/schema.sql"), StandardCharsets.UTF_8));
      st.execute(Files.readString(repoRoot.resolve("db/seed.sql"), StandardCharsets.UTF_8));
      // Migraciones de datos posteriores al seed, en orden (db/migrations/V*.sql)
      try (var migrations = Files.list(repoRoot.resolve("db/migrations"))) {
        for (Path migration :
            migrations.filter(f -> f.getFileName().toString().endsWith(".sql")).sorted().toList()) {
          st.execute(Files.readString(migration, StandardCharsets.UTF_8));
        }
      }
      st.execute(
          """
          INSERT INTO tenants (id, slug, name, legal_name, whatsapp_phone)
          VALUES ('00000000-0000-4000-8000-000000000002', 'tenant-b', 'Tienda B', 'Tienda B SAS', '573111111111');
          INSERT INTO users (tenant_id, email, password_hash, full_name, role)
          VALUES ('00000000-0000-4000-8000-000000000002', 'admin@tenantb.co',
                  crypt('KeyStreet2026!', gen_salt('bf', 10)), 'Admin B', 'ADMIN_TENANT');
          INSERT INTO brands (id, tenant_id, name, slug, code)
          VALUES ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000002', 'Reebok', 'reebok', 'RBK');
          INSERT INTO products (id, tenant_id, brand_id, name, slug, model_code, silhouette, short_description, original_price_cop)
          VALUES ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000002',
                  '00000000-0000-4000-8000-000000000201', 'Reebok Classic B', 'reebok-classic-b',
                  'CLB', 'LOW', 'Producto exclusivo de tenant B', 200000);
          """);
    } catch (Exception e) {
      throw new RuntimeException("Error inicializando BD de integracion", e);
    }
  }

  private static Path locateRepoRoot() {
    Path p = Path.of("").toAbsolutePath();
    while (p != null) {
      if (Files.exists(p.resolve("db/schema.sql"))) {
        return p;
      }
      p = p.getParent();
    }
    throw new IllegalStateException("No se encontro db/schema.sql");
  }

  @DynamicPropertySource
  static void registerProps(DynamicPropertyRegistry reg) {
    reg.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    reg.add("spring.datasource.username", () -> "keystreet_app");
    reg.add("spring.datasource.password", () -> "app_test_pw");
    reg.add("keystreet.security.jwt-secret", () -> TEST_JWT_SECRET);
    reg.add("keystreet.security.internal-api-token", () -> INTERNAL_TOKEN);
    reg.add("keystreet.rag.base-url", WIREMOCK::baseUrl);
    reg.add("keystreet.pdf.tmp-dir", () -> TEMP_PDF_DIR.toString());
    reg.add("keystreet.pdf.max-mb", () -> "1");
    reg.add("keystreet.pdf.max-pages", () -> "10");
    reg.add("keystreet.pdf.janitor-fixed-delay-ms", () -> "3600000");
  }

  @Autowired protected MockMvc mockMvc;
  @Autowired protected ObjectMapper objectMapper;
  private static final java.util.concurrent.atomic.AtomicInteger IP_SEQ =
      new java.util.concurrent.atomic.AtomicInteger(10);

  @BeforeEach
  void resetWireMock() {
    WIREMOCK.resetAll();
  }

  protected String loginToken(String slug, String email, String password) throws Exception {
    String body = objectMapper.writeValueAsString(java.util.Map.of("email", email, "password", password));
    MvcResult res =
        mockMvc
            .perform(
                org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(
                        "/api/v1/auth/login")
                    .header("X-Tenant-Slug", slug)
                    .header("X-Forwarded-For", "10.10.0." + IP_SEQ.incrementAndGet())
                    .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                    .content(body))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
            .andReturn();
    return objectMapper.readTree(res.getResponse().getContentAsString()).get("accessToken").asText();
  }

  protected static void insertFakeChunksAsRag(UUID tenantId, UUID documentId, int count, String model) {
    try (Connection conn =
            DriverManager.getConnection(POSTGRES.getJdbcUrl(), "keystreet_rag", "rag_test_pw");
        Statement st = conn.createStatement()) {
      st.execute("SELECT set_config('app.tenant_id', '" + tenantId + "', false)");
      String zeroVec = "[" + String.join(",", java.util.Collections.nCopies(768, "0.036")) + "]";
      for (int i = 0; i < count; i++) {
        st.execute(
            String.format(
                "INSERT INTO document_chunks (tenant_id, document_id, chunk_order, content, token_count, page_number, page_end, section_title, embedding, embedding_model) "
                    + "VALUES ('%s', '%s', %d, 'Contenido verificado de prueba %d', 520, 1, 1, 'Seccion 1', '%s'::vector(768), '%s')",
                tenantId, documentId, i, i, zeroVec, model));
      }
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }
}
