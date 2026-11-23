import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type TouchEvent,
} from "react";
import { Link } from "react-router";
import { MotionScope } from "@/components/motion/MotionScope";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProductImage } from "@/features/catalog/ProductImage";
import { formatCop } from "@/lib/money";
import { publicApi, queryKeys } from "@/lib/queries";
import type { ProductSummaryDto } from "@/lib/types";

const AUTOPLAY_MS = 6000;
const SHOWCASE_LIMIT = 6;
const SWIPE_THRESHOLD_PX = 40;

interface SlidePalette {
  id: string;
  bg: string;
  spotlight: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  ctaBg: string;
  ctaText: string;
  controlBg: string;
  controlBorder: string;
  isLight: boolean;
}

const SLIDE_PALETTES: readonly SlidePalette[] = [
  {
    id: "carbon",
    bg: "#111315",
    spotlight: "#23272D",
    border: "rgba(255, 255, 255, 0.10)",
    text: "#FFFFFF",
    muted: "#A1A8B3",
    accent: "#E5E7EB",
    ctaBg: "#FFFFFF",
    ctaText: "#111315",
    controlBg: "rgba(255, 255, 255, 0.08)",
    controlBorder: "rgba(255, 255, 255, 0.16)",
    isLight: false,
  },
  {
    id: "slate",
    bg: "#24272B",
    spotlight: "#383D44",
    border: "rgba(255, 255, 255, 0.12)",
    text: "#F8FAFC",
    muted: "#C4CAD2",
    accent: "#DCE2EA",
    ctaBg: "#F8FAFC",
    ctaText: "#111315",
    controlBg: "rgba(255, 255, 255, 0.09)",
    controlBorder: "rgba(255, 255, 255, 0.18)",
    isLight: false,
  },
  {
    id: "espresso",
    bg: "#2C2520",
    spotlight: "#433830",
    border: "rgba(214, 206, 199, 0.18)",
    text: "#FAF7F4",
    muted: "#D6CEC7",
    accent: "#E8DFD7",
    ctaBg: "#FAF7F4",
    ctaText: "#2C2520",
    controlBg: "rgba(214, 206, 199, 0.10)",
    controlBorder: "rgba(214, 206, 199, 0.22)",
    isLight: false,
  },
  {
    id: "bone",
    bg: "#F5F6F8",
    spotlight: "#FFFFFF",
    border: "#E6E8EC",
    text: "#0F172A",
    muted: "#475569",
    accent: "#0F172A",
    ctaBg: "#0F172A",
    ctaText: "#FFFFFF",
    controlBg: "rgba(15, 23, 42, 0.05)",
    controlBorder: "rgba(15, 23, 42, 0.14)",
    isLight: true,
  },
  {
    id: "forest",
    bg: "#16302B",
    spotlight: "#234B43",
    border: "rgba(255, 255, 255, 0.12)",
    text: "#F7F9F7",
    muted: "#BDD1CB",
    accent: "#DCE9E5",
    ctaBg: "#F7F9F7",
    ctaText: "#16302B",
    controlBg: "rgba(255, 255, 255, 0.08)",
    controlBorder: "rgba(255, 255, 255, 0.18)",
    isLight: false,
  },
  {
    id: "navy",
    bg: "#0F172A",
    spotlight: "#1E293B",
    border: "rgba(255, 255, 255, 0.12)",
    text: "#F8FAFC",
    muted: "#94A3B8",
    accent: "#CBD5E1",
    ctaBg: "#F8FAFC",
    ctaText: "#0F172A",
    controlBg: "rgba(255, 255, 255, 0.08)",
    controlBorder: "rgba(255, 255, 255, 0.16)",
    isLight: false,
  },
];

/**
 * Selecciona hasta `limit` siluetas reales priorizando variedad de marca/silueta
 * y modelos con fotografía lista.
 */
