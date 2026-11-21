package co.keystreet.orders;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.TenantId;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "whatsapp_order_intents")
public class WhatsappOrderIntent {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @TenantId
  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "user_id")
  private UUID userId;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false, columnDefinition = "jsonb")
  private List<Map<String, Object>> items;

  @Column(name = "total_cop", nullable = false)
  private Integer totalCop;

  @Column(nullable = false, columnDefinition = "text")
  private String message;

  @Column(name = "created_at", insertable = false, updatable = false)
  private Instant createdAt;

  public UUID getId() {
    return id;
  }

  public UUID getTenantId() {
    return tenantId;
  }

  public void setTenantId(UUID tenantId) {
    this.tenantId = tenantId;
  }

  public UUID getUserId() {
    return userId;
  }

  public void setUserId(UUID userId) {
    this.userId = userId;
  }

  public List<Map<String, Object>> getItems() {
    return items;
  }

  public void setItems(List<Map<String, Object>> items) {
    this.items = items;
  }

  public Integer getTotalCop() {
    return totalCop;
  }

  public void setTotalCop(Integer totalCop) {
    this.totalCop = totalCop;
  }

  public String getMessage() {
    return message;
  }

  public void setMessage(String message) {
    this.message = message;
  }
}
