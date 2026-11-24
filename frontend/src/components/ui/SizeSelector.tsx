export interface SizeOption {
  variantId: string;
  sku: string;
  sizeEu: number;
  stock: number;
  inStock: boolean;
}

export function SizeSelector({
  variants,
  selectedSize,
  onSelect,
}: {
  variants: SizeOption[];
  selectedSize: number | null;
  onSelect: (variant: SizeOption) => void;
}) {
  const sorted = [...variants].sort((a, b) => a.sizeEu - b.sizeEu);

  return (
    <div className="grid grid-cols-5 sm:grid-cols-9 lg:grid-cols-5 gap-1" role="group" aria-label="Selector de talla EU">
      {sorted.map((v) => {
        const selected = selectedSize === v.sizeEu;
        return (
          <button
            key={v.variantId}
            type="button"
            disabled={!v.inStock}
            aria-pressed={selected}
            aria-label={`Talla ${v.sizeEu}${!v.inStock ? " agotada" : ""}`}
            onClick={() => onSelect(v)}
            className={[
              "h-11 rounded-sm border text-xs font-medium tabular-nums transition-colors cursor-pointer",
              "disabled:cursor-not-allowed disabled:border-line disabled:bg-transparent disabled:text-gray disabled:line-through",
              selected
                ? "border-ink bg-ink text-canvas"
                : "border-line bg-transparent text-ink hover:border-ink",
            ].join(" ")}
          >
            {v.sizeEu}
          </button>
        );
      })}
    </div>
  );
}
