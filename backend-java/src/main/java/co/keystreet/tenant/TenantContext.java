package co.keystreet.tenant;

import java.util.UUID;

public final class TenantContext {

  public static final UUID UNSET_SENTINEL = new UUID(0L, 0L);
  private static final ThreadLocal<UUID> CURRENT = new ThreadLocal<>();

  private TenantContext() {}

  public static void set(UUID tenantId) {
    if (tenantId == null) {
      CURRENT.remove();
    } else {
      CURRENT.set(tenantId);
    }
  }

  public static UUID get() {
    return CURRENT.get();
  }

  public static UUID require() {
    UUID id = CURRENT.get();
    if (id == null) {
      throw new IllegalStateException("TenantContext no establecido");
    }
    return id;
  }

  public static void clear() {
    CURRENT.remove();
  }
}
