import {
  Box,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
} from "lucide-react";
import { Accordion } from "@/components/ui/Accordion";
import { Button } from "@/components/ui/Button";
import { PriceTag } from "@/components/ui/PriceTag";
import { SizeSelector, type SizeOption } from "@/components/ui/SizeSelector";
import type { ProductDetailDto } from "@/lib/types";
import { KastFitHint } from "./KastFitHint";

export function PurchasePanel({
  product,
  selectedVariant,
  sizeWarning,
  checkoutLoading,
  onSelectSize,
  onOrderWhatsapp,
  onOpenFitting,
  onAddToBag,
  onAskKast,
}: {
  product: ProductDetailDto;
  selectedVariant: SizeOption | null;
  sizeWarning: string | null;
  checkoutLoading: boolean;
  onSelectSize: (v: SizeOption) => void;
  onOrderWhatsapp: () => void;
  onOpenFitting: () => void;
  onAddToBag: () => void;
  onAskKast: (prefill?: string) => void;
}) {
  const specs = product.materialSpecs ?? {};
  const sizeOptions: SizeOption[] = (product.variants ?? []).map((v) => ({
    variantId: v.id,
    sku: v.sku,
    sizeEu: v.sizeEu,
    stock: v.stock,
    inStock: v.inStock,
  }));

  const activeSku =
    selectedVariant?.sku || sizeOptions[0]?.sku || product.modelCode;

  return (
    <div className="space-y-6 lg:sticky lg:top-28 lg:max-w-[30rem]">
      {/* Encabezado ficha técnica */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() =>
            onAskKast(`¿De qué materiales está hecho ${product.name} y cómo cuidarlo?`)
          }
          className="inline-flex items-center gap-1.5 border-b border-ink pb-0.5 font-display text-[10px] font-semibold uppercase tracking-nav text-ink hover:opacity-60 cursor-pointer"
        >
          <Sparkles className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
          <span>Material verificado IA · Ficha técnica</span>
        </button>

        <span className="font-display text-[10px] font-semibold uppercase tracking-nav text-sale-text">
          • En stock inmediato
        </span>
      </div>

      <div>
        <p className="font-display text-[10px] font-semibold uppercase tracking-nav text-muted">
          SKU {activeSku} · {product.brand}
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold uppercase leading-tight tracking-label text-ink sm:text-[1.75rem]">
          {product.name}
        </h1>
        {product.colorway && (
          <p className="mt-0.5 text-xs text-muted">Colorway: {product.colorway}</p>
        )}
      </div>

      <PriceTag
        originalPriceCop={product.originalPriceCop}
        finalPriceCop={product.finalPriceCop}
        discountPercent={product.discountPercent}
        hasDiscount={product.hasDiscount}
        size="lg"
        showPill
      />

      <p className="text-xs sm:text-sm leading-relaxed text-muted">
        {product.description || product.shortDescription}
      </p>

      <KastFitHint
        fit={specs.fit}
        onAskKast={() =>
          onAskKast(`¿Qué talla recomiendas en ${product.name}?`)
        }
      />

      {/* Selector de talla */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-display text-[10px] font-semibold uppercase tracking-nav text-ink">
            Selecciona tu talla (EU)
          </span>
          {selectedVariant && (
            <span className="text-[11px] font-medium text-muted">
              Talla {selectedVariant.sizeEu} · {selectedVariant.stock} uds. disponibles
            </span>
          )}
        </div>

        <SizeSelector
          variants={sizeOptions}
          selectedSize={selectedVariant?.sizeEu ?? null}
          onSelect={onSelectSize}
        />

        {sizeWarning && (
          <p
            role="alert"
            className="border-l-2 border-kast-error py-1 pl-3 text-xs font-semibold text-kast-error"
          >
            {sizeWarning}
          </p>
        )}
      </div>

      {/* CTAs principales */}
      <div className="space-y-2 pt-1">
        <Button
          variant="forest"
          size="lg"
          fullWidth
          disabled={checkoutLoading}
          onClick={onOrderWhatsapp}
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          <span>
            {checkoutLoading
              ? "Abriendo WhatsApp..."
              : "Pedir por WhatsApp (Atención VIP)"}
          </span>
        </Button>

        <Button
          variant="outline"
          size="lg"
          fullWidth
          onClick={onOpenFitting}
        >
          <Box className="h-4 w-4" aria-hidden="true" />
          <span>Probar en mi cuerpo 3D</span>
        </Button>

        <Button
          variant="navy"
          size="lg"
          fullWidth
          onClick={onAddToBag}
        >
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          <span>Añadir a la bolsa</span>
        </Button>
      </div>

      {/* 3 tiles mini de confianza */}
      <ul className="grid grid-cols-3 gap-2 border-y border-line py-4">
        <li className="text-center">
          <Truck className="mx-auto h-4 w-4 text-ink" strokeWidth={1.5} aria-hidden="true" />
          <p className="mt-1.5 font-display text-[9px] font-semibold uppercase tracking-nav text-ink">
            Envío Colombia
          </p>
        </li>
        <li className="text-center">
          <ShieldCheck className="mx-auto h-4 w-4 text-ink" strokeWidth={1.5} aria-hidden="true" />
          <p className="mt-1.5 font-display text-[9px] font-semibold uppercase tracking-nav text-ink">
            Autenticidad
          </p>
        </li>
        <li className="text-center">
          <RefreshCw className="mx-auto h-4 w-4 text-ink" strokeWidth={1.5} aria-hidden="true" />
          <p className="mt-1.5 font-display text-[9px] font-semibold uppercase tracking-nav text-ink">
            Cambios 30d
          </p>
        </li>
      </ul>

      {/* Acordeones */}
      <Accordion
        items={[
          {
            id: "specs",
            title: "Composición y cuidados",
            content: (
              <div className="space-y-1.5">
                {specs.upper && (
                  <p>
                    <strong className="text-navy">Capellada:</strong> {specs.upper}
                  </p>
                )}
                {specs.midsole && (
                  <p>
                    <strong className="text-navy">Mediasuela:</strong> {specs.midsole}
                  </p>
                )}
                {specs.outsole && (
                  <p>
                    <strong className="text-navy">Suela:</strong> {specs.outsole}
                  </p>
                )}
                {specs.weightGrams && (
                  <p>
                    <strong className="text-navy">Peso aprox.:</strong> {specs.weightGrams} g
                  </p>
                )}
                {specs.care && specs.care.length > 0 && (
                  <ul className="list-disc pl-4 pt-1">
                    {specs.care.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            ),
          },
          {
            id: "shipping",
            title: "Envíos y rastreo",
            content:
              "Despachos express en Bogotá y Medellín en 24–48 horas hábiles y al resto de Colombia en 2–4 días hábiles con guía asegurada.",
          },
          {
            id: "warranty",
            title: "Garantía de autenticidad",
            content:
              "Cada par pasa inspección física de materiales, costuras y etiquetado antes del envío. Cambios por talla dentro de 30 días calendario.",
          },
        ]}
      />
    </div>
  );
}
