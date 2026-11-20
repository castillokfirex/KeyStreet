import { useQuery } from "@tanstack/react-query";
import { Box, CheckCircle2, Eye, Footprints, MessageCircle, Rotate3d } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { KastLogo } from "@/components/brand/KastLogo";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { SizeOption } from "@/components/ui/SizeSelector";
import { useWhatsappCheckout } from "@/features/cart/useWhatsappCheckout";
import { ProductImage } from "@/features/catalog/ProductImage";
import { formatCop } from "@/lib/money";
import { publicApi, queryKeys } from "@/lib/queries";
import { useAssistantStore } from "@/stores/assistant";
import { useCartStore } from "@/stores/cart";
import { useToastStore } from "@/stores/toast";
import { PurchasePanel } from "./PurchasePanel";
import { RelatedCarousel } from "./RelatedCarousel";

type ViewerMode = "viewer3d" | "fitting";

export function ProductDetailPage() {
  const { slug = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<ViewerMode>(
    searchParams.get("modo") === "probador" ? "fitting" : "viewer3d",
  );
  const [selectionState, setSelectionState] = useState<{
    slug: string;
    variant: SizeOption | null;
  }>({ slug, variant: null });
  const [warningState, setWarningState] = useState<{
    slug: string;
    message: string | null;
  }>({ slug, message: null });

  const selectedVariant =
    selectionState.slug === slug ? selectionState.variant : null;
  const sizeWarning =
    warningState.slug === slug ? warningState.message : null;

  const setProductContext = useAssistantStore((s) => s.setProductContext);
  const openAssistant = useAssistantStore((s) => s.openDrawer);
  const addItem = useCartStore((s) => s.addItem);
  const setBagOpen = useCartStore((s) => s.setBagOpen);
  const pushToast = useToastStore((s) => s.push);
  const { checkout, loading: checkoutLoading } = useWhatsappCheckout();

  const {
    data: product,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.product(slug),
    queryFn: () => publicApi.getProduct(slug),
    enabled: Boolean(slug),
  });

  useEffect(() => {
    if (product) {
      setProductContext(product.slug, product.name);
    }
    return () => setProductContext(null, null);
  }, [product, setProductContext]);

  const switchMode = (nextMode: ViewerMode) => {
    setMode(nextMode);
    const next = new URLSearchParams(searchParams);
    if (nextMode === "fitting") {
      next.set("modo", "probador");
    } else {
      next.delete("modo");
    }
    setSearchParams(next, { replace: true });
  };

  const requireSelectedSize = (): SizeOption | null => {
    if (!selectedVariant) {
      setWarningState({
        slug,
        message: "Selecciona una talla (EU 36–44) antes de continuar.",
      });
      return null;
    }
    setWarningState({ slug, message: null });
    return selectedVariant;
  };

  const handleOrderWhatsapp = () => {
    if (!product) return;
    const chosen = requireSelectedSize();
    if (!chosen) return;
    void checkout([
      {
        variantId: chosen.variantId,
        quantity: 1,
        fallback: {
          productName: product.name,
          sizeEu: chosen.sizeEu,
          sku: chosen.sku,
          originalPriceCop: product.originalPriceCop,
          finalPriceCop: product.finalPriceCop,
          discountPercent: product.discountPercent,
          hasDiscount: product.hasDiscount,
          quantity: 1,
        },
      },
    ]);
  };

  const handleAddToBag = () => {
    if (!product) return;
    const chosen = requireSelectedSize();
    if (!chosen) return;
    addItem({
      variantId: chosen.variantId,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      sku: chosen.sku,
      sizeEu: chosen.sizeEu,
      originalPriceCop: product.originalPriceCop,
      finalPriceCop: product.finalPriceCop,
      discountPercent: product.discountPercent,
      hasDiscount: product.hasDiscount,
    });
    pushToast({
      title: "Agregado a tu bolsa",
      description: `${product.name} · Talla ${chosen.sizeEu}`,
      tone: "success",
    });
    setBagOpen(true);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Skeleton className="lg:col-span-7 aspect-[3/4]" />
        <Skeleton className="lg:col-span-5 h-[560px]" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold uppercase text-navy">
          Silueta no encontrada
        </h1>
        <p className="text-sm text-muted">
          No encontramos este producto en la colección activa.
        </p>
        <Link
          to="/catalogo"
          className="inline-flex h-11 items-center rounded-xl bg-navy px-6 font-display text-xs font-bold uppercase tracking-wider text-white"
        >
          Volver al catálogo
        </Link>
      </div>
    );
  }

  const specs = product.materialSpecs ?? {};

  return (
    <div className="pb-20 sm:pb-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-10">
        <Breadcrumbs
          items={[
            { label: "Inicio", to: "/" },
            { label: "Catálogo", to: "/catalogo" },
            { label: product.name },
          ]}
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
          {/* Columna izquierda (7 cols): Visor & Probador */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-line bg-surface">
              {/* Toolbar superior fiel a Stitch */}
              <div className="absolute left-3 right-3 top-3 z-20 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => switchMode("fitting")}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-display text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    mode === "fitting"
                      ? "bg-forest text-white"
                      : "bg-canvas/90 text-navy border border-line"
                  }`}
                >
                  <Box className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Probador 3D</span>
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("viewer3d")}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-display text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    mode === "viewer3d"
                      ? "bg-forest text-white"
                      : "bg-canvas/90 text-navy border border-line"
                  }`}
                >
                  <Rotate3d className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>360° Zapato</span>
                </button>
                <span className="inline-flex items-center gap-1 rounded-full bg-canvas/90 border border-line px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-wider text-navy">
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Vista completa</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-canvas/90 border border-line px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-wider text-navy">
                  <Footprints className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Zoom pies</span>
                </span>
              </div>

              {/* Contenido preview ligero (Fase 5 inyecta Canvas 3D + MediaPipe lazy) */}
              {product.images.ready ? (
                <ProductImage images={product.images} alt={product.name} priority className="h-full" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                  <div className="text-navy/15">
                    <KastLogo variant="isotype" size={128} title={product.name} />
                  </div>
                  <Badge tone="mint" className="mt-4">
                    {mode === "fitting"
                      ? "Probador anatómico 3:4 listo"
                      : "Visor interactivo 360° listo"}
                  </Badge>
                  <p className="mt-2 max-w-xs text-xs text-muted">
                    Paleta detectada:{" "}
                    <strong>{specs.palette?.upper || "#FFFFFF"}</strong> · Silueta{" "}
                    <strong>{product.silhouette}</strong>
                  </p>
                </div>
              )}

              <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-canvas/90 border border-line px-4 py-1 font-display text-[10px] font-bold uppercase tracking-[0.16em] text-navy shadow-xs">
                Arrastra para rotar {mode === "fitting" ? "maniquí" : "zapato"}
              </div>
            </div>

            {/* Franja inferior de material certificado */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-canvas p-4">
              <div>
                <p className="text-xs font-bold text-navy">
                  {specs.upper || "Cuero / Textil seleccionado"} ·{" "}
                  {specs.outsole || "Suela de caucho"}
                </p>
                <p className="text-[11px] text-muted">
                  Especificaciones verificables con Kast mediante fichas PDF indexadas.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 font-display text-[10px] font-bold uppercase tracking-[0.16em] text-forest">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Certificado 2026</span>
              </span>
            </div>
          </div>

          {/* Columna derecha (5 cols): Panel de compra */}
          <div className="lg:col-span-5">
            <PurchasePanel
              product={product}
              selectedVariant={selectedVariant}
              sizeWarning={sizeWarning}
              checkoutLoading={checkoutLoading}
              onSelectSize={(v) => {
                setSelectionState({ slug, variant: v });
                setWarningState({ slug, message: null });
              }}
              onOrderWhatsapp={handleOrderWhatsapp}
              onOpenFitting={() => switchMode("fitting")}
              onAddToBag={handleAddToBag}
              onAskKast={(prefill) => openAssistant({ prefill })}
            />
          </div>
        </div>
      </div>

      {/* Barra fija inferior móvil con precio + WhatsApp */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur-sm sm:hidden">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
            {selectedVariant ? `Talla ${selectedVariant.sizeEu}` : "Elige talla"}
          </p>
          <p className="font-display text-sm font-bold text-navy">
            {formatCop(product.finalPriceCop)}
          </p>
        </div>
        <Button
          variant="forest"
          size="md"
          disabled={checkoutLoading}
          onClick={handleOrderWhatsapp}
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          <span>WhatsApp VIP</span>
        </Button>
      </div>

      <RelatedCarousel slug={product.slug} />
    </div>
  );
}
