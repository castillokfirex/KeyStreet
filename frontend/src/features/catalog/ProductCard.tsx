import { Heart } from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router";
import { PriceTag } from "@/components/ui/PriceTag";
import type { ProductSummaryDto } from "@/lib/types";
import { useCartStore } from "@/stores/cart";
import { ProductImage } from "./ProductImage";

/**
 * Tarjeta editorial: sin caja, sin borde y sin botón "Añadir".
 * - Desktop: crossfade a la segunda imagen en hover (ambas en DOM = precarga).
 * - Táctil: carrusel con scroll-snap y puntos indicadores.
 * Estilos de interacción en index.css (.ks-card*).
 */
export function ProductCard({
  product,
  eager = false,
}: {
  product: ProductSummaryDto;
  eager?: boolean;
}) {
  const wishlist = useCartStore((s) => s.wishlist);
  const toggleWishlist = useCartStore((s) => s.toggleWishlist);
  const isFav = wishlist.includes(product.id);
  const trackRef = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0);

  const badgeLabel =
    product.hasDiscount && product.discountPercent > 0
      ? `-${product.discountPercent}% OFF`
      : product.badge || null;

  // Con fotos reales solo hay segunda vista si existe un segundo archivo
  const hasSecondView = !product.images?.ready || product.images.files.length > 1;
  const href = `/producto/${product.slug}`;

  const onScroll = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setSlide(Math.round(track.scrollLeft / track.clientWidth));
  };

  return (
    <article
      data-testid={`product-card-${product.slug}`}
      className="ks-card relative min-w-0"
    >
      <Link to={href} aria-label={`Ver ${product.name}`} className="block focus-visible:outline-offset-[-2px]">
        <div className="relative aspect-[4/5] overflow-hidden bg-surface">
          <div ref={trackRef} className="ks-card-track" onScroll={onScroll}>
            <div className="ks-card-slide">
              <ProductImage images={product.images} alt={product.name} priority={eager} />
            </div>
            {hasSecondView && (
              <div className="ks-card-slide">
                <ProductImage images={product.images} alt={product.name} view="secondary" />
              </div>
            )}
          </div>

          {hasSecondView && (
            <div
              aria-hidden="true"
              className="ks-card-dots pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1"
            >
              {[0, 1].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${i === slide ? "bg-ink" : "bg-gray/50"}`}
                />
              ))}
            </div>
          )}
        </div>
      </Link>

      {badgeLabel && (
        <span
          className={`pointer-events-none absolute left-3 top-3 font-display text-[10px] font-semibold uppercase tracking-nav ${product.hasDiscount ? "text-sale-text" : "text-ink"}`}
        >
          {badgeLabel}
        </span>
      )}

      <button
        type="button"
        onClick={() => toggleWishlist(product.id)}
        aria-label={
          isFav
            ? `Quitar ${product.name} de favoritos`
            : `Guardar ${product.name} en favoritos`
        }
        aria-pressed={isFav}
        className="ks-card-fav absolute right-1 top-1 flex h-10 w-10 items-center justify-center text-ink transition-opacity cursor-pointer"
      >
        <Heart
          className={`h-4 w-4 ${isFav ? "fill-current" : ""}`}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </button>

      <div className="flex flex-col gap-1 px-3 pb-6 pt-3">
        <Link
          to={href}
          className="font-display text-[11px] font-semibold uppercase leading-tight tracking-label text-ink line-clamp-2 hover:underline underline-offset-2"
        >
          {product.name}
        </Link>
        <PriceTag
          originalPriceCop={product.originalPriceCop}
          finalPriceCop={product.finalPriceCop}
          discountPercent={product.discountPercent}
          hasDiscount={product.hasDiscount}
          size="sm"
        />
      </div>
    </article>
  );
}
