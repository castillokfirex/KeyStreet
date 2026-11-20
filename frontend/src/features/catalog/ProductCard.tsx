import { Heart, Plus } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/Badge";
import { PriceTag } from "@/components/ui/PriceTag";
import type { ProductSummaryDto } from "@/lib/types";
import { useCartStore } from "@/stores/cart";
import { ProductImage } from "./ProductImage";

export function ProductCard({ product }: { product: ProductSummaryDto }) {
  const wishlist = useCartStore((s) => s.wishlist);
  const toggleWishlist = useCartStore((s) => s.toggleWishlist);
  const isFav = wishlist.includes(product.id);

  const badgeLabel =
    product.hasDiscount && product.discountPercent > 0
      ? `-${product.discountPercent}% OFF`
      : product.badge || null;

  return (
    <div className="h-full transition-transform duration-200 hover:-translate-y-0.5">
      <article
        data-testid={`product-card-${product.slug}`}
        className="group flex h-full flex-col justify-between rounded-2xl border border-line bg-canvas p-2.5 transition-colors hover:border-navy/30"
      >
        <div>
          <div className="relative">
            <Link
              to={`/producto/${product.slug}`}
              aria-label={`Ver ${product.name}`}
              className="block"
            >
              <ProductImage images={product.images} alt={product.name} />
            </Link>

            {badgeLabel && (
              <div className="pointer-events-none absolute left-2.5 top-2.5">
                <Badge tone={product.hasDiscount ? "forest" : "neutral"}>
                  {badgeLabel}
                </Badge>
              </div>
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
              className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-canvas/90 text-navy shadow-xs hover:border-navy cursor-pointer"
            >
              <Heart
                className={`h-3.5 w-3.5 ${isFav ? "fill-forest text-forest" : ""}`}
                aria-hidden="true"
              />
            </button>
          </div>

          <div className="mt-3 px-1">
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              {product.brand} · {product.silhouette}
            </p>
            <Link
              to={`/producto/${product.slug}`}
              className="mt-1 block text-xs sm:text-sm font-bold leading-snug text-navy hover:text-forest transition-colors line-clamp-2"
            >
              {product.name}
            </Link>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 pb-1">
          <PriceTag
            originalPriceCop={product.originalPriceCop}
            finalPriceCop={product.finalPriceCop}
            discountPercent={product.discountPercent}
            hasDiscount={product.hasDiscount}
            size="sm"
          />

          <Link
            to={`/producto/${product.slug}`}
            className="inline-flex items-center gap-1 rounded-full bg-navy px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-white hover:bg-forest transition-colors"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            <span>Añadir</span>
          </Link>
        </div>
      </article>
    </div>
  );
}
