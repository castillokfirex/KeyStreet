import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { lazy, Suspense } from "react";
import { Link } from "react-router";
import { TrustStrip } from "@/components/layout/TrustStrip";
import { Skeleton } from "@/components/ui/Skeleton";
import { CollectionChips } from "@/features/catalog/CollectionChips";
import { ProductCard } from "@/features/catalog/ProductCard";
import { publicApi, queryKeys } from "@/lib/queries";
import { HeroShowcase } from "./HeroShowcase";

const LazyEditorialSneakerCarousel = lazy(() =>
  import("./EditorialSneakerCarousel").then((m) => ({
    default: m.EditorialSneakerCarousel,
  })),
);

const LazyStyleWall = lazy(() =>
  import("./StyleWall").then((m) => ({ default: m.StyleWall })),
);

function CarouselFallback() {
  return (
    <section
      aria-hidden="true"
      className="mx-auto max-w-[1680px] px-4 pt-8 sm:px-6 sm:pt-10 lg:px-8 lg:pt-12"
    >
      <Skeleton className="min-h-[460px] w-full rounded-2xl lg:min-h-[min(calc(100svh-11.5rem),520px)]" />
    </section>
  );
}

export function HomePage() {
  const { data: featured, isLoading } = useQuery({
    queryKey: queryKeys.products({ sort: "recommended", page: 0, pageSize: 4 }),
    queryFn: () =>
      publicApi.getProducts({ sort: "recommended", page: 0, pageSize: 4 }),
  });

  return (
    <div>
      {/* Hero: zapato flotante con parallax (sin cargas 3D ni ML) */}
      <HeroShowcase />

      {/* Carrusel editorial de colección (lazy para proteger budget de Home) */}
      <Suspense fallback={<CarouselFallback />}>
        <LazyEditorialSneakerCarousel />
      </Suspense>

      {/* Drops destacados */}
      <section className="mx-auto max-w-[1680px] pt-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div>
            <p className="font-display text-[10px] font-semibold uppercase tracking-nav text-sale-text">
              Selección especial · Descuentos vigentes
            </p>
            <h2 className="mt-1 font-display text-sm font-semibold uppercase tracking-nav text-ink">
              Drops destacados
            </h2>
          </div>
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-1 font-display text-[10px] font-semibold uppercase tracking-nav text-ink underline underline-offset-4 hover:opacity-60"
          >
            <span>Ver los 15 pares</span>
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
          </Link>
        </div>

        <div className="mb-6 px-4 sm:px-6 lg:px-8">
          <CollectionChips />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-[var(--ks-grid-gap)] md:grid-cols-4" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] w-full" />
            ))}
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-[var(--ks-grid-gap)] md:grid-cols-4" aria-label="Drops destacados">
            {(featured?.items ?? []).map((product, idx) => (
              <li key={product.id}>
                <ProductCard product={product} eager={idx < 2} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Muro negro de pósters: frases, marcas y escenas de Kast */}
      <Suspense fallback={<div className="mt-10 h-[520px] bg-ink sm:mt-14" aria-hidden="true" />}>
        <LazyStyleWall />
      </Suspense>

      <TrustStrip />
    </div>
  );
}
