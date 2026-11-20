package co.keystreet.catalog.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class AdminCatalogRequests {
  private AdminCatalogRequests() {}

  public record UpsertProductRequest(
      @NotNull UUID brandId,
      @NotBlank @Size(max = 160) String name,
      @NotBlank @Pattern(regexp = "^[a-z0-9]+(-[a-z0-9]+)*$") @Size(max = 160) String slug,
      @NotBlank @Size(max = 12) String modelCode,
      @NotBlank @Pattern(regexp = "LOW|MID|HIGH") String silhouette,
      @Size(max = 80) String colorway,
      @NotBlank @Size(max = 280) String shortDescription,
      String description,
      @Size(max = 30) String badge,
      @NotNull @Min(1000) Integer originalPriceCop,
      @NotNull @Min(0) @Max(90) Short discountPercent,
      Map<String, Object> materialSpecs,
      List<String> styleTags,
      Boolean isActive) {}

  public record DiscountPatchRequest(@NotNull @Min(0) @Max(90) Short discountPercent) {}

  public record StockUpdateRequest(@NotNull @Min(0) Integer stock) {}

  public record TenantPatchRequest(
      @Size(max = 120) String name,
      @Pattern(regexp = "^[1-9][0-9]{7,14}$") String whatsappPhone,
      Map<String, Object> branding,
      Map<String, Object> settings) {}
}
