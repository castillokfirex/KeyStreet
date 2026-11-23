import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Footprints,
  MessageCircle,
  Rotate3d,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { KastLogo } from "@/components/brand/KastLogo";
import { Skeleton } from "@/components/ui/Skeleton";
import type { SizeOption } from "@/components/ui/SizeSelector";
import { useWhatsappCheckout } from "@/features/cart/useWhatsappCheckout";
import { recommendSize } from "@/lib/fitHint";
import { formatCop } from "@/lib/money";
import { publicApi, queryKeys } from "@/lib/queries";
import { useAssistantStore } from "@/stores/assistant";
import { cartImageFor, useCartStore } from "@/stores/cart";
import { useFitProfileStore } from "@/stores/fitProfile";
import { useFittingOutfitStore } from "@/stores/fittingOutfit";
import { useToastStore } from "@/stores/toast";
import { computeMannequinScale } from "./bodyParams";
import type { CameraView } from "./FittingScene";
import { OutfitStep } from "./studio/OutfitStep";
import { ProfileStep } from "./studio/ProfileStep";
import { SizeStep, sizeOptionsFor } from "./studio/SizeStep";

const LazyFittingScene = lazy(() =>
  import("./FittingScene").then((m) => ({ default: m.FittingScene })),
);

type Step = "tu" | "ropa" | "talla";
const STEPS: { id: Step; label: string }[] = [
  { id: "tu", label: "Tú" },
  { id: "ropa", label: "Ropa" },
  { id: "talla", label: "Talla" },
];

const CTA =
  "group relative isolate flex h-12 w-full cursor-pointer items-center justify-center gap-2 overflow-hidden bg-ink font-display text-[11px] font-semibold uppercase tracking-nav text-canvas transition-transform duration-300 active:scale-[0.98] disabled:cursor-not-allowed";
const CTA_SWEEP =
  "absolute inset-0 -z-10 origin-left scale-x-0 bg-forest transition-transform duration-500 ease-editorial group-hover:scale-x-100";

