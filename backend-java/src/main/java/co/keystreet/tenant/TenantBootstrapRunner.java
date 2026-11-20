package co.keystreet.tenant;

import co.keystreet.config.KeyStreetProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class TenantBootstrapRunner implements ApplicationRunner {

  private static final Logger log = LoggerFactory.getLogger(TenantBootstrapRunner.class);

  private final TenantRepository tenantRepository;
  private final KeyStreetProperties props;

  public TenantBootstrapRunner(TenantRepository tenantRepository, KeyStreetProperties props) {
    this.tenantRepository = tenantRepository;
    this.props = props;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    String phone = props.getWhatsappPhone();
    if (phone == null || !phone.matches("^[1-9][0-9]{7,14}$")) {
      log.warn("WHATSAPP_PHONE invalido ({}); no se actualiza el tenant por defecto", phone);
      return;
    }
    tenantRepository
        .findBySlug(props.getDefaultTenantSlug())
        .ifPresent(
            tenant -> {
              if (!phone.equals(tenant.getWhatsappPhone())) {
                tenant.setWhatsappPhone(phone);
                tenantRepository.save(tenant);
                log.info("Sincronizado whatsapp_phone del tenant {}", tenant.getSlug());
              }
            });
  }
}
