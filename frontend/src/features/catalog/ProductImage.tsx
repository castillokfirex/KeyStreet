import { KastLogo } from "@/components/brand/KastLogo";
import type { ProductImages } from "@/lib/types";

/** Anchos generados por scripts/process-images: {slug}-{n}.{w}.{ext} */
const WIDTHS = [480, 960, 1440] as const;
const RESPONSIVE_FILE = /^(.+)\.(480|960|1440)\.(webp|avif)$/;

const DEFAULT_SIZES = "(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw";

function srcSet(basePath: string, stem: string, ext: "avif" | "webp") {
  return WIDTHS.map((w) => `${basePath}${stem}.${w}.${ext} ${w}w`).join(", ");
}

/**
 * Imagen de producto 4:5 sobre gris claro.
 * - images.ready === false → placeholder dibujado (cero requests, cero 404).
 * - index / view="secondary" → otra imagen de la galería (files[n]); si no
 *   existe, el placeholder alterno (solo cuando ready === false).
 * - Archivos normalizados ({slug}-{n}.{w}.{ext}) → <picture> AVIF + WebP con
 *   srcset 480/960/1440; cualquier otro nombre se sirve tal cual.
 */
export function ProductImage({
  images,
  alt,
  className = "",
  priority = false,
  view = "primary",
  index,
  sizes = DEFAULT_SIZES,
}: {
  images: ProductImages;
  alt: string;
  className?: string;
  priority?: boolean;
  view?: "primary" | "secondary";
  index?: number;
  sizes?: string;
}) {
  const position = index ?? (view === "secondary" ? 1 : 0);
  const secondary = position > 0;

  if (!images?.ready) {
    return (
      <div
        role={secondary ? undefined : "img"}
        aria-label={secondary ? undefined : `${alt} — vista previa preparada`}
        aria-hidden={secondary || undefined}
        className={`relative aspect-[4/5] w-full overflow-hidden bg-surface ${className}`.trim()}
      >
        {secondary ? (
          <>
            <div className="absolute -bottom-[12%] -right-[18%] w-[78%] text-ink/[0.07]">
              <KastLogo variant="isotype" size={256} className="h-auto w-full" title={alt} />
            </div>
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-display text-[10px] font-semibold uppercase tracking-wordmark text-ink/25">
              {alt}
            </span>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink/[0.09] select-none">
            <KastLogo variant="isotype" size={76} title={alt} />
            <span className="font-display text-[9px] font-semibold uppercase tracking-wordmark">
              KEY STREET
            </span>
          </div>
        )}
      </div>
    );
  }

  const file =
    images.files[position] ?? images.files[0] ?? "01-lateral.webp";
  const src = `${images.basePath}${file}`;
  const responsive = RESPONSIVE_FILE.exec(file);
  const imgAlt = secondary ? "" : alt;
  const imgProps = {
    alt: imgAlt,
    loading: priority ? ("eager" as const) : ("lazy" as const),
    decoding: "async" as const,
    width: 960,
    height: 1200,
    className: "h-full w-full object-cover",
  };

  return (
    <div
      className={`relative aspect-[4/5] w-full overflow-hidden bg-surface ${className}`.trim()}
    >
      {responsive ? (
        <picture className="block h-full w-full">
          <source type="image/avif" srcSet={srcSet(images.basePath, responsive[1], "avif")} sizes={sizes} />
          <source type="image/webp" srcSet={srcSet(images.basePath, responsive[1], "webp")} sizes={sizes} />
          <img src={src} {...imgProps} />
        </picture>
      ) : (
        <img src={src} sizes={sizes} {...imgProps} />
      )}
    </div>
  );
}
