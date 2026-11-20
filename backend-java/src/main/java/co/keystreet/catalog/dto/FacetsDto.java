package co.keystreet.catalog.dto;

import java.util.List;

public record FacetsDto(
    List<BrandFacet> brands,
    List<SizeFacet> sizes,
    List<String> silhouettes,
    int minPriceCop,
    int maxPriceCop,
    long discountedCount) {
  public record BrandFacet(String slug, String name, long count) {}

  public record SizeFacet(short sizeEu, long count) {}
}
