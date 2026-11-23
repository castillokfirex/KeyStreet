import { SizeSelector, type SizeOption } from "@/components/ui/SizeSelector";
import { KastFitHint } from "@/features/product/KastFitHint";
import type { ProductDetailDto } from "@/lib/types";
import { SectionLabel } from "./controls";

export function sizeOptionsFor(product: ProductDetailDto): SizeOption[] {
  return (product.variants ?? []).map((v) => ({
    variantId: v.id,
    sku: v.sku,
    sizeEu: v.sizeEu,
    stock: v.stock,
    inStock: v.inStock,
  }));
}

export function SizeStep({
  product,
  selected,
  warning,
  onSelect,
  onAskKast,
}: {
  product: ProductDetailDto;
  selected: SizeOption | null;
  warning: string | null;
  onSelect: (v: SizeOption) => void;
  onAskKast: () => void;
}) {
  return (
    <div className="space-y-6">
      <KastFitHint fit={product.materialSpecs?.fit} onAskKast={onAskKast} />

      <section>
        <SectionLabel
          aside={
            selected
              ? `Talla ${selected.sizeEu} · ${selected.stock} uds. disponibles`
              : undefined
          }
        >
          Talla del zapato (EU)
        </SectionLabel>
        <SizeSelector
          variants={sizeOptionsFor(product)}
          selectedSize={selected?.sizeEu ?? null}
          onSelect={onSelect}
        />
        {warning && (
          <p
            role="alert"
            className="ks-rise mt-3 border-l-2 border-kast-error py-1 pl-3 text-xs font-semibold text-kast-error"
          >
            {warning}
          </p>
        )}
      </section>

      <p className="text-xs leading-relaxed text-muted">
        El avatar usa el largo de pie de tu talla habitual para que veas la
        proporción real del par en tu cuerpo.
      </p>
    </div>
  );
}
