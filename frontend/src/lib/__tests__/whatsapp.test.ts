import { describe, expect, it } from "vitest";
import { buildFallbackWhatsappUrl, buildWhatsappMessage } from "../whatsapp";

describe("whatsapp fallback builder", () => {
  it("includes product name, size, SKU, and COP price in decoded text", () => {
    const msg = buildWhatsappMessage("Key Street", [
      {
        productName: "Nike Air Force 1 Low '07 (Blanco)",
        sizeEu: 41,
        sku: "KS-NIK-AF1-41",
        originalPriceCop: 185000,
        finalPriceCop: 166500,
        discountPercent: 10,
        hasDiscount: true,
        quantity: 1,
      },
    ]);
    expect(msg).toContain("Nike Air Force 1 Low '07 (Blanco)");
    expect(msg).toContain("Talla 41");
    expect(msg).toContain("SKU KS-NIK-AF1-41");
    expect(msg).toContain("$166.500 COP");
    expect(msg).toContain("-10%");

    const url = buildFallbackWhatsappUrl("573000000000", "Key Street", [
      {
        productName: "Nike Air Force 1 Low '07 (Blanco)",
        sizeEu: 41,
        sku: "KS-NIK-AF1-41",
        originalPriceCop: 185000,
        finalPriceCop: 166500,
        discountPercent: 10,
        hasDiscount: true,
        quantity: 1,
      },
    ]);
    expect(url.startsWith("https://wa.me/573000000000?text=")).toBe(true);
    const decoded = decodeURIComponent(url.split("text=")[1]);
    expect(decoded).toContain("Nike Air Force 1 Low '07 (Blanco)");
    expect(decoded).toContain("Talla 41");
    expect(decoded).toContain("$166.500 COP");
  });
});
