package co.keystreet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

class CatalogIT extends AbstractIT {

  @Test
  void catalogReturns10ProductsAnd4DiscountedSortedByPrice() throws Exception {
    mockMvc
        .perform(get("/api/v1/public/products").header("X-Tenant-Slug", "key-street"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalItems").value(10));

    mockMvc
        .perform(
            get("/api/v1/public/products?discounted=true&sort=price_asc")
                .header("X-Tenant-Slug", "key-street"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalItems").value(4))
        .andExpect(jsonPath("$.items[0].slug").value("converse-chuck-taylor-all-star-clasico"))
        .andExpect(jsonPath("$.items[0].finalPriceCop").value(144500));

    // Filtro por talla 44 y FTS sin tilde ("clasico")
    mockMvc
        .perform(
            get("/api/v1/public/products?size=44&q=clasico")
                .header("X-Tenant-Slug", "key-street"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalItems").isNumber());

    mockMvc
        .perform(get("/api/v1/public/products/facets").header("X-Tenant-Slug", "key-street"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.discountedCount").value(4))
        .andExpect(jsonPath("$.brands.length()").value(5));
  }

  @Test
  void whatsappIntentComputesCanonicalServerPriceAndMessage() throws Exception {
    MvcResult detailRes =
        mockMvc
            .perform(
                get("/api/v1/public/products/nike-air-force-1-low-07-blanco")
                    .header("X-Tenant-Slug", "key-street"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.finalPriceCop").value(166500))
            .andReturn();

    JsonNode detail = objectMapper.readTree(detailRes.getResponse().getContentAsString());
    String variant41Id = null;
    for (JsonNode v : detail.get("variants")) {
      if (v.get("sizeEu").asInt() == 41) {
        variant41Id = v.get("id").asText();
        break;
      }
    }
    assertThat(variant41Id).isNotBlank();

    String reqBody =
        objectMapper.writeValueAsString(
            Map.of("items", List.of(Map.of("variantId", variant41Id, "quantity", 1))));

    MvcResult waRes =
        mockMvc
            .perform(
                post("/api/v1/public/orders/whatsapp-intent")
                    .header("X-Tenant-Slug", "key-street")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(reqBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalCop").value(166500))
            .andReturn();

    JsonNode wa = objectMapper.readTree(waRes.getResponse().getContentAsString());
    String msg = wa.get("message").asText();
    assertThat(msg)
        .contains("Nike Air Force 1 Low '07 (Blanco)")
        .contains("Talla 41")
        .contains("KS-NIK-AF1-41")
        .contains("$166.500 COP");
    assertThat(wa.get("whatsappUrl").asText()).startsWith("https://wa.me/573000000000?text=");
  }
}
