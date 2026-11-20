package co.keystreet.config;

import jakarta.annotation.PostConstruct;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "keystreet")
public class KeyStreetProperties {

  @NotBlank
  private String defaultTenantSlug = "key-street";

  @NotBlank
  private String whatsappPhone = "573000000000";

  @Valid
  private Security security = new Security();

  @Valid
  private Rag rag = new Rag();

  @Valid
  private Pdf pdf = new Pdf();

  @PostConstruct
  void validateSecrets() {
    if (security.jwtSecret == null
        || security.jwtSecret.getBytes(StandardCharsets.UTF_8).length < 64) {
      throw new IllegalStateException(
          "JWT_SECRET debe tener al menos 64 bytes UTF-8 para HS256 seguro.");
    }
    if (security.internalApiToken == null || security.internalApiToken.isBlank()) {
      throw new IllegalStateException("INTERNAL_API_TOKEN es obligatorio.");
    }
  }

  public String getDefaultTenantSlug() {
    return defaultTenantSlug;
  }

  public void setDefaultTenantSlug(String defaultTenantSlug) {
    this.defaultTenantSlug = defaultTenantSlug;
  }

  public String getWhatsappPhone() {
    return whatsappPhone;
  }

  public void setWhatsappPhone(String whatsappPhone) {
    this.whatsappPhone = whatsappPhone;
  }

  public Security getSecurity() {
    return security;
  }

  public void setSecurity(Security security) {
    this.security = security;
  }

  public Rag getRag() {
    return rag;
  }

  public void setRag(Rag rag) {
    this.rag = rag;
  }

  public Pdf getPdf() {
    return pdf;
  }

  public void setPdf(Pdf pdf) {
    this.pdf = pdf;
  }

  public static class Security {
    @NotBlank
    private String jwtSecret;
    @NotBlank
    private String jwtIssuer = "keystreet";
    @Min(1)
    private int accessTtlMinutes = 15;
    @Min(1)
    private int refreshTtlDays = 7;
    @NotBlank
    private String internalApiToken;
    private List<String> corsAllowedOrigins = List.of("https://localhost");
    private boolean cookieSecure = false;
    private boolean requireHttpsUpload = false;
    private boolean rateLimitEnabled = true;

    public String getJwtSecret() {
      return jwtSecret;
    }

    public void setJwtSecret(String jwtSecret) {
      this.jwtSecret = jwtSecret;
    }

    public String getJwtIssuer() {
      return jwtIssuer;
    }

    public void setJwtIssuer(String jwtIssuer) {
      this.jwtIssuer = jwtIssuer;
    }

    public int getAccessTtlMinutes() {
      return accessTtlMinutes;
    }

    public void setAccessTtlMinutes(int accessTtlMinutes) {
      this.accessTtlMinutes = accessTtlMinutes;
    }

    public int getRefreshTtlDays() {
      return refreshTtlDays;
    }

    public void setRefreshTtlDays(int refreshTtlDays) {
      this.refreshTtlDays = refreshTtlDays;
    }

    public String getInternalApiToken() {
      return internalApiToken;
    }

    public void setInternalApiToken(String internalApiToken) {
      this.internalApiToken = internalApiToken;
    }

    public List<String> getCorsAllowedOrigins() {
      return corsAllowedOrigins;
    }

    public void setCorsAllowedOrigins(List<String> corsAllowedOrigins) {
      this.corsAllowedOrigins = corsAllowedOrigins;
    }

    public boolean isCookieSecure() {
      return cookieSecure;
    }

    public void setCookieSecure(boolean cookieSecure) {
      this.cookieSecure = cookieSecure;
    }

    public boolean isRequireHttpsUpload() {
      return requireHttpsUpload;
    }

    public void setRequireHttpsUpload(boolean requireHttpsUpload) {
      this.requireHttpsUpload = requireHttpsUpload;
    }

    public boolean isRateLimitEnabled() {
      return rateLimitEnabled;
    }

    public void setRateLimitEnabled(boolean rateLimitEnabled) {
      this.rateLimitEnabled = rateLimitEnabled;
    }
  }

  public static class Rag {
    @NotBlank
    private String baseUrl = "http://localhost:8000";
    @Min(1)
    private int timeoutSeconds = 30;

    public String getBaseUrl() {
      return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
      this.baseUrl = baseUrl;
    }

    public int getTimeoutSeconds() {
      return timeoutSeconds;
    }

    public void setTimeoutSeconds(int timeoutSeconds) {
      this.timeoutSeconds = timeoutSeconds;
    }
  }

  public static class Pdf {
    @NotBlank
    private String tmpDir = "/var/keystreet/pdf-tmp";
    @Min(1)
    private int maxMb = 20;
    @Min(1)
    private int maxPages = 300;
    @Min(1)
    private int ttlMinutes = 30;
    @Min(1000)
    private long janitorFixedDelayMs = 300_000L;
    private boolean clamavEnabled = false;
    private String clamavHost = "clamav";
    private int clamavPort = 3310;

    public String getTmpDir() {
      return tmpDir;
    }

    public void setTmpDir(String tmpDir) {
      this.tmpDir = tmpDir;
    }

    public int getMaxMb() {
      return maxMb;
    }

    public void setMaxMb(int maxMb) {
      this.maxMb = maxMb;
    }

    public int getMaxPages() {
      return maxPages;
    }

    public void setMaxPages(int maxPages) {
      this.maxPages = maxPages;
    }

    public int getTtlMinutes() {
      return ttlMinutes;
    }

    public void setTtlMinutes(int ttlMinutes) {
      this.ttlMinutes = ttlMinutes;
    }

    public long getJanitorFixedDelayMs() {
      return janitorFixedDelayMs;
    }

    public void setJanitorFixedDelayMs(long janitorFixedDelayMs) {
      this.janitorFixedDelayMs = janitorFixedDelayMs;
    }

    public boolean isClamavEnabled() {
      return clamavEnabled;
    }

    public void setClamavEnabled(boolean clamavEnabled) {
      this.clamavEnabled = clamavEnabled;
    }

    public String getClamavHost() {
      return clamavHost;
    }

    public void setClamavHost(String clamavHost) {
      this.clamavHost = clamavHost;
    }

    public int getClamavPort() {
      return clamavPort;
    }

    public void setClamavPort(int clamavPort) {
      this.clamavPort = clamavPort;
    }
  }
}