export function curateShowcaseProducts(
  items: ProductSummaryDto[],
  limit = SHOWCASE_LIMIT,
): ProductSummaryDto[] {
  if (items.length <= limit) return items;

  const sorted = [...items].sort((a, b) => {
    const readyDiff = Number(Boolean(b.images?.ready)) - Number(Boolean(a.images?.ready));
    if (readyDiff !== 0) return readyDiff;
    return Number(Boolean(b.hasDiscount)) - Number(Boolean(a.hasDiscount));
  });

  const picked: ProductSummaryDto[] = [];
  const seenBrands = new Set<string>();
  const pickedIds = new Set<string>();

  for (const item of sorted) {
    if (picked.length >= limit) break;
    const brandKey = item.brandSlug || item.brand.toLowerCase();
    if (!seenBrands.has(brandKey)) {
      seenBrands.add(brandKey);
      pickedIds.add(item.id);
      picked.push(item);
    }
  }

  for (const item of sorted) {
    if (picked.length >= limit) break;
    if (!pickedIds.has(item.id)) {
      pickedIds.add(item.id);
      picked.push(item);
    }
  }

  return picked;
}

function formatCounter(index: number, total: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(index + 1)} / ${pad(total)}`;
}

function EditorialShowcaseSkeleton() {
  return (
    <section
      aria-label="Colección editorial destacada"
      className="mx-auto max-w-[1680px] px-4 pt-12 sm:px-6 lg:px-8"
    >
      <div className="min-h-[580px] overflow-hidden rounded-2xl border border-line bg-surface lg:min-h-[520px]">
        <div className="grid h-full min-h-[580px] grid-cols-1 items-center gap-8 p-6 sm:p-10 lg:min-h-[520px] lg:grid-cols-12 lg:p-14">
          <div className="space-y-4 lg:col-span-6">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-16 w-full max-w-md" />
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-12 w-48" />
          </div>
          <div className="flex items-center justify-center lg:col-span-6">
            <Skeleton className="aspect-[4/5] w-full max-w-[320px] rounded-xl" />
          </div>
        </div>
      </div>
    </section>
  );
}

function CarouselInner({ products }: { products: ProductSummaryDto[] }) {
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);

  const count = products.length;
  const safeIndex = count > 0 ? activeIndex % count : 0;
  const current = products[safeIndex];
  const palette = SLIDE_PALETTES[safeIndex % SLIDE_PALETTES.length];

  const goTo = useCallback(
    (nextIndex: number, dir?: 1 | -1) => {
      if (count <= 1) return;
      const normalized = ((nextIndex % count) + count) % count;
      setDirection(dir ?? (normalized >= safeIndex ? 1 : -1));
      setActiveIndex(normalized);
    },
    [count, safeIndex],
  );

  const handleNext = useCallback(() => {
    goTo(safeIndex + 1, 1);
  }, [goTo, safeIndex]);

  const handlePrev = useCallback(() => {
    goTo(safeIndex - 1, -1);
  }, [goTo, safeIndex]);

  useEffect(() => {
    if (paused || reducedMotion || count <= 1) return;
    const timer = window.setInterval(() => {
      setDirection(1);
      setActiveIndex((prev) => (prev + 1) % count);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, count, safeIndex]);

  const handleBlurCapture = (e: FocusEvent<HTMLElement>) => {
    const nextTarget = e.relatedTarget as Node | null;
    if (!sectionRef.current?.contains(nextTarget)) {
      setPaused(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      handleNext();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      handlePrev();
    }
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    if (delta < 0) handleNext();
    else handlePrev();
  };

  if (!current) return null;

  const silhouetteLabel =
    current.silhouette === "HIGH"
      ? "HIGH TOP"
      : current.silhouette === "LOW"
        ? "LOW TOP"
        : current.silhouette || "ARCHIVO";

  const microLabel = current.badge
    ? `${current.badge} · ${silhouetteLabel}`
    : `CURADURÍA ESTUDIO · ${silhouetteLabel}`;

  return (
    <section
      ref={sectionRef}
      aria-roledescription="carousel"
      aria-label="Colección editorial destacada"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={handleBlurCapture}
      onKeyDown={handleKeyDown}
      className="mx-auto max-w-[1680px] px-4 pt-12 sm:px-6 lg:px-8"
    >
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          backgroundColor: palette.bg,
          borderColor: palette.border,
          color: palette.text,
        }}
        className="relative min-h-[580px] overflow-hidden rounded-2xl border transition-colors duration-700 ease-out lg:min-h-[520px]"
      >
        {/* Iluminación radial de estudio detrás del zapato */}
        <div
          aria-hidden="true"
          style={{
            background: `radial-gradient(circle at 72% 48%, ${palette.spotlight} 0%, transparent 64%)`,
          }}
          className="pointer-events-none absolute inset-0 transition-opacity duration-700"
        />

        {/* Contenido principal con altura fija para CLS < 0.05 */}
        <div className="relative z-10 grid min-h-[520px] grid-cols-1 items-center gap-8 px-6 pb-16 pt-8 sm:px-10 sm:pt-10 lg:min-h-[520px] lg:grid-cols-12 lg:gap-10 lg:px-16 lg:pb-16 lg:pt-12">
          {/* Columna izquierda: tipografía editorial */}
          <div className="order-2 flex flex-col justify-center lg:order-1 lg:col-span-6">
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={current.id}
                initial={
                  reducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, x: direction * 20 }
                }
                animate={{ opacity: 1, x: 0 }}
                exit={
                  reducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, x: direction * -16 }
                }
                transition={{
                  duration: reducedMotion ? 0.15 : 0.45,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="space-y-5"
              >
                {/* Micro-etiqueta y contador */}
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    style={{ color: palette.muted }}
                    className="font-display text-[10px] font-semibold uppercase tracking-nav"
                  >
                    {microLabel}
                  </span>
                  <span
                    aria-hidden="true"
                    style={{ backgroundColor: palette.border }}
                    className="h-3 w-px"
                  />
                  <span
                    style={{ color: palette.accent }}
                    className="font-display text-[10px] font-semibold uppercase tracking-nav tabular-nums"
                  >
                    {formatCounter(safeIndex, count)}
                  </span>
                </div>

                {/* Marca + Modelo */}
                <div className="space-y-2">
                  <p
                    style={{ color: palette.muted }}
                    className="font-display text-xs font-semibold uppercase tracking-nav"
                  >
                    {current.brand}
                  </p>
                  <h2 className="max-w-xl font-display text-2xl font-semibold uppercase leading-[1.06] tracking-tight sm:text-4xl lg:text-[2.75rem]">
                    {current.name}
                  </h2>
                </div>

                {/* Descripción corta */}
                <p
                  style={{ color: palette.muted }}
                  className="line-clamp-3 max-w-lg text-sm leading-relaxed"
                >
                  {current.shortDescription}
                </p>

                {/* Precio formateado COP */}
                <div className="flex flex-wrap items-baseline gap-3 pt-1">
                  <span className="font-display text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
                    {formatCop(current.finalPriceCop)}
                  </span>
                  {current.hasDiscount && (
                    <>
                      <span
                        style={{ color: palette.muted }}
                        className="font-display text-sm line-through opacity-75 tabular-nums"
                      >
                        {formatCop(current.originalPriceCop)}
                      </span>
                      <span
                        style={{
                          backgroundColor: palette.controlBg,
                          borderColor: palette.controlBorder,
                          color: palette.accent,
                        }}
                        className="rounded-full border px-2.5 py-0.5 font-display text-[10px] font-semibold uppercase tracking-nav"
                      >
                        -{current.discountPercent}% OFF
                      </span>
                    </>
                  )}
                </div>

                {/* CTA minimalista */}
                <div className="pt-2">
                  <Link
                    to={`/producto/${current.slug}`}
                    style={{
                      backgroundColor: palette.ctaBg,
                      color: palette.ctaText,
                    }}
                    className="inline-flex h-12 items-center gap-2.5 rounded-full px-7 font-display text-[11px] font-semibold uppercase tracking-nav transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    <span>Explorar silueta</span>
                    <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  </Link>
                </div>
              </m.div>
            </AnimatePresence>
          </div>

          {/* Columna derecha: zapato protagonista con foco de estudio y sombra de piso */}
          <div className="order-1 flex items-center justify-center lg:order-2 lg:col-span-6">
            <div className="relative flex w-full max-w-[300px] items-center justify-center sm:max-w-[340px] lg:max-w-[370px]">
              {/* Halo de luz de estudio detrás del calzado */}
              <div
                aria-hidden="true"
                style={{
                  background: `radial-gradient(circle, ${palette.spotlight} 0%, transparent 72%)`,
                }}
                className="pointer-events-none absolute -inset-8 rounded-full opacity-90 blur-2xl"
              />

              <AnimatePresence mode="wait" initial={false}>
                <m.div
                  key={current.id}
                  initial={
                    reducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: 16, scale: 0.96 }
                  }
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={
                    reducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: -12, scale: 0.97 }
                  }
                  transition={{
                    duration: reducedMotion ? 0.15 : 0.55,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="relative w-full"
                >
                  <Link
                    to={`/producto/${current.slug}`}
                    aria-label={`Ver detalles de ${current.brand} ${current.name}`}
                    className="group block focus-visible:outline-2 focus-visible:outline-offset-4"
                  >
                    <div
                      style={{ borderColor: palette.border }}
                      className="overflow-hidden rounded-xl border shadow-[0_24px_48px_rgba(0,0,0,0.28)] transition-transform duration-500 ease-out group-hover:-translate-y-1"
                    >
                      <ProductImage
                        images={current.images}
                        alt={`${current.brand} ${current.name}`}
                        priority={safeIndex === 0}
                        sizes="(max-width: 1024px) 85vw, 370px"
                        className="aspect-[4/5] w-full"
                      />
                    </div>
                  </Link>

                  {/* Sombra de piso suave tipo estudio */}
                  <div
                    aria-hidden="true"
                    className={[
                      "pointer-events-none mx-auto mt-4 h-4 w-3/4 rounded-full blur-xl",
                      palette.isLight ? "bg-slate-900/20" : "bg-black/60",
                    ].join(" ")}
                  />
                </m.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Flechas laterales discretas */}
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Silueta anterior"
              style={{
                backgroundColor: palette.controlBg,
                borderColor: palette.controlBorder,
                color: palette.text,
              }}
              className="absolute left-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur-sm transition-opacity hover:opacity-75 cursor-pointer sm:inline-flex"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Siguiente silueta"
              style={{
                backgroundColor: palette.controlBg,
                borderColor: palette.controlBorder,
                color: palette.text,
              }}
              className="absolute right-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur-sm transition-opacity hover:opacity-75 cursor-pointer sm:inline-flex"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            </button>
          </>
        )}

        {/* Indicadores inferiores minimalistas + progreso de 6s */}
        {count > 1 && (
          <div className="absolute inset-x-0 bottom-5 z-20 flex items-center justify-between px-6 sm:justify-center sm:px-10">
            <div
              role="tablist"
              aria-label="Seleccionar silueta del carrusel"
              className="flex items-center gap-2"
            >
              {products.map((item, idx) => {
                const isActive = idx === safeIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Ver ${item.brand} ${item.name} (${idx + 1} de ${count})`}
                    onClick={() => goTo(idx)}
                    style={{
                      backgroundColor: palette.controlBorder,
                    }}
                    className={[
                      "relative h-1.5 overflow-hidden rounded-full transition-[width] duration-300 cursor-pointer",
                      isActive ? "w-10" : "w-2.5 hover:opacity-80",
                    ].join(" ")}
                  >
                    {isActive && (
                      <m.span
                        key={`${item.id}-${paused ? "paused" : "play"}`}
                        initial={{ scaleX: reducedMotion || paused ? 1 : 0 }}
                        animate={{ scaleX: 1 }}
                        transition={
                          reducedMotion || paused
                            ? { duration: 0 }
                            : { duration: AUTOPLAY_MS / 1000, ease: "linear" }
                        }
                        style={{
                          backgroundColor: palette.text,
                          transformOrigin: "left center",
                        }}
                        className="absolute inset-0 block rounded-full"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Flechas compactas para móvil */}
            <div className="flex items-center gap-2 sm:hidden">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Silueta anterior"
                style={{
                  backgroundColor: palette.controlBg,
                  borderColor: palette.controlBorder,
                  color: palette.text,
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Siguiente silueta"
                style={{
                  backgroundColor: palette.controlBg,
                  borderColor: palette.controlBorder,
                  color: palette.text,
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function EditorialSneakerCarousel({
  initialProducts,
}: {
  initialProducts?: ProductSummaryDto[];
}) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.products({ sort: "recommended", page: 0, pageSize: 15 }),
    queryFn: () =>
      publicApi.getProducts({ sort: "recommended", page: 0, pageSize: 15 }),
    enabled: !initialProducts,
  });

  const curated = useMemo(
    () => curateShowcaseProducts(initialProducts ?? data?.items ?? [], SHOWCASE_LIMIT),
    [initialProducts, data?.items],
  );

  if (!initialProducts && isLoading) {
    return <EditorialShowcaseSkeleton />;
  }

  if (curated.length === 0) {
    return null;
  }

  return (
    <MotionScope>
      <CarouselInner products={curated} />
    </MotionScope>
  );
}
