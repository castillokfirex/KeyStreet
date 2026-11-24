import { ArrowUpRight } from "lucide-react";
import {
  AnimatePresence,
  m,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Link } from "react-router";
import { MotionScope } from "@/components/motion/MotionScope";
import { formatCop } from "@/lib/money";
import type { ProductSummaryDto } from "@/lib/types";

const AUTOPLAY_MS = 5500;
const RESPONSIVE_FILE = /^(.*)\.(480|960|1440)\.(webp|avif)$/;
const EASE = [0.2, 0, 0, 1] as const;

/** Acento por par: disco de fondo, letras de la marca y contador. */
const ACCENTS = ["#1f3a2e", "#7fa03a", "#b5562b", "#2f4fa8", "#5c1f2a", "#8a5a2b"] as const;

function imageSources(product: ProductSummaryDto) {
  const file = product.images.files[0];
  const match = RESPONSIVE_FILE.exec(file);
  const base = product.images.basePath;
  if (!match) return { src: `${base}${file}`, webp: undefined, avif: undefined };
  const stem = match[1];
  const set = (ext: string) =>
    [480, 960, 1440].map((w) => `${base}${stem}.${w}.${ext} ${w}w`).join(", ");
  return { src: `${base}${stem}.960.webp`, webp: set("webp"), avif: set("avif") };
}

