package co.keystreet.orders;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class WhatsappMessageBuilder {

  private static final Locale ES_CO = Locale.forLanguageTag("es-CO");

  public record LineItem(
      String productName,
      short sizeEu,
      String sku,
      int quantity,
      int originalPriceCop,
      int unitPriceCop,
      short discountPercent) {}

  public String buildMessage(String tenantName, List<LineItem> items, int totalCop) {
    StringBuilder sb = new StringBuilder();
    sb.append("Hola ").append(tenantName).append(" \uD83D\uDC4B Quiero hacer este pedido:\n");
    for (LineItem item : items) {
      sb.append("\u2022 ")
          .append(item.productName())
          .append(" \u2014 Talla ")
          .append(item.sizeEu())
          .append(" \u2014 SKU ")
          .append(item.sku());
      if (item.quantity() > 1) {
        sb.append(" x").append(item.quantity());
      }
      sb.append(" \u2014 ").append(formatCop(item.unitPriceCop()));
      if (item.discountPercent() > 0) {
        sb.append(" (antes ")
            .append(formatCopSimple(item.originalPriceCop()))
            .append(", -")
            .append(item.discountPercent())
            .append("%)");
      }
      sb.append('\n');
    }
    sb.append("Total: ").append(formatCop(totalCop));
    return sb.toString();
  }

  public String buildUrl(String phone, String message) {
    String encoded = URLEncoder.encode(message, StandardCharsets.UTF_8).replace("+", "%20");
    return "https://wa.me/" + phone + "?text=" + encoded;
  }

  public static String formatCop(int amount) {
    return formatCopSimple(amount) + " COP";
  }

  public static String formatCopSimple(int amount) {
    NumberFormat nf = NumberFormat.getIntegerInstance(ES_CO);
    nf.setGroupingUsed(true);
    return "$" + nf.format(amount);
  }
}
