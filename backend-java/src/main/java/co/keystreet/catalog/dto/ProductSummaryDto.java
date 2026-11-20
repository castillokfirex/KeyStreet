package co.keystreet.catalog.dto;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ProductSummaryDto(
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
    String badge,
    Integer originalPriceCop,
    Short discountPercent,
    Integer discountPriceCop,
    Integer finalPriceCop,
    Boolean hasDiscount,
    Map<String, Object> images,
    List<Short> availableSizes,
    List<String> styleTags,
    boolean model3dReady,
    String model3dUrl,
    boolean isActive) {}
