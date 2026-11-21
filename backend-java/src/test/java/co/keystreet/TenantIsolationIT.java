package co.keystreet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import co.keystreet.catalog.ProductRepository;
import co.keystreet.tenant.TenantContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.support.TransactionTemplate;

class TenantIsolationIT extends AbstractIT {

  @Autowired private ProductRepository productRepository;
  @Autowired private TransactionTemplate txTemplate;

  @Test
  void publicListingWithTenantBOnlySeesTenantBProducts() throws Exception {
    mockMvc
        .perform(get("/api/v1/public/products").header("X-Tenant-Slug", "tenant-b"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalItems").value(1))
        .andExpect(jsonPath("$.items[0].slug").value("reebok-classic-b"));
  }

  @Test
  void tokenFromTenantBCannotReadKeyStreetCatalogOrSpoofSlug() throws Exception {
    String tokenB = loginToken("tenant-b", "admin@tenantb.co", "KeyStreet2026!");

    // Producto de Key Street es invisible para tenant-b (404)
    mockMvc
        .perform(
            get("/api/v1/public/products/nike-air-force-1-low-07-blanco")
                .header("Authorization", "Bearer " + tokenB))
        .andExpect(status().isNotFound());

    // Intentar suplantar X-Tenant-Slug distinto al JWT debe dar 403
    mockMvc
        .perform(
            get("/api/v1/admin/products")
                .header("Authorization", "Bearer " + tokenB)
                .header("X-Tenant-Slug", "key-street"))
        .andExpect(status().isForbidden());
  }

  @Test
  void repositoryWithoutTenantContextReturnsZeroRowsDueToRls() {
    TenantContext.clear();
    Long count = txTemplate.execute(status -> productRepository.count());
    assertThat(count).isZero();
  }
}
