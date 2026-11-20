package co.keystreet.catalog;

import co.keystreet.catalog.ProductSpecifications.Filter;
import co.keystreet.catalog.dto.AdminCatalogRequests.DiscountPatchRequest;
import co.keystreet.catalog.dto.AdminCatalogRequests.StockUpdateRequest;
import co.keystreet.catalog.dto.AdminCatalogRequests.TenantPatchRequest;
import co.keystreet.catalog.dto.AdminCatalogRequests.UpsertProductRequest;
import co.keystreet.catalog.dto.FacetsDto;
import co.keystreet.catalog.dto.FacetsDto.BrandFacet;
import co.keystreet.catalog.dto.FacetsDto.SizeFacet;
import co.keystreet.catalog.dto.PagedResponse;
import co.keystreet.catalog.dto.ProductDetailDto;
import co.keystreet.catalog.dto.ProductDetailDto.VariantDto;
import co.keystreet.catalog.dto.ProductSummaryDto;
import co.keystreet.catalog.dto.TenantPublicDto;
import co.keystreet.common.ApiException;
import co.keystreet.tenant.Tenant;
import co.keystreet.tenant.TenantContext;
import co.keystreet.tenant.TenantRepository;
import jakarta.persistence.EntityManager;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CatalogService {

  private final ProductRepository productRepository;
  private final BrandRepository brandRepository;
  private final ProductVariantRepository variantRepository;
  private final TenantRepository tenantRepository;
  private final JdbcTemplate jdbcTemplate;
  private final EntityManager entityManager;

  public CatalogService(
      ProductRepository productRepository,
      BrandRepository brandRepository,
      ProductVariantRepository variantRepository,
      TenantRepository tenantRepository,
      JdbcTemplate jdbcTemplate,
      EntityManager entityManager) {
    this.productRepository = productRepository;
    this.brandRepository = brandRepository;
    this.variantRepository = variantRepository;
    this.tenantRepository = tenantRepository;
    this.jdbcTemplate = jdbcTemplate;
    this.entityManager = entityManager;
  }

  @Transactional(readOnly = true)
  public TenantPublicDto getPublicTenant() {
    Tenant t =
        tenantRepository
            .findById(TenantContext.require())
            .orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "TENANT_NOT_FOUND", "Tienda no encontrada"));
    return toTenantDto(t);
  }

  @Transactional(readOnly = true)
  public PagedResponse<ProductSummaryDto> listPublic(
      String brand,
      Short size,
      Integer minPrice,
      Integer maxPrice,
      Boolean discounted,
      String silhouette,
      String tags,
      String q,
      String sortParam,
      int page,
      int pageSize) {
    UUID tid = TenantContext.require();
    int clampedSize = Math.max(1, Math.min(pageSize, 48));
    int safePage = Math.max(0, page);

    List<String> brandSlugs = splitCsv(brand);
    List<String> tagList = splitCsv(tags);
    boolean tagFilterActive = !tagList.isEmpty();
    List<UUID> tagMatchedIds =
        tagFilterActive
            ? productRepository.findIdsMatchingTags(tid, String.join(",", tagList))
            : List.of();
    List<UUID> ftsIds =
        (q != null && !q.isBlank()) ? productRepository.findIdsMatchingFts(tid, q.trim()) : List.of();

    Filter filter =
        new Filter(
            brandSlugs,
            size,
            minPrice,
            maxPrice,
            discounted,
            silhouette,
            tagMatchedIds,
            tagFilterActive,
            ftsIds,
            q,
            true);

    PageRequest pageable = PageRequest.of(safePage, clampedSize, resolveSort(sortParam));
    Page<Product> resultPage = productRepository.findAll(ProductSpecifications.withFilter(filter), pageable);

    return toPagedSummary(resultPage);
  }

  @Transactional(readOnly = true)
  public FacetsDto getFacets() {
    List<BrandFacet> brands =
        jdbcTemplate.query(
            """
            SELECT b.slug, b.name, COUNT(p.id) AS cnt
            FROM brands b
            JOIN products p ON p.brand_id = b.id AND p.tenant_id = b.tenant_id AND p.is_active = true
            GROUP BY b.slug, b.name
            ORDER BY b.name ASC
            """,
            (rs, i) -> new BrandFacet(rs.getString("slug"), rs.getString("name"), rs.getLong("cnt")));

    List<SizeFacet> sizes =
        jdbcTemplate.query(
            """
            SELECT v.size_eu, COUNT(DISTINCT v.product_id) AS cnt
            FROM product_variants v
            JOIN products p ON p.id = v.product_id AND p.tenant_id = v.tenant_id AND p.is_active = true
            WHERE v.is_active = true AND v.stock > 0
            GROUP BY v.size_eu
            ORDER BY v.size_eu ASC
            """,
            (rs, i) -> new SizeFacet(rs.getShort("size_eu"), rs.getLong("cnt")));

    List<String> silhouettes =
        jdbcTemplate.queryForList(
            "SELECT DISTINCT silhouette FROM products WHERE is_active = true ORDER BY silhouette ASC",
            String.class);

    Map<String, Object> stats =
        jdbcTemplate.queryForMap(
            """
            SELECT COALESCE(MIN(final_price_cop), 0) AS min_p,
                   COALESCE(MAX(final_price_cop), 0) AS max_p,
                   COUNT(*) FILTER (WHERE has_discount) AS disc_cnt
            FROM products WHERE is_active = true
            """);

    return new FacetsDto(
        brands,
        sizes,
        silhouettes,
        ((Number) stats.get("min_p")).intValue(),
        ((Number) stats.get("max_p")).intValue(),
        ((Number) stats.get("disc_cnt")).longValue());
  }

  @Transactional(readOnly = true)
  public ProductDetailDto getBySlug(String slug) {
    Product p =
        productRepository
            .findBySlugAndIsActiveTrue(slug)
            .orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Producto no encontrado"));
    return toDetailDto(p);
  }

  @Transactional(readOnly = true)
  public List<ProductSummaryDto> getRelated(String slug, int limit) {
    Product target =
        productRepository
            .findBySlugAndIsActiveTrue(slug)
            .orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Producto no encontrado"));
    int safeLimit = Math.max(1, Math.min(limit, 8));
    String tagsCsv = target.getStyleTags() != null ? String.join(",", target.getStyleTags()) : "";
    List<UUID> relatedIds =
        jdbcTemplate.queryForList(
            """
            SELECT p.id
            FROM products p
            WHERE p.is_active = true AND p.id <> ?
            ORDER BY
              (SELECT count(*) FROM unnest(p.style_tags) t WHERE t = ANY(string_to_array(?, ','))) DESC,
              (CASE WHEN p.brand_id = ? THEN 1 ELSE 0 END) DESC,
              p.has_discount DESC,
              p.name ASC
            LIMIT ?
            """,
            UUID.class,
            target.getId(),
            tagsCsv,
            target.getBrand().getId(),
            safeLimit);
    if (relatedIds.isEmpty()) {
      return List.of();
    }
    Map<UUID, Product> hydrated =
        productRepository.findByIdIn(relatedIds).stream()
            .collect(Collectors.toMap(Product::getId, Function.identity()));
    return relatedIds.stream()
        .map(hydrated::get)
        .filter(Objects::nonNull)
        .map(CatalogService::toSummaryDto)
        .toList();
  }

  @Transactional(readOnly = true)
  public PagedResponse<ProductSummaryDto> listAdmin(int page, int pageSize) {
    int safeSize = Math.max(1, Math.min(pageSize, 50));
    Page<Product> resultPage =
        productRepository.findAll(PageRequest.of(Math.max(0, page), safeSize, Sort.by("name").ascending()));
    return toPagedSummary(resultPage);
  }

  @Transactional
  public ProductDetailDto createAdmin(UpsertProductRequest req) {
    Brand brand =
        brandRepository
            .findById(req.brandId())
            .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "BRAND_NOT_FOUND", "Marca invalida"));

    Product p = new Product();
    p.setTenantId(TenantContext.require());
    applyUpsert(p, brand, req);
    p.setModel3dUrl("/assets/models/" + p.getSlug() + ".glb");
    p.setModel3dReady(false);
    p.setImagePlaceholderPaths(
        Map.of(
            "basePath", "/assets/products/" + p.getSlug() + "/",
            "files", List.of("01-lateral.webp", "02-medial.webp", "03-suela.webp", "04-detalle.webp", "05-on-feet.webp"),
            "aspect", "4/5",
            "ready", false));

    for (short s = 36; s <= 44; s++) {
      ProductVariant v = new ProductVariant();
      v.setTenantId(p.getTenantId());
      v.setProduct(p);
      v.setSizeEu(s);
      v.setSku("KS-" + brand.getCode() + "-" + p.getModelCode().toUpperCase() + "-" + s);
      v.setStock(5);
      v.setActive(true);
      p.getVariants().add(v);
    }

    Product saved = productRepository.saveAndFlush(p);
    entityManager.refresh(saved);
    return toDetailDto(productRepository.findWithDetailsById(saved.getId()).orElse(saved));
  }

  @Transactional
  public ProductDetailDto updateAdmin(UUID id, UpsertProductRequest req) {
    Product p =
        productRepository
            .findWithDetailsById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Producto no encontrado"));
    Brand brand =
        brandRepository
            .findById(req.brandId())
            .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "BRAND_NOT_FOUND", "Marca invalida"));
    applyUpsert(p, brand, req);
    Product saved = productRepository.saveAndFlush(p);
    entityManager.refresh(saved);
    return toDetailDto(productRepository.findWithDetailsById(saved.getId()).orElse(saved));
  }

  @Transactional
  public ProductDetailDto patchDiscount(UUID id, DiscountPatchRequest req) {
    Product p =
        productRepository
            .findWithDetailsById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Producto no encontrado"));
    p.setDiscountPercent(req.discountPercent());
    Product saved = productRepository.saveAndFlush(p);
    entityManager.refresh(saved);
    return toDetailDto(productRepository.findWithDetailsById(saved.getId()).orElse(saved));
  }

  @Transactional
  public VariantDto updateVariantStock(UUID variantId, StockUpdateRequest req) {
    ProductVariant v =
        variantRepository
            .findById(variantId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "VARIANT_NOT_FOUND", "Variante no encontrada"));
    v.setStock(req.stock());
    ProductVariant saved = variantRepository.save(v);
    return new VariantDto(
        saved.getId(), saved.getSku(), saved.getSizeEu(), saved.getStock(), saved.isActive() && saved.getStock() > 0);
  }

  @Transactional
  public TenantPublicDto patchTenant(TenantPatchRequest req) {
    Tenant t =
        tenantRepository
            .findById(TenantContext.require())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "TENANT_NOT_FOUND", "Tienda no encontrada"));
    if (req.name() != null && !req.name().isBlank()) {
      t.setName(req.name().trim());
    }
    if (req.whatsappPhone() != null) {
      t.setWhatsappPhone(req.whatsappPhone());
    }
    if (req.branding() != null) {
      Map<String, Object> merged = new LinkedHashMap<>(t.getBranding());
      merged.putAll(req.branding());
      t.setBranding(merged);
    }
    if (req.settings() != null) {
      Map<String, Object> merged = new LinkedHashMap<>(t.getSettings());
      merged.putAll(req.settings());
      t.setSettings(merged);
    }
    return toTenantDto(tenantRepository.save(t));
  }

  private PagedResponse<ProductSummaryDto> toPagedSummary(Page<Product> resultPage) {
    List<UUID> ids = resultPage.getContent().stream().map(Product::getId).toList();
    Map<UUID, Product> hydrated =
        ids.isEmpty()
            ? Map.of()
            : productRepository.findByIdIn(ids).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));
    List<ProductSummaryDto> items =
        ids.stream().map(hydrated::get).map(CatalogService::toSummaryDto).toList();
    return new PagedResponse<>(
        items,
        resultPage.getNumber(),
        resultPage.getSize(),
        resultPage.getTotalElements(),
        resultPage.getTotalPages());
  }

  private static void applyUpsert(Product p, Brand brand, UpsertProductRequest req) {
    p.setBrand(brand);
    p.setName(req.name().trim());
    p.setSlug(req.slug().trim());
    p.setModelCode(req.modelCode().trim().toUpperCase());
    p.setSilhouette(req.silhouette());
    p.setColorway(req.colorway());
    p.setShortDescription(req.shortDescription().trim());
    p.setDescription(req.description());
    p.setBadge(req.badge());
    p.setOriginalPriceCop(req.originalPriceCop());
    p.setDiscountPercent(req.discountPercent());
    if (req.materialSpecs() != null) {
      p.setMaterialSpecs(req.materialSpecs());
    }
    if (req.styleTags() != null) {
      p.setStyleTags(req.styleTags());
    }
    if (req.isActive() != null) {
      p.setActive(req.isActive());
    }
  }

  private static Sort resolveSort(String sortParam) {
    if (sortParam == null) {
      return Sort.by(Sort.Order.desc("hasDiscount"), Sort.Order.asc("name"));
    }
    return switch (sortParam) {
      case "price_asc" -> Sort.by(Sort.Order.asc("finalPriceCop"), Sort.Order.asc("name"));
      case "price_desc" -> Sort.by(Sort.Order.desc("finalPriceCop"), Sort.Order.asc("name"));
      case "discount_desc" -> Sort.by(Sort.Order.desc("discountPercent"), Sort.Order.asc("finalPriceCop"));
      case "newest" -> Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("name"));
      default -> Sort.by(Sort.Order.desc("hasDiscount"), Sort.Order.asc("name"));
    };
  }

  private static List<String> splitCsv(String csv) {
    if (csv == null || csv.isBlank()) {
      return List.of();
    }
    return Arrays.stream(csv.split(","))
        .map(String::trim)
        .filter(s -> !s.isEmpty())
        .toList();
  }

  public static ProductSummaryDto toSummaryDto(Product p) {
    List<Short> sizes =
        p.getVariants().stream()
            .filter(v -> v.isActive() && v.getStock() > 0)
            .map(ProductVariant::getSizeEu)
            .sorted()
            .toList();
    return new ProductSummaryDto(
        p.getId(),
        p.getSlug(),
        p.getName(),
        p.getBrand().getName(),
        p.getBrand().getSlug(),
        p.getModelCode(),
        p.getCategory(),
        p.getSilhouette(),
        p.getColorway(),
        p.getShortDescription(),
        p.getBadge(),
        p.getOriginalPriceCop(),
        p.getDiscountPercent(),
        p.getDiscountPriceCop(),
        p.getFinalPriceCop(),
        p.getHasDiscount(),
        p.getImagePlaceholderPaths(),
        sizes,
        p.getStyleTags(),
        p.isModel3dReady(),
        p.getModel3dUrl(),
        p.isActive());
  }

  public static ProductDetailDto toDetailDto(Product p) {
    List<VariantDto> variants =
        p.getVariants().stream()
            .sorted(Comparator.comparing(ProductVariant::getSizeEu))
            .map(
                v ->
                    new VariantDto(
                        v.getId(),
                        v.getSku(),
                        v.getSizeEu(),
                        v.getStock(),
                        v.isActive() && v.getStock() > 0))
            .toList();
    return new ProductDetailDto(
        p.getId(),
        p.getSlug(),
        p.getName(),
        p.getBrand().getName(),
        p.getBrand().getSlug(),
        p.getModelCode(),
        p.getCategory(),
        p.getSilhouette(),
        p.getColorway(),
        p.getShortDescription(),
        p.getDescription(),
        p.getBadge(),
        p.getOriginalPriceCop(),
        p.getDiscountPercent(),
        p.getDiscountPriceCop(),
        p.getFinalPriceCop(),
        p.getHasDiscount(),
        p.getModel3dUrl(),
        p.isModel3dReady(),
        p.getImagePlaceholderPaths(),
        p.getMaterialSpecs(),
        p.getStyleTags(),
        variants);
  }

  private static TenantPublicDto toTenantDto(Tenant t) {
    return new TenantPublicDto(
        t.getId(),
        t.getSlug(),
        t.getName(),
        t.getWhatsappPhone(),
        t.getCurrency(),
        t.getLocale(),
        t.getBranding(),
        t.getSettings());
  }
}
