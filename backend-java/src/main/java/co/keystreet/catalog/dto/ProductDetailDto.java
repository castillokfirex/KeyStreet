package co.keystreet.catalog.dto;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ProductDetailDto(
    UUID id,
    String slug,
    String name,
    String brand,
    String brandSlug,
    String modelCode,
    String category,
    String silhouette,
    String colorway,
    String shortDescription,
    String description,
    String badge,
    Integer originalPriceCop,
    Short discountPercent,
    Integer discountPriceCop,
    Integer finalPriceCop,
    Boolean hasDiscount,
    String model3dUrl,
    boolean model3dReady,
    Map<String, Object> images,
    Map<String, Object> materialSpecs,
    List<String> styleTags,
    List<VariantDto> variants) {

  public record VariantDto(UUID id, String sku, Short sizeEu, Integer stock, boolean inStock) {}
}
