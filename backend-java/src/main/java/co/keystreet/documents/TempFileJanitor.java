package co.keystreet.documents;

import co.keystreet.config.KeyStreetProperties;
import co.keystreet.tenant.Tenant;
import co.keystreet.tenant.TenantContext;
import co.keystreet.tenant.TenantRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class TempFileJanitor {

  private static final Logger log = LoggerFactory.getLogger(TempFileJanitor.class);

  private final TempPdfStore tempPdfStore;
  private final DocumentService documentService;
  private final TenantRepository tenantRepository;
  private final KeyStreetProperties props;

  public TempFileJanitor(
      TempPdfStore tempPdfStore,
      DocumentService documentService,
      TenantRepository tenantRepository,
      KeyStreetProperties props) {
    this.tempPdfStore = tempPdfStore;
    this.documentService = documentService;
    this.tenantRepository = tenantRepository;
    this.props = props;
  }

  @Scheduled(fixedDelayString = "${keystreet.pdf.janitor-fixed-delay-ms:300000}")
  public void sweepExpired() {
    Instant cutoff =
        Instant.now().minus(props.getPdf().getTtlMinutes(), ChronoUnit.MINUTES);
    sweepExpiredFiles(cutoff);
    sweepExpiredProcessingDocs(cutoff);
  }

  public void sweepExpiredFiles(Instant cutoff) {
    Path base = tempPdfStore.baseDir();
    if (!Files.exists(base)) {
      return;
    }
    try (Stream<Path> walk = Files.walk(base, 3)) {
      walk.filter(Files::isRegularFile)
          .forEach(
              p -> {
                try {
                  if (Files.getLastModifiedTime(p).toInstant().isBefore(cutoff)) {
                    boolean deleted = tempPdfStore.deleteVerified(p);
                    if (deleted) {
                      log.info("Janitor elimino PDF huerfano vencido: {}", p);
                    }
                  }
                } catch (IOException ex) {
                  log.warn("Janitor no pudo inspeccionar {}: {}", p, ex.getMessage());
                }
              });
    } catch (IOException ex) {
      log.warn("Janitor fallo recorriendo {}: {}", base, ex.getMessage());
    }
  }

  public void sweepExpiredProcessingDocs(Instant cutoff) {
    List<Tenant> tenants = tenantRepository.findAll();
    for (Tenant t : tenants) {
      TenantContext.set(t.getId());
      try {
        int count = documentService.expireStaleProcessingDocs(cutoff);
        if (count > 0) {
          log.warn("Janitor marco {} documento(s) vencidos como FAILED (TIMEOUT) en {}", count, t.getSlug());
        }
      } finally {
        TenantContext.clear();
      }
    }
  }
}
