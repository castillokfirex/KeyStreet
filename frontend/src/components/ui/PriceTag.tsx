import { formatCop } from "@/lib/money";
import { Badge } from "./Badge";

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
      ? "text-2xl sm:text-3xl font-bold tracking-tight"
      : size === "sm"
        ? "text-xs font-bold"
        : "text-sm font-bold";

  return (
    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
      {hasDiscount && (
        <span
          className="text-xs text-muted line-through"
          data-testid="original-price"
        >
          {formatCop(originalPriceCop)}
        </span>
      )}
      <span
        className={`${finalSize} text-navy font-display`}
        data-testid="final-price"
      >
        {formatCop(finalPriceCop)}
      </span>
      {showPill && hasDiscount && discountPercent > 0 && (
        <Badge tone="mint">-{discountPercent}% OFF</Badge>
      )}
    </div>
  );
}
