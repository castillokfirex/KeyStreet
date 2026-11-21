package co.keystreet.orders;

import co.keystreet.catalog.Product;
import co.keystreet.catalog.ProductVariant;
import co.keystreet.catalog.ProductVariantRepository;
import co.keystreet.common.ApiException;
import co.keystreet.orders.WhatsappMessageBuilder.LineItem;
import co.keystreet.tenant.Tenant;
import co.keystreet.tenant.TenantContext;
import co.keystreet.tenant.TenantRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/orders")
public class OrderIntentController {

  public record OrderItemReq(
      @NotNull UUID variantId, @Min(1) @Max(20) int quantity) {}

  public record WhatsappIntentReq(@NotEmpty List<@Valid OrderItemReq> items) {}

  public record WhatsappIntentRes(
      UUID intentId, int totalCop, String message, String whatsappUrl) {}

  private final ProductVariantRepository variantRepository;
  private final TenantRepository tenantRepository;
  private final WhatsappOrderIntentRepository intentRepository;
  private final WhatsappMessageBuilder messageBuilder;

  public OrderIntentController(
      ProductVariantRepository variantRepository,
      TenantRepository tenantRepository,
      WhatsappOrderIntentRepository intentRepository,
      WhatsappMessageBuilder messageBuilder) {
    this.variantRepository = variantRepository;
    this.tenantRepository = tenantRepository;
    this.intentRepository = intentRepository;
    this.messageBuilder = messageBuilder;
  }

  @PostMapping("/whatsapp-intent")
  @Transactional
  public WhatsappIntentRes createIntent(
      @Valid @RequestBody WhatsappIntentReq req, @AuthenticationPrincipal Jwt jwt) {
    UUID tid = TenantContext.require();
    Tenant tenant =
        tenantRepository
            .findById(tid)
            .orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "TENANT_NOT_FOUND", "Tienda no encontrada"));

    List<UUID> variantIds = req.items().stream().map(OrderItemReq::variantId).distinct().toList();
    Map<UUID, ProductVariant> byId =
        variantRepository.findAllByIdIn(variantIds).stream()
            .collect(Collectors.toMap(ProductVariant::getId, Function.identity()));

    int totalCop = 0;
    List<LineItem> lineItems = new ArrayList<>();
    List<Map<String, Object>> storedItems = new ArrayList<>();

    for (OrderItemReq itemReq : req.items()) {
      ProductVariant v = byId.get(itemReq.variantId());
      if (v == null || !v.isActive() || !v.getProduct().isActive()) {
        throw new ApiException(HttpStatus.NOT_FOUND, "VARIANT_NOT_FOUND", "Talla no disponible");
      }
      if (v.getStock() < itemReq.quantity()) {
        throw new ApiException(
            HttpStatus.CONFLICT,
            "OUT_OF_STOCK",
            "Stock insuficiente para " + v.getProduct().getName() + " talla " + v.getSizeEu());
      }
      Product p = v.getProduct();
      int unitPrice = p.getFinalPriceCop();
      totalCop += unitPrice * itemReq.quantity();

      lineItems.add(
          new LineItem(
              p.getName(),
              v.getSizeEu(),
              v.getSku(),
              itemReq.quantity(),
              p.getOriginalPriceCop(),
              unitPrice,
              p.getDiscountPercent()));

      Map<String, Object> m = new LinkedHashMap<>();
      m.put("variantId", v.getId().toString());
      m.put("sku", v.getSku());
      m.put("name", p.getName());
      m.put("size", v.getSizeEu());
      m.put("qty", itemReq.quantity());
      m.put("unitPriceCop", unitPrice);
      storedItems.add(m);
    }

    String msg = messageBuilder.buildMessage(tenant.getName(), lineItems, totalCop);
    String url = messageBuilder.buildUrl(tenant.getWhatsappPhone(), msg);

    WhatsappOrderIntent intent = new WhatsappOrderIntent();
    intent.setTenantId(tid);
    if (jwt != null) {
      intent.setUserId(UUID.fromString(jwt.getSubject()));
    }
    intent.setItems(storedItems);
    intent.setTotalCop(totalCop);
    intent.setMessage(msg);
    WhatsappOrderIntent saved = intentRepository.save(intent);

    return new WhatsappIntentRes(saved.getId(), totalCop, msg, url);
  }
}
