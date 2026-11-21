package co.keystreet.catalog;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.Generated;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.TenantId;
import org.hibernate.generator.EventType;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "products")
public class Product {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @TenantId
  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "brand_id", nullable = false)
  private Brand brand;

  @Column(nullable = false, length = 160)
  private String name;

  @Column(nullable = false, length = 160)
  private String slug;

  @Column(name = "model_code", nullable = false, length = 12)
  private String modelCode;

  @Column(nullable = false, length = 40)
  private String category = "SNEAKERS";

  @Column(nullable = false, length = 8)
  private String silhouette;

  @Column(length = 80)
  private String colorway;

  @Column(name = "short_description", nullable = false, length = 280)
  private String shortDescription;

  @Column(columnDefinition = "text")
  private String description;

  @Column(length = 30)
  private String badge;

  @Column(name = "original_price_cop", nullable = false)
  private Integer originalPriceCop;

  @Column(name = "discount_percent", nullable = false)
  private Short discountPercent = 0;

  @Generated(event = {EventType.INSERT, EventType.UPDATE})
  @Column(name = "discount_price_cop", insertable = false, updatable = false)
  private Integer discountPriceCop;

  @Generated(event = {EventType.INSERT, EventType.UPDATE})
  @Column(name = "final_price_cop", insertable = false, updatable = false)
  private Integer finalPriceCop;

  @Generated(event = {EventType.INSERT, EventType.UPDATE})
  @Column(name = "has_discount", insertable = false, updatable = false)
  private Boolean hasDiscount;

  @Column(name = "model_3d_url", length = 255)
  private String model3dUrl;

  @Column(name = "model_3d_ready", nullable = false)
  private boolean model3dReady = false;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "image_placeholder_paths", nullable = false, columnDefinition = "jsonb")
  private Map<String, Object> imagePlaceholderPaths = Map.of();

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "material_specs", nullable = false, columnDefinition = "jsonb")
  private Map<String, Object> materialSpecs = Map.of();

  @JdbcTypeCode(SqlTypes.ARRAY)
  @Column(name = "style_tags", nullable = false, columnDefinition = "text[]")
  private List<String> styleTags = List.of();

  @Column(name = "is_active", nullable = false)
  private boolean isActive = true;

  @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("sizeEu ASC")
  private List<ProductVariant> variants = new ArrayList<>();

  @Column(name = "created_at", insertable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", insertable = false, updatable = false)
  private Instant updatedAt;

  public UUID getId() {
    return id;
  }

  public UUID getTenantId() {
    return tenantId;
  }

  public void setTenantId(UUID tenantId) {
    this.tenantId = tenantId;
  }

  public Brand getBrand() {
    return brand;
  }

  public void setBrand(Brand brand) {
    this.brand = brand;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getSlug() {
    return slug;
  }

  public void setSlug(String slug) {
    this.slug = slug;
  }

  public String getModelCode() {
    return modelCode;
  }

  public void setModelCode(String modelCode) {
    this.modelCode = modelCode;
  }

  public String getCategory() {
    return category;
  }

  public void setCategory(String category) {
    this.category = category;
  }

  public String getSilhouette() {
    return silhouette;
  }

  public void setSilhouette(String silhouette) {
    this.silhouette = silhouette;
  }

  public String getColorway() {
    return colorway;
  }

  public void setColorway(String colorway) {
    this.colorway = colorway;
  }

  public String getShortDescription() {
    return shortDescription;
  }

  public void setShortDescription(String shortDescription) {
    this.shortDescription = shortDescription;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public String getBadge() {
    return badge;
  }

  public void setBadge(String badge) {
    this.badge = badge;
  }

  public Integer getOriginalPriceCop() {
    return originalPriceCop;
  }

  public void setOriginalPriceCop(Integer originalPriceCop) {
    this.originalPriceCop = originalPriceCop;
  }

  public Short getDiscountPercent() {
    return discountPercent;
  }

  public void setDiscountPercent(Short discountPercent) {
    this.discountPercent = discountPercent;
  }

  public Integer getDiscountPriceCop() {
    return discountPriceCop;
  }

  public Integer getFinalPriceCop() {
    return finalPriceCop;
  }

  public Boolean getHasDiscount() {
    return hasDiscount;
  }

  public String getModel3dUrl() {
    return model3dUrl;
  }

  public void setModel3dUrl(String model3dUrl) {
    this.model3dUrl = model3dUrl;
  }

  public boolean isModel3dReady() {
    return model3dReady;
  }

  public void setModel3dReady(boolean model3dReady) {
    this.model3dReady = model3dReady;
  }

  public Map<String, Object> getImagePlaceholderPaths() {
    return imagePlaceholderPaths;
  }

  public void setImagePlaceholderPaths(Map<String, Object> imagePlaceholderPaths) {
    this.imagePlaceholderPaths = imagePlaceholderPaths;
  }

  public Map<String, Object> getMaterialSpecs() {
    return materialSpecs;
  }

  public void setMaterialSpecs(Map<String, Object> materialSpecs) {
    this.materialSpecs = materialSpecs;
  }

  public List<String> getStyleTags() {
    return styleTags;
  }

  public void setStyleTags(List<String> styleTags) {
    this.styleTags = styleTags;
  }

  public boolean isActive() {
    return isActive;
  }

  public void setActive(boolean active) {
    isActive = active;
  }

  public List<ProductVariant> getVariants() {
    return variants;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
