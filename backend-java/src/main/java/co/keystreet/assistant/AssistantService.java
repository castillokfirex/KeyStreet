package co.keystreet.assistant;

import co.keystreet.assistant.dto.AssistantDtos.AssistantQueryRequest;
import co.keystreet.assistant.dto.AssistantDtos.AssistantQueryResponse;
import co.keystreet.assistant.dto.AssistantDtos.RagQueryPayload;
import co.keystreet.catalog.ProductRepository;
import co.keystreet.common.ClientIpHasher;
import co.keystreet.tenant.Tenant;
import co.keystreet.tenant.TenantContext;
import co.keystreet.tenant.TenantRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AssistantService {

  private static final Logger log = LoggerFactory.getLogger(AssistantService.class);

  private final RagClient ragClient;
  private final ProductRepository productRepository;
  private final TenantRepository tenantRepository;
  private final ClientIpHasher ipHasher;

  public AssistantService(
      RagClient ragClient,
      ProductRepository productRepository,
      TenantRepository tenantRepository,
      ClientIpHasher ipHasher) {
    this.ragClient = ragClient;
    this.productRepository = productRepository;
    this.tenantRepository = tenantRepository;
    this.ipHasher = ipHasher;
  }

  @Transactional(readOnly = true)
  public AssistantQueryResponse ask(
      AssistantQueryRequest req, UUID userId, String channel, String clientIp) {
    UUID tid = TenantContext.require();
    Integer topK =
        tenantRepository
            .findById(tid)
            .map(Tenant::getSettings)
            .map(s -> s.get("ragTopK"))
            .filter(Number.class::isInstance)
            .map(n -> ((Number) n).intValue())
            .orElse(6);

    Map<String, Object> productContext = null;
    if (req.productSlug() != null && !req.productSlug().isBlank()) {
      productContext =
          productRepository
              .findBySlugAndIsActiveTrue(req.productSlug().trim())
              .map(
                  p -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("slug", p.getSlug());
                    m.put("name", p.getName());
                    m.put("brand", p.getBrand().getName());
                    m.put("silhouette", p.getSilhouette());
                    m.put("colorway", p.getColorway());
                    m.put("finalPriceCop", p.getFinalPriceCop());
                    m.put("materialSpecs", p.getMaterialSpecs());
                    return m;
                  })
              .orElse(null);
    }

    RagQueryPayload payload =
        new RagQueryPayload(
            tid,
            req.question().trim(),
            userId,
            req.sessionId(),
            channel,
            productContext,
            topK,
            ipHasher.hash(clientIp));

    long t0 = System.currentTimeMillis();
    try {
      AssistantQueryResponse res = ragClient.query(payload);
      return res != null
          ? res
          : new AssistantQueryResponse(
              "ERROR",
              "El asistente no pudo responder en este momento.",
              List.of(),
              null,
              (int) (System.currentTimeMillis() - t0));
    } catch (Exception ex) {
      log.warn("Error consultando rag-service para tenant {}: {}", tid, ex.getMessage());
      return new AssistantQueryResponse(
          "ERROR",
          "El asistente no esta disponible en este momento. Intenta de nuevo en unos segundos.",
          List.of(),
          null,
          (int) (System.currentTimeMillis() - t0));
    }
  }
}