function silhouetteLabel(s: string) {
  if (s === "HIGH") return "Caña alta";
  if (s === "MID") return "Caña media";
  return "Perfil bajo";
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Tamaño de la marca de fondo para que la palabra quepa siempre completa:
 * cada letra de Archivo expandido extra grueso ocupa ~0,95 em.
 */
export function brandFontSize(word: string): string {
  const letters = Math.max(3, word.replace(/\s/g, "").length + word.split(" ").length - 1);
  return `min(10rem, ${(94 / (letters * 0.95)).toFixed(2)}cqw)`;
}

/* ---------------------------------------------------------------------------
 * Escenario: zapato flotante con parallax, marca gigante y progreso
 * ------------------------------------------------------------------------- */

function Stage({ products }: { products: ProductSummaryDto[] }) {
  const reduceMotion = useReducedMotion() ?? false;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);

  const total = products.length;
  const product = products[index % total];
  const accent = ACCENTS[index % ACCENTS.length];
  const sources = imageSources(product);
  const running = !reduceMotion && !paused && visible && total > 1;
  const brandWord = product.brand.toUpperCase();

  // Pausa fuera de pantalla o con la pestaña oculta
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e?.isIntersecting ?? true), {
      threshold: 0.2,
    });
    io.observe(el);
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const go = useCallback((i: number) => setIndex(((i % total) + total) % total), [total]);

  // Precarga del siguiente par
  useEffect(() => {
    if (total < 2) return;
    const next = imageSources(products[(index + 1) % total]);
    const img = new Image();
    if (next.webp) img.srcset = next.webp;
    img.sizes = "(min-width: 1024px) 50vw, 90vw";
    img.src = next.src;
  }, [index, products, total]);

  // Parallax con el puntero
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 120, damping: 18, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 120, damping: 18, mass: 0.6 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-14, 14]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [9, -9]);
  const shoeX = useTransform(sx, [-0.5, 0.5], [-16, 16]);
  const typeX = useTransform(sx, [-0.5, 0.5], [24, -24]);
  const discX = useTransform(sx, [-0.5, 0.5], [10, -10]);

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduceMotion || e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onPointerLeave = () => {
    px.set(0);
    py.set(0);
  };

  const floatAnim = reduceMotion
    ? undefined
    : { y: [0, -14, 0], transition: { duration: 4.2, repeat: Infinity, ease: "easeInOut" as const } };
  const shadowAnim = reduceMotion
    ? undefined
    : {
        scaleX: [1, 0.8, 1],
        opacity: [0.3, 0.17, 0.3],
        transition: { duration: 4.2, repeat: Infinity, ease: "easeInOut" as const },
      };

  return (
    <div
      ref={stageRef}
      className="@container relative flex h-full min-h-[340px] w-full flex-col sm:min-h-[400px] lg:min-h-[min(calc(100svh-var(--ks-header-h)-3.5rem),540px)] xl:min-h-[min(calc(100svh-var(--ks-header-h)-4rem),600px)]"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="vitrina"
      aria-label="Pares destacados"
    >
      {/* Marca gigante de fondo: siempre completa, letra por letra */}
      <m.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[3%] flex justify-center"
        style={{ x: typeX }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <m.span
            key={product.id}
            className="flex select-none whitespace-pre font-display font-expanded font-black uppercase leading-none tracking-[-0.03em]"
            style={{ fontSize: brandFontSize(brandWord), color: accent }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
          >
            {brandWord.split("").map((ch, i) => (
              <m.span
                key={`${ch}-${i}`}
                className="inline-block"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: "70%", rotate: 6 }}
                animate={{ opacity: 0.16, y: 0, rotate: 0 }}
                transition={{ duration: 0.6, delay: reduceMotion ? 0 : i * 0.045, ease: EASE }}
              >
                {ch}
              </m.span>
            ))}
          </m.span>
        </AnimatePresence>
      </m.div>

      {/* Zapato flotante sobre un disco de color */}
      <div className="relative flex flex-1 items-center justify-center [perspective:1200px]">
        <m.div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[min(64%,400px)] -translate-x-1/2 -translate-y-1/2 xl:w-[min(72%,480px)]"
          style={{ x: discX }}
        >
          <div
            className="absolute inset-0 rounded-full transition-colors duration-700"
            style={{ backgroundColor: `${accent}1f` }}
          />
          <div
            className="ks-spin absolute inset-[-5%] rounded-full border border-dashed transition-colors duration-700"
            style={{ borderColor: `${accent}55` }}
          />
        </m.div>

        <m.div
          className="relative w-[min(90%,540px)] xl:w-[min(94%,640px)]"
          style={{ rotateX, rotateY, x: shoeX, transformStyle: "preserve-3d" }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={product.id}
              initial={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, x: 180, y: 50, rotate: 24, scale: 0.78 }
              }
              animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : {
                      opacity: 0,
                      x: -180,
                      y: -60,
                      rotate: -22,
                      scale: 0.86,
                      transition: { duration: 0.35, ease: [0.4, 0, 1, 1] },
                    }
              }
              transition={{ type: "spring", stiffness: 110, damping: 14, mass: 0.9 }}
            >
              <m.div animate={floatAnim}>
                <picture>
                  {sources.avif && (
                    <source type="image/avif" srcSet={sources.avif} sizes="(min-width: 1024px) 50vw, 90vw" />
                  )}
                  {sources.webp && (
                    <source type="image/webp" srcSet={sources.webp} sizes="(min-width: 1024px) 50vw, 90vw" />
                  )}
                  <img
                    src={sources.src}
                    alt={product.name}
                    width={960}
                    height={1200}
                    fetchPriority={index === 0 ? "high" : "auto"}
                    decoding="async"
                    draggable={false}
                    className="pointer-events-none mx-auto aspect-[16/10] max-h-[42svh] w-full -rotate-[7deg] select-none object-cover mix-blend-multiply [mask-image:radial-gradient(ellipse_58%_52%_at_50%_52%,#000_70%,transparent_100%)] lg:max-h-[46svh] xl:max-h-[52svh]"
                  />
                </picture>
              </m.div>
            </m.div>
          </AnimatePresence>

          <m.div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-[6%] left-1/2 h-6 w-[56%] -translate-x-1/2 rounded-[50%] bg-ink blur-xl"
            style={{ opacity: 0.3 }}
            animate={shadowAnim}
          />
        </m.div>
      </div>

      {/* Ficha del par + progreso */}
      <div className="relative z-10 mt-auto">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div aria-live="polite" className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              <span style={{ color: accent }} className="font-semibold">
                {pad(index + 1)}
              </span>{" "}
              / {pad(total)} · {product.brand} · {silhouetteLabel(product.silhouette)}
            </p>
            <p className="mt-1 truncate font-display text-lg font-bold uppercase leading-tight text-ink sm:text-xl">
              {product.name}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-sm text-ink">
              <span>{formatCop(product.finalPriceCop)}</span>
              {product.hasDiscount && (
                <>
                  <span className="text-xs text-gray line-through">{formatCop(product.originalPriceCop)}</span>
                  <span className="bg-[#c9e265] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink">
                    −{product.discountPercent}%
                  </span>
                </>
              )}
            </p>
          </div>
          <Link
            to={`/producto/${product.slug}`}
            className="group inline-flex items-center gap-1.5 border-b border-ink pb-1 font-display text-[11px] font-semibold uppercase tracking-nav text-ink hover:text-forest"
          >
            Ver este par
            <ArrowUpRight
              className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </Link>
        </div>

        {total > 1 && (
          <div className="mt-4 flex gap-1.5" role="group" aria-label="Elegir par">
            {products.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Ver ${p.name}`}
                aria-current={i === index ? "true" : undefined}
                className="group relative h-6 flex-1 cursor-pointer"
              >
                <span className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-ink/12 transition-colors group-hover:bg-ink/30" />
                {i < index && <span className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-ink/45" />}
                {i === index && (
                  <span
                    key={`${p.id}-${index}`}
                    className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 origin-left"
                    style={{
                      backgroundColor: accent,
                      animation: reduceMotion ? undefined : `ks-progress ${AUTOPLAY_MS}ms linear forwards`,
                      animationPlayState: running ? "running" : "paused",
                    }}
                    onAnimationEnd={() => go(index + 1)}
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Vitrina animada (carga diferida para no inflar el JS inicial de Home). */
export default function HeroStage({ products }: { products: ProductSummaryDto[] }) {
  return (
    <MotionScope>
      <Stage products={products} />
    </MotionScope>
  );
}
