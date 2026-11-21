import { KastLogo } from "@/components/brand/KastLogo";
import type { ProductImages } from "@/lib/types";

/**
 * Imagen de producto 4:5 sobre gris claro.
 * - images.ready === false → placeholder dibujado (cero requests, cero 404).
 * - view="secondary" → segunda foto (files[1]) o una composición alterna del
 *   placeholder, para el cambio de imagen en hover / swipe.
 */
export function ProductImage({
  images,
  alt,
  className = "",
  priority = false,
  view = "primary",
}: {
  images: ProductImages;
  alt: string;
  className?: string;
  priority?: boolean;
  view?: "primary" | "secondary";
}) {
  const secondary = view === "secondary";

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

  const file = secondary
    ? images.files[1] || images.files[0]
    : images.files[0] || "01-lateral.webp";
  const src = `${images.basePath}${file}`;

  return (
    <div
      className={`relative aspect-[4/5] w-full overflow-hidden bg-surface ${className}`.trim()}
    >
      <img
        src={src}
        alt={secondary ? "" : alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
        className="h-full w-full object-cover"
      />
    </div>
  );
}
