import { formatCop } from "./money";

export interface WhatsappFallbackItem {
  productName: string;
  sizeEu: number;
  sku: string;
  originalPriceCop: number;
  finalPriceCop: number;
  discountPercent?: number;
  hasDiscount?: boolean;
  quantity: number;
}

export function buildWhatsappMessage(
  tenantName: string,
  items: WhatsappFallbackItem[],
): string {
  let total = 0;
  const lines = items.map((item) => {
    const lineTotal = item.finalPriceCop * item.quantity;
    total += lineTotal;
    const qtyPrefix = item.quantity > 1 ? `${item.quantity}x ` : "";
    const discountNote =
      item.hasDiscount && item.discountPercent
        ? ` (antes ${formatCop(item.originalPriceCop)}, -${item.discountPercent}%)`
        : "";
    return `• ${qtyPrefix}${item.productName} — Talla ${item.sizeEu} — SKU ${item.sku} — ${formatCop(item.finalPriceCop)}${discountNote}`;
  });
  return `Hola ${tenantName} 👋 Quiero hacer este pedido:\n${lines.join("\n")}\nTotal: ${formatCop(total)}`;
}

export function buildFallbackWhatsappUrl(
  phoneDigits: string,
  tenantName: string,
  items: WhatsappFallbackItem[],
): string {
  const cleanPhone = phoneDigits.replace(/\D/g, "") || "573000000000";
  const message = buildWhatsappMessage(tenantName, items);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
