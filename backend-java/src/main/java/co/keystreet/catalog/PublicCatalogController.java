package co.keystreet.catalog;

import co.keystreet.catalog.dto.FacetsDto;
import co.keystreet.catalog.dto.PagedResponse;
import co.keystreet.catalog.dto.ProductDetailDto;
import co.keystreet.catalog.dto.ProductSummaryDto;
import co.keystreet.catalog.dto.TenantPublicDto;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public")
public class PublicCatalogController {

  private final CatalogService catalogService;

  public PublicCatalogController(CatalogService catalogService) {
    this.catalogService = catalogService;
  }

  @GetMapping("/tenant")
  public TenantPublicDto tenant() {
    return catalogService.getPublicTenant();
  }

  @GetMapping("/products")
  public PagedResponse<ProductSummaryDto> listProducts(
      @RequestParam(required = false) String brand,
      @RequestParam(required = false) Short size,
      @RequestParam(required = false) Integer minPrice,
      @RequestParam(required = false) Integer maxPrice,
      @RequestParam(required = false) Boolean discounted,
      @RequestParam(required = false) String silhouette,
      @RequestParam(required = false) String tags,
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "recommended") String sort,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "24") int pageSize) {
    return catalogService.listPublic(
        brand, size, minPrice, maxPrice, discounted, silhouette, tags, q, sort, page, pageSize);
  }

  @GetMapping("/products/facets")
  public FacetsDto facets() {
    return catalogService.getFacets();
  }

  @GetMapping("/products/{slug}")
  public ProductDetailDto detail(@PathVariable String slug) {
    return catalogService.getBySlug(slug);
  }

  @GetMapping("/products/{slug}/related")
  public List<ProductSummaryDto> related(
      @PathVariable String slug, @RequestParam(defaultValue = "4") int limit) {
    return catalogService.getRelated(slug, limit);
  }
}
