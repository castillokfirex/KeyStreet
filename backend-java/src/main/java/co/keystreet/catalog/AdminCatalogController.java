package co.keystreet.catalog;

import co.keystreet.catalog.dto.AdminCatalogRequests.DiscountPatchRequest;
import co.keystreet.catalog.dto.AdminCatalogRequests.StockUpdateRequest;
import co.keystreet.catalog.dto.AdminCatalogRequests.TenantPatchRequest;
import co.keystreet.catalog.dto.AdminCatalogRequests.UpsertProductRequest;
import co.keystreet.catalog.dto.PagedResponse;
import co.keystreet.catalog.dto.ProductDetailDto;
import co.keystreet.catalog.dto.ProductDetailDto.VariantDto;
import co.keystreet.catalog.dto.ProductSummaryDto;
import co.keystreet.catalog.dto.TenantPublicDto;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminCatalogController {

  private final CatalogService catalogService;

  public AdminCatalogController(CatalogService catalogService) {
    this.catalogService = catalogService;
  }

  @GetMapping("/products")
  public PagedResponse<ProductSummaryDto> list(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "24") int pageSize) {
    return catalogService.listAdmin(page, pageSize);
  }

  @PostMapping("/products")
  @ResponseStatus(HttpStatus.CREATED)
  public ProductDetailDto create(@Valid @RequestBody UpsertProductRequest req) {
    return catalogService.createAdmin(req);
  }

  @PutMapping("/products/{id}")
  public ProductDetailDto update(
      @PathVariable UUID id, @Valid @RequestBody UpsertProductRequest req) {
    return catalogService.updateAdmin(id, req);
  }

  @PatchMapping("/products/{id}/discount")
  public ProductDetailDto patchDiscount(
      @PathVariable UUID id, @Valid @RequestBody DiscountPatchRequest req) {
    return catalogService.patchDiscount(id, req);
  }

  @PutMapping("/variants/{id}/stock")
  public VariantDto updateStock(
      @PathVariable UUID id, @Valid @RequestBody StockUpdateRequest req) {
    return catalogService.updateVariantStock(id, req);
  }

  @PatchMapping("/tenant")
  public TenantPublicDto patchTenant(@Valid @RequestBody TenantPatchRequest req) {
    return catalogService.patchTenant(req);
  }
}
