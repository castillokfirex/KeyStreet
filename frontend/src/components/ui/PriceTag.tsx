import { formatCop } from "@/lib/money";
import { Badge } from "./Badge";

/** Precio: anterior tachado en gris + final en verde acento si hay descuento. */
export function PriceTag({
  originalPriceCop,
  finalPriceCop,
  discountPercent = 0,
  hasDiscount,
  size = "md",
  showPill = false,
}: {
  originalPriceCop: number;
  finalPriceCop: number;
  discountPercent?: number;
  hasDiscount: boolean;
  size?: "sm" | "md" | "lg";
  showPill?: boolean;
}) {
  const finalSize =
    size === "lg"
      ? "text-xl sm:text-2xl font-semibold tracking-tight"
      : size === "sm"
        ? "text-xs font-medium"
        : "text-sm font-semibold";

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 tabular-nums">
      {hasDiscount && (
        <span
          className="text-xs text-muted line-through decoration-gray"
          data-testid="original-price"
        >
          <span className="sr-only">Antes </span>
          {formatCop(originalPriceCop)}
        </span>
      )}
      <span
        className={`${finalSize} font-display ${hasDiscount ? "text-sale-text" : "text-ink"}`}
        data-testid="final-price"
      >
        {hasDiscount && <span className="sr-only">Ahora </span>}
        {formatCop(finalPriceCop)}
      </span>
      {showPill && hasDiscount && discountPercent > 0 && (
        <Badge tone="mint">-{discountPercent}% OFF</Badge>
      )}
    </div>
  );
}
