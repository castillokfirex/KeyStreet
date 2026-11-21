package co.keystreet;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.matchingJsonPath;
import static com.github.tomakehurst.wiremock.client.WireMock.postRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class AssistantIT extends AbstractIT {

  @Test
  void assistantAlwaysEnforcesServerResolvedTenantId() throws Exception {
    WIREMOCK.stubFor(
        com.github.tomakehurst.wiremock.client.WireMock.post(urlEqualTo("/internal/v1/query"))
            .willReturn(
                aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody(
                        """
                        {
                          "status": "ANSWERED",
                          "answer": "Horma fiel a la talla [1].",
                          "citations": [],
                          "auditId": "00000000-0000-4000-8000-000000000999",
                          "latencyMs": 120
                        }
                        """)));

    String reqBody =
        objectMapper.writeValueAsString(
            Map.of(
                "question", "¿Cómo talla el Air Force 1?",
                "productSlug", "nike-air-force-1-low-07-blanco",
                "tenantId", TENANT_B.toString()));

    mockMvc
        .perform(
            post("/api/v1/assistant/query")
                .header("X-Tenant-Slug", "key-street")
                .contentType(MediaType.APPLICATION_JSON)
                .content(reqBody))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("ANSWERED"));

    WIREMOCK.verify(
        postRequestedFor(urlEqualTo("/internal/v1/query"))
            .withRequestBody(matchingJsonPath("$.tenantId", com.github.tomakehurst.wiremock.client.WireMock.equalTo(TENANT_KEY_STREET.toString()))));
  }
}
