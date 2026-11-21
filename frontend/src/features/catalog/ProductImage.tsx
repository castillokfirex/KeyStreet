import { KastLogo } from "@/components/brand/KastLogo";
import type { ProductImages } from "@/lib/types";

export function ProductImage({
  images,
  alt,
  className = "",
  priority = false,
}: {
  images: ProductImages;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  if (!images?.ready) {
    return (
      <div
        className={`relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-surface flex items-center justify-center ${className}`.trim()}
        aria-label={`${alt} — vista previa preparada`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-surface via-canvas/40 to-surface" />
        <div className="relative flex flex-col items-center gap-2 text-navy/[0.08] select-none">
          <KastLogo variant="isotype" size={76} title={alt} />
          <span className="font-display text-[9px] font-bold uppercase tracking-[0.28em]">
            KEY STREET
          </span>
        </div>
      </div>
    );
  }

  const primaryFile = images.files[0] || "01-lateral.webp";
  const src = `${images.basePath}${primaryFile}`;

  return (
    <div
      className={`relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-surface ${className}`.trim()}
    >
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      />
    </div>
  );
}
