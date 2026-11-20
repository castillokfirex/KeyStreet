package co.keystreet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

class AuthIT extends AbstractIT {

  @Test
  void loginAdminAndCustomerAuthorizationRules() throws Exception {
    // Anonimo en admin -> 401
    mockMvc
        .perform(get("/api/v1/admin/documents").header("X-Tenant-Slug", "key-street"))
        .andExpect(status().isUnauthorized());

    // Customer -> 403 en admin, 200 en /me
    String customerToken = loginToken("key-street", "cliente@keystreet.co", "KeyStreet2026!");
    mockMvc
        .perform(
            get("/api/v1/admin/documents")
                .header("Authorization", "Bearer " + customerToken)
                .header("X-Tenant-Slug", "key-street"))
        .andExpect(status().isForbidden());

    mockMvc
        .perform(get("/api/v1/me").header("Authorization", "Bearer " + customerToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.role").value("CUSTOMER"));

    // Admin -> 200
    String adminToken = loginToken("key-street", "admin@keystreet.co", "KeyStreet2026!");
    mockMvc
        .perform(
            get("/api/v1/admin/documents").header("Authorization", "Bearer " + adminToken))
        .andExpect(status().isOk());
  }

  @Test
  void refreshRotationAndReuseDetectionRevokesFamily() throws Exception {
    String email = "rotacion" + System.nanoTime() + "@keystreet.co";
    String regBody =
        objectMapper.writeValueAsString(
            Map.of("email", email, "password", "ClaveSegura2026!", "fullName", "Test User"));
    mockMvc
        .perform(
            post("/api/v1/auth/register")
                .header("X-Tenant-Slug", "key-street")
                .contentType(MediaType.APPLICATION_JSON)
                .content(regBody))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.role").value("CUSTOMER"));

    String loginBody =
        objectMapper.writeValueAsString(Map.of("email", email, "password", "ClaveSegura2026!"));
    MvcResult loginRes =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .header("X-Tenant-Slug", "key-street")
                    .header("X-Forwarded-For", "10.20.0.1")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(loginBody))
            .andExpect(status().isOk())
            .andReturn();

    Cookie rt1 = loginRes.getResponse().getCookie("ks_rt");
    assertThat(rt1).isNotNull();

    // Primer refresh: rota rt1 -> rt2
    MvcResult ref1 =
        mockMvc
            .perform(
                post("/api/v1/auth/refresh")
                    .header("X-Tenant-Slug", "key-street")
                    .cookie(rt1))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").isNotEmpty())
            .andReturn();
    Cookie rt2 = ref1.getResponse().getCookie("ks_rt");
    assertThat(rt2).isNotNull();
    assertThat(rt2.getValue()).isNotEqualTo(rt1.getValue());

    // Reutilizar rt1 revocado -> 401 y revoca toda la familia (incluido rt2)
    mockMvc
        .perform(
            post("/api/v1/auth/refresh").header("X-Tenant-Slug", "key-street").cookie(rt1))
        .andExpect(status().isUnauthorized());

    mockMvc
        .perform(
            post("/api/v1/auth/refresh").header("X-Tenant-Slug", "key-street").cookie(rt2))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void loginRateLimitReturns429AfterFiveAttemptsFromSameIp() throws Exception {
    String badBody =
        objectMapper.writeValueAsString(
            Map.of("email", "admin@keystreet.co", "password", "wrong-password"));
    for (int i = 0; i < 5; i++) {
      mockMvc
          .perform(
              post("/api/v1/auth/login")
                  .header("X-Tenant-Slug", "key-street")
                  .header("X-Forwarded-For", "198.51.100.42")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(badBody))
          .andExpect(status().isUnauthorized());
    }
    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .header("X-Tenant-Slug", "key-street")
                .header("X-Forwarded-For", "198.51.100.42")
                .contentType(MediaType.APPLICATION_JSON)
                .content(badBody))
        .andExpect(status().isTooManyRequests());
  }
}
