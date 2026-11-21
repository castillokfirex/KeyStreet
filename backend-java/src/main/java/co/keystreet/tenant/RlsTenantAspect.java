package co.keystreet.tenant;

import java.util.UUID;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Aspect
@Component
@Order(200)
public class RlsTenantAspect {

  private final JdbcTemplate jdbcTemplate;

  public RlsTenantAspect(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @Before(
      "@within(org.springframework.transaction.annotation.Transactional) || "
          + "@annotation(org.springframework.transaction.annotation.Transactional)")
  public void bindTenantToTransaction() {
    UUID tid = TenantContext.get();
    String val = (tid == null || TenantContext.UNSET_SENTINEL.equals(tid)) ? "" : tid.toString();
    jdbcTemplate.queryForObject("SELECT set_config('app.tenant_id', ?, true)", String.class, val);
  }
}
