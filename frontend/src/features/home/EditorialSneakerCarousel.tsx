import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type TouchEvent,
} from "react";
import { Link } from "react-router";
import { KastLogo } from "@/components/brand/KastLogo";
import { MotionScope } from "@/components/motion/MotionScope";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatCop } from "@/lib/money";
import { publicApi, queryKeys } from "@/lib/queries";
import type { ProductSummaryDto } from "@/lib/types";

const AUTOPLAY_MS = 6500;
const SHOWCASE_LIMIT = 6;
const SWIPE_THRESHOLD_PX = 40;
const EASE = [0.2, 0, 0, 1] as const;

/** Color de fondo de cada lámina (tonos profundos de la marca). */
const SLIDE_TONES = ["#1F3A2E", "#1B2A44", "#5C1F2A", "#2E241C", "#161616", "#3E4A2A"] as const;
/** Fondo de las fotos de producto: el arco lo iguala para que no se vea el recorte. */
const PHOTO_BG = "#ECECEA";
const RESPONSIVE_FILE = /^(.*)\.(480|960|1440)\.(webp|avif)$/;

/**
 * Selecciona hasta `limit` siluetas reales priorizando variedad de marca
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

const pad = (n: number) => String(n).padStart(2, "0");

function photoSrc(p: ProductSummaryDto, width: 480 | 960 = 960) {
  const file = p.images?.ready ? p.images.files[0] : undefined;
  if (!file) return null;
  const match = RESPONSIVE_FILE.exec(file);
  const stem = match ? match[1] : null;
  return {
    src: stem ? `${p.images.basePath}${stem}.${width}.webp` : `${p.images.basePath}${file}`,
    srcSet: stem
      ? [480, 960, 1440].map((w) => `${p.images.basePath}${stem}.${w}.webp ${w}w`).join(", ")
      : undefined,
  };
}

function silhouetteLabel(s: string) {
  if (s === "HIGH") return "Caña alta";
  if (s === "MID") return "Caña media";
  return "Perfil bajo";
}

function EditorialShowcaseSkeleton() {
  return (
    <section
      aria-label="Colección editorial destacada"
      className="mx-auto max-w-[1680px] px-4 pt-14 sm:px-6 lg:px-8"
    >
      <Skeleton className="mb-5 h-6 w-64" />
      <Skeleton className="min-h-[600px] w-full lg:min-h-[560px]" />
    </section>
  );
}

function CarouselInner({ products }: { products: ProductSummaryDto[] }) {
  const reducedMotion = useReducedMotion() ?? false;
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);

  const count = products.length;
  const safeIndex = count > 0 ? activeIndex % count : 0;
  const current = products[safeIndex];
  const tone = SLIDE_TONES[safeIndex % SLIDE_TONES.length];
  const photo = current ? photoSrc(current) : null;

  const goTo = useCallback(
    (nextIndex: number, dir?: 1 | -1) => {
      if (count <= 1) return;
      const normalized = ((nextIndex % count) + count) % count;
      setDirection(dir ?? (normalized >= safeIndex ? 1 : -1));
      setActiveIndex(normalized);
    },
    [count, safeIndex],
  );
  const handleNext = useCallback(() => goTo(safeIndex + 1, 1), [goTo, safeIndex]);
  const handlePrev = useCallback(() => goTo(safeIndex - 1, -1), [goTo, safeIndex]);

  const running = !paused && !reducedMotion && count > 1;

  const handleBlurCapture = (e: FocusEvent<HTMLElement>) => {
    if (!sectionRef.current?.contains(e.relatedTarget as Node | null)) setPaused(false);
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
    const delta = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    if (delta < 0) handleNext();
    else handlePrev();
  };

  // Precarga de la siguiente foto
  useEffect(() => {
    if (count < 2) return;
    const next = photoSrc(products[(safeIndex + 1) % count]);
    if (!next) return;
    const img = new Image();
    if (next.srcSet) img.srcset = next.srcSet;
    img.src = next.src;
  }, [count, products, safeIndex]);

  if (!current) return null;

  const textMotion = {
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, x: direction * 28 },
    animate: { opacity: 1, x: 0 },
    exit: reducedMotion ? { opacity: 0 } : { opacity: 0, x: direction * -20 },
    transition: { duration: reducedMotion ? 0.15 : 0.5, ease: EASE },
  };

  const arrowBtn =
    "flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-ink/15 bg-canvas text-ink transition-all duration-300 hover:-translate-y-0.5 hover:border-ink hover:bg-ink hover:text-canvas";

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
      className="mx-auto max-w-[1680px] px-4 pt-14 sm:px-6 lg:px-8"
    >
      {/* Encabezado de sección */}
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            Colección de la semana
          </p>
          <h2 className="mt-1 font-display font-expanded text-xl font-black uppercase tracking-[-0.02em] text-ink sm:text-2xl">
            Selección Key Street
          </h2>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={handlePrev} aria-label="Silueta anterior" className={arrowBtn}>
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button type="button" onClick={handleNext} aria-label="Siguiente silueta" className={arrowBtn}>
            <ChevronRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Lámina */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ backgroundColor: tone }}
        className="relative overflow-hidden text-white transition-colors duration-700"
      >
        {/* Número gigante de fondo */}
        <AnimatePresence initial={false}>
          <m.span
            key={`n-${current.id}`}
            aria-hidden="true"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="text-outline pointer-events-none absolute -bottom-[0.18em] left-4 select-none font-display font-expanded text-[clamp(9rem,22vw,20rem)] font-black leading-none sm:left-8"
            style={{ "--outline-color": "rgba(255,255,255,0.13)", "--outline-w": "2px" } as CSSProperties}
          >
            {pad(safeIndex + 1)}
          </m.span>
        </AnimatePresence>

        <div className="relative grid min-h-[600px] grid-cols-1 items-center gap-8 px-6 py-10 sm:px-10 lg:min-h-[560px] lg:grid-cols-12 lg:gap-6 lg:px-14 lg:py-12">
          {/* Texto */}
          <div className="order-2 lg:order-1 lg:col-span-6">
            <AnimatePresence mode="wait" initial={false}>
              <m.div key={current.id} {...textMotion} className="space-y-5">
                <p className="flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-[0.14em] text-white/60">
                  <span className="tabular-nums text-white">{`${pad(safeIndex + 1)} / ${pad(count)}`}</span>
                  <span aria-hidden="true" className="h-3 w-px bg-white/25" />
                  <span>{current.badge ?? "Curaduría Key Street"}</span>
                  <span aria-hidden="true">·</span>
                  <span>{silhouetteLabel(current.silhouette)}</span>
                </p>

                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#c9e265]">
                    {current.brand}
                  </p>
                  <h3 className="mt-2 max-w-xl font-display font-expanded text-3xl font-black uppercase leading-[0.95] tracking-[-0.02em] sm:text-4xl lg:text-[2.9rem]">
                    {current.name}
                  </h3>
                </div>

                <p className="line-clamp-3 max-w-md text-sm leading-relaxed text-white/70">
                  {current.shortDescription}
                </p>

                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-display text-2xl font-bold tabular-nums">
                    {formatCop(current.finalPriceCop)}
                  </span>
                  {current.hasDiscount && (
                    <>
                      <span className="font-mono text-sm text-white/45 line-through tabular-nums">
                        {formatCop(current.originalPriceCop)}
                      </span>
                      <span className="bg-[#c9e265] px-2 py-0.5 font-mono text-[11px] font-semibold text-ink">
                        −{current.discountPercent}%
                      </span>
                    </>
                  )}
                </div>

                <Link
                  to={`/producto/${current.slug}`}
                  className="group relative isolate inline-flex h-12 items-center gap-2 overflow-hidden bg-white px-6 font-display text-[11px] font-semibold uppercase tracking-nav text-ink"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 origin-left scale-x-0 bg-[#c9e265] transition-transform duration-500 ease-editorial group-hover:scale-x-100"
                  />
                  Explorar silueta
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5"
                    aria-hidden="true"
                  />
                </Link>
              </m.div>
            </AnimatePresence>
          </div>

          {/* Foto dentro de un arco del mismo gris que el fondo de la foto */}
          <div className="order-1 flex justify-center lg:order-2 lg:col-span-6 lg:justify-end">
            <div
              className="relative aspect-[4/5] w-[min(78vw,380px)] overflow-hidden rounded-t-[999px] lg:w-[min(32vw,420px)]"
              style={{ backgroundColor: PHOTO_BG }}
            >
              <AnimatePresence initial={false} mode="popLayout">
                <m.div
                  key={current.id}
                  className="absolute inset-0"
                  initial={
                    reducedMotion
                      ? { opacity: 0 }
                      : { clipPath: "inset(100% 0% 0% 0%)", scale: 1.12 }
                  }
                  animate={{ clipPath: "inset(0% 0% 0% 0%)", scale: 1, opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.3, delay: 0.25 } }}
                  transition={{ duration: 0.8, ease: EASE }}
                >
                  {photo ? (
                    <img
                      src={photo.src}
                      srcSet={photo.srcSet}
                      sizes="(min-width: 1024px) 32vw, 78vw"
                      alt={current.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-ink/10">
                      <KastLogo variant="isotype" size={120} title={current.name} />
                    </div>
                  )}
                </m.div>
              </AnimatePresence>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-ink px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white">
                {current.colorway ?? current.brand}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Miniaturas con progreso */}
      <div
        role="tablist"
        aria-label="Elegir silueta"
        className="no-scrollbar mt-3 flex gap-2 overflow-x-auto"
      >
        {products.map((p, i) => {
          const selected = i === safeIndex;
          const thumb = photoSrc(p, 480);
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-label={`Ver ${p.name}`}
              onClick={() => goTo(i)}
              className={`group relative flex min-w-[10.5rem] flex-1 cursor-pointer items-center gap-3 border p-2 text-left transition-colors ${
                selected ? "border-ink bg-white" : "border-line bg-white/50 hover:border-ink/40"
              }`}
            >
              <span
                className="h-12 w-10 shrink-0 overflow-hidden"
                style={{ backgroundColor: PHOTO_BG }}
              >
                {thumb && (
                  <img src={thumb.src} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                  {pad(i + 1)} · {p.brand}
                </span>
                <span className="block truncate text-[11px] font-semibold text-ink">
                  {p.name.replace(/\s*\(.*\)$/, "")}
                </span>
              </span>
              {selected && (
                <span
                  key={`bar-${safeIndex}`}
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-ink"
                  style={{
                    animation: reducedMotion ? undefined : `ks-progress ${AUTOPLAY_MS}ms linear forwards`,
                    animationPlayState: running ? "running" : "paused",
                  }}
                  onAnimationEnd={handleNext}
                />
              )}
            </button>
          );
        })}
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
    queryFn: () => publicApi.getProducts({ sort: "recommended", page: 0, pageSize: 15 }),
    enabled: !initialProducts,
  });

  const curated = useMemo(
    () => curateShowcaseProducts(initialProducts ?? data?.items ?? [], SHOWCASE_LIMIT),
    [initialProducts, data?.items],
  );

  if (!initialProducts && isLoading) return <EditorialShowcaseSkeleton />;
  if (curated.length === 0) return null;

  return (
    <MotionScope>
      <CarouselInner products={curated} />
    </MotionScope>
  );
}
