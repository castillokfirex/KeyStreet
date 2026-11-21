import { useQuery } from "@tanstack/react-query";
import { Box, CheckCircle2, MessageCircle, Rotate3d } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { KastLogo } from "@/components/brand/KastLogo";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { SizeOption } from "@/components/ui/SizeSelector";
import { useWhatsappCheckout } from "@/features/cart/useWhatsappCheckout";
import { ProductImage } from "@/features/catalog/ProductImage";
import { ViewerToolbar } from "@/features/fitting/ViewerToolbar";
import { formatCop } from "@/lib/money";
import { publicApi, queryKeys } from "@/lib/queries";
import { useAssistantStore } from "@/stores/assistant";
import { useCartStore } from "@/stores/cart";
import { useToastStore } from "@/stores/toast";
import { PurchasePanel } from "./PurchasePanel";
import { RelatedCarousel } from "./RelatedCarousel";

const LazyViewer3D = lazy(() =>
  import("@/features/viewer3d/Viewer3D").then((m) => ({ default: m.Viewer3D })),
);

const LazyFittingRoom = lazy(() =>
  import("@/features/fitting/FittingRoom").then((m) => ({
    default: m.FittingRoom,
  })),
);

type ViewerMode = "viewer3d" | "fitting";

export function ProductDetailPage() {
  const { slug = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProbador = searchParams.get("modo") === "probador";

  const [mode, setMode] = useState<ViewerMode>(
    initialProbador ? "fitting" : "viewer3d",
  );
  const [viewerActivated, setViewerActivated] = useState(initialProbador);
  const [cameraMode, setCameraMode] = useState<"full" | "feet">("full");

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

  const activateViewer = (nextMode: ViewerMode) => {
    setViewerActivated(true);
    setMode(nextMode);
    if (nextMode === "fitting") {
      setCameraMode("full");
    }
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
          {/* Columna izquierda (7 cols): Visor 360° & Probador anatómico lazy */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-line bg-surface">
              {/* Toolbar superior fiel a Stitch */}
              <div className="absolute left-3 right-3 top-3 z-20">
                <ViewerToolbar
                  mode={mode}
                  cameraMode={cameraMode}
                  onSelectMode={(m) => activateViewer(m)}
                  onSelectCamera={(cam) => {
                    activateViewer("fitting");
                    setCameraMode(cam);
                  }}
                />
              </div>

              {viewerActivated ? (
                <Suspense
                  fallback={
                    <div className="flex h-full items-center justify-center p-8 text-center">
                      <div className="space-y-2">
                        <Skeleton className="mx-auto h-12 w-12 rounded-full" />
                        <p className="font-display text-xs font-bold uppercase tracking-wider text-muted">
                          Cargando motor 3D...
                        </p>
                      </div>
                    </div>
                  }
                >
                  {mode === "fitting" ? (
                    <LazyFittingRoom product={product} cameraMode={cameraMode} />
                  ) : (
                    <LazyViewer3D
                      product={product}
                      onAskKast={(q) => openAssistant({ prefill: q })}
                    />
                  )}
                </Suspense>
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                  {product.images.ready ? (
                    <ProductImage
                      images={product.images}
                      alt={product.name}
                      priority
                      className="h-full"
                    />
                  ) : (
                    <>
                      <div className="text-navy/15">
                        <KastLogo variant="isotype" size={128} title={product.name} />
                      </div>
                      <Badge tone="mint" className="mt-4">
                        Vista 3D & Probador Anatómico bajo demanda
                      </Badge>
                      <p className="mt-2 max-w-xs text-xs text-muted">
                        Paleta: <strong>{specs.palette?.upper || "#FFFFFF"}</strong> ·
                        Silueta <strong>{product.silhouette}</strong>
                      </p>
                      <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                        <Button
                          variant="forest"
                          size="sm"
                          onClick={() => activateViewer("viewer3d")}
                        >
                          <Rotate3d className="h-4 w-4" aria-hidden="true" />
                          <span>Activar Visor 3D 360°</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => activateViewer("fitting")}
                        >
                          <Box className="h-4 w-4" aria-hidden="true" />
                          <span>Abrir Probador 3D</span>
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {!viewerActivated || mode === "viewer3d" ? (
                <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-canvas/90 border border-line px-4 py-1 font-display text-[10px] font-bold uppercase tracking-[0.16em] text-navy shadow-xs">
                  Arrastra para rotar {mode === "fitting" ? "maniquí" : "zapato"}
                </div>
              ) : null}
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
              onOpenFitting={() => activateViewer("fitting")}
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