function SceneChip({
  active,
  onClick,
  icon,
  children,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex h-9 min-w-9 cursor-pointer items-center justify-center gap-1.5 px-2.5 font-display sm:px-3 text-[10px] font-semibold uppercase tracking-nav shadow-[0_6px_18px_-10px_rgb(17_17_17/0.45)] backdrop-blur-sm transition-colors ${
        active ? "bg-ink text-canvas" : "bg-canvas/90 text-ink hover:bg-white"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
    </button>
  );
}

export function FittingPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const productHref = `/producto/${slug}`;

  const {
    data: product,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.product(slug),
    queryFn: () => publicApi.getProduct(slug),
    enabled: Boolean(slug),
  });

  const heightCm = useFitProfileStore((s) => s.heightCm);
  const build = useFitProfileStore((s) => s.build);
  const usualSizeEu = useFitProfileStore((s) => s.usualSizeEu);
  const ratios = useFitProfileStore((s) => s.ratios);
  const outfit = useFittingOutfitStore((s) => s.outfit);
  const addItem = useCartStore((s) => s.addItem);
  const setBagOpen = useCartStore((s) => s.setBagOpen);
  const pushToast = useToastStore((s) => s.push);
  const openAssistant = useAssistantStore((s) => s.openDrawer);
  const { checkout, loading: checkoutLoading } = useWhatsappCheckout();

  const [step, setStep] = useState<Step>("tu");
  const [view, setView] = useState<CameraView>("body");
  const [spinning, setSpinning] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(true);
  const [picked, setPicked] = useState<SizeOption | null>(null);
  const [sizeWarning, setSizeWarning] = useState<string | null>(null);

  const scale = computeMannequinScale({ heightCm, build, usualSizeEu, ratios });

  // Talla sugerida por Kast si el usuario aún no eligió
  const options = product ? sizeOptionsFor(product) : [];
  const recommended = product
    ? recommendSize(usualSizeEu, product.materialSpecs?.fit).sizeEu
    : null;
  const selected =
    picked ??
    options.find((o) => o.sizeEu === recommended && o.inStock) ??
    null;

  // Pantalla completa: sin scroll de fondo y Escape para salir
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !useCartStore.getState().bagOpen)
        navigate(productHref);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [navigate, productHref]);

  const goStep = (s: Step) => {
    setStep(s);
    setSheetOpen(true);
  };

  const requireSize = () => {
    if (!selected) {
      setSizeWarning("Elige una talla antes de continuar.");
      goStep("talla");
      return null;
    }
    setSizeWarning(null);
    return selected;
  };

  const addToBag = () => {
    if (!product) return;
    const v = requireSize();
    if (!v) return;
    addItem({
      variantId: v.variantId,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      sku: v.sku,
      sizeEu: v.sizeEu,
      originalPriceCop: product.originalPriceCop,
      finalPriceCop: product.finalPriceCop,
      discountPercent: product.discountPercent,
      hasDiscount: product.hasDiscount,
      image: cartImageFor(product.images),
    });
    pushToast({
      title: "Agregado a tu bolsa",
      description: `${product.name} · Talla ${v.sizeEu} EU`,
      tone: "success",
    });
    setBagOpen(true);
  };

  const orderWhatsapp = () => {
    if (!product) return;
    const v = requireSize();
    if (!v) return;
    void checkout([
      {
        variantId: v.variantId,
        quantity: 1,
        fallback: {
          productName: product.name,
          sizeEu: v.sizeEu,
          sku: v.sku,
          originalPriceCop: product.originalPriceCop,
          finalPriceCop: product.finalPriceCop,
          discountPercent: product.discountPercent,
          hasDiscount: product.hasDiscount,
          quantity: 1,
        },
      },
    ]);
  };

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const nextStep = STEPS[stepIndex + 1];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Probador 3D"
      className="ks-fade-in fixed inset-0 z-[45] flex flex-col bg-canvas"
    >
      {/* Barra superior */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-3 sm:px-5">
        <Link
          to={productHref}
          className="group inline-flex h-10 items-center gap-1.5 pr-2 font-display text-[10px] font-semibold uppercase tracking-nav text-ink"
          aria-label="Volver al producto"
        >
          <ArrowLeft
            className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1"
            aria-hidden="true"
          />
          <span className="hidden sm:inline">Volver</span>
        </Link>

        <div className="min-w-0 flex-1">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
            Probador 3D
          </p>
          <p className="truncate font-display text-xs font-bold uppercase text-ink sm:text-sm">
            {product?.name ?? "Cargando…"}
            {product && (
              <span className="ml-2 font-mono text-[11px] font-normal normal-case text-muted">
                {formatCop(product.finalPriceCop)}
              </span>
            )}
          </p>
        </div>

        {product && (
          <button
            type="button"
            onClick={addToBag}
            className="group relative isolate hidden h-10 cursor-pointer items-center gap-2 overflow-hidden bg-ink px-4 font-display text-[10px] font-semibold uppercase tracking-nav text-canvas md:inline-flex"
          >
            <span aria-hidden="true" className={CTA_SWEEP} />
            <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
            {selected ? `Añadir · talla ${selected.sizeEu}` : "Elegir talla"}
          </button>
        )}

        <Link
          to={productHref}
          aria-label="Cerrar probador"
          className="group inline-flex h-10 w-10 items-center justify-center text-ink"
        >
          <X
            className="h-5 w-5 transition-transform duration-300 ease-editorial group-hover:rotate-90"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </Link>
      </header>

      {isError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-sm text-muted">No encontramos este producto.</p>
          <Link
            to="/catalogo"
            className="font-display text-[11px] font-semibold uppercase tracking-nav underline"
          >
            Ir al catálogo
          </Link>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Escena */}
          <section
            data-testid="fitting-room"
            data-camera-mode={view === "feet" ? "feet" : "full"}
            aria-label="Avatar con el zapato"
            className="relative min-h-[38svh] flex-1"
          >
            {product && !isLoading ? (
              <Suspense fallback={<SceneLoading />}>
                <LazyFittingScene
                  product={product}
                  outfit={outfit}
                  scale={scale}
                  view={view}
                  spinning={spinning}
                />
              </Suspense>
            ) : (
              <SceneLoading />
            )}

            <div className="absolute left-3 top-3 flex flex-wrap gap-1.5 sm:left-4 sm:top-4">
              <SceneChip
                active={view === "body"}
                onClick={() => setView("body")}
                icon={<User className="h-3.5 w-3.5" aria-hidden="true" />}
                label="Cuerpo completo"
              >
                Cuerpo
              </SceneChip>
              <SceneChip
                active={view === "feet"}
                onClick={() => setView("feet")}
                icon={<Footprints className="h-3.5 w-3.5" aria-hidden="true" />}
                label="Zoom pies"
              >
                Pies
              </SceneChip>
              <SceneChip
                active={spinning}
                onClick={() => setSpinning((v) => !v)}
                icon={<Rotate3d className="h-3.5 w-3.5" aria-hidden="true" />}
                label="Girar automáticamente"
              >
                Girar
              </SceneChip>
            </div>

            <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap items-center gap-1.5 sm:bottom-4 sm:left-4">
              <span className="bg-canvas/90 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink backdrop-blur-sm">
                {heightCm} cm · pie{" "}
                {scale.footLengthCm.toFixed(1).replace(".", ",")} cm
              </span>
            </div>
            <p className="pointer-events-none absolute bottom-3 right-3 hidden font-mono text-[10px] uppercase tracking-[0.12em] text-muted sm:block sm:bottom-4 sm:right-4">
              Arrastra para girar · rueda para acercar
            </p>
          </section>

          {/* Panel de pasos (lateral en escritorio, hoja inferior en móvil) */}
          <aside className="flex max-h-[56svh] shrink-0 flex-col overflow-hidden border-t border-line bg-canvas lg:max-h-none lg:w-[380px] lg:border-l lg:border-t-0">
            <button
              type="button"
              onClick={() => setSheetOpen((v) => !v)}
              aria-expanded={sheetOpen}
              aria-label={sheetOpen ? "Contraer panel" : "Expandir panel"}
              className="flex h-6 shrink-0 cursor-pointer items-center justify-center lg:hidden"
            >
              <span className="h-1 w-10 rounded-full bg-line" />
            </button>

            <div
              role="tablist"
              aria-label="Pasos del probador"
              className={`shrink-0 gap-1 px-4 pb-3 lg:flex lg:px-6 lg:pt-6 ${sheetOpen ? "flex" : "hidden"}`}
            >
              {STEPS.map((s, i) => {
                const active = s.id === step;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    id={`fit-tab-${s.id}`}
                    aria-selected={active}
                    aria-controls={`fit-panel-${s.id}`}
                    onClick={() => goStep(s.id)}
                    className={`relative flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 font-display text-[11px] font-semibold uppercase tracking-nav transition-colors ${
                      active ? "text-ink" : "text-muted hover:text-ink"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] transition-colors ${
                        active ? "bg-ink text-canvas" : "bg-surface text-muted"
                      }`}
                    >
                      {i + 1}
                    </span>
                    {s.label}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-0 bottom-0 h-0.5 origin-left bg-ink transition-transform duration-500 ease-editorial ${
                        active ? "scale-x-100" : "scale-x-0"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <div
              role="tabpanel"
              id={`fit-panel-${step}`}
              aria-labelledby={`fit-tab-${step}`}
              className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden border-t border-line px-4 py-5 lg:block lg:px-6 ${
                sheetOpen ? "block" : "hidden"
              }`}
            >
              <div key={step} className="ks-slide-in">
                {step === "tu" && <ProfileStep />}
                {step === "ropa" && <OutfitStep />}
                {step === "talla" && product && (
                  <SizeStep
                    product={product}
                    selected={selected}
                    warning={sizeWarning}
                    onSelect={(v) => {
                      setPicked(v);
                      setSizeWarning(null);
                    }}
                    onAskKast={() =>
                      openAssistant({
                        prefill: `¿Qué talla recomiendas en ${product.name}?`,
                      })
                    }
                  />
                )}
              </div>
            </div>

            <div className="shrink-0 space-y-2 border-t border-line px-4 py-3 lg:px-6 lg:py-4">
              {nextStep ? (
                <button
                  type="button"
                  onClick={() => goStep(nextStep.id)}
                  className={CTA}
                >
                  <span aria-hidden="true" className={CTA_SWEEP} />
                  Siguiente: {nextStep.label.toLowerCase()}
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5"
                    aria-hidden="true"
                  />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={addToBag}
                    disabled={!product}
                    className={CTA}
                  >
                    <span aria-hidden="true" className={CTA_SWEEP} />
                    <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                    {selected
                      ? `Añadir a la bolsa · talla ${selected.sizeEu}`
                      : "Añadir a la bolsa"}
                  </button>
                  <button
                    type="button"
                    onClick={orderWhatsapp}
                    disabled={!product || checkoutLoading}
                    className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 border border-forest font-display text-[11px] font-semibold uppercase tracking-nav text-forest transition-colors hover:bg-forest hover:text-white disabled:cursor-not-allowed"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    {checkoutLoading
                      ? "Abriendo WhatsApp…"
                      : "Pedir por WhatsApp"}
                  </button>
                </>
              )}
              {!sheetOpen && (
                <button
                  type="button"
                  onClick={() => setSheetOpen(true)}
                  className="flex w-full cursor-pointer items-center justify-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted lg:hidden"
                >
                  Ver opciones{" "}
                  <ChevronDown
                    className="h-3 w-3 rotate-180"
                    aria-hidden="true"
                  />
                </button>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function SceneLoading() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#F1F1EF]">
      <div className="ks-bob text-ink/15">
        <KastLogo variant="isotype" size={72} title="" />
      </div>
      <Skeleton className="h-2 w-28" />
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        Preparando tu avatar…
      </p>
    </div>
  );
}
