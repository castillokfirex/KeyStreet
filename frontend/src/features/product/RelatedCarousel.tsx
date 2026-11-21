import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/features/catalog/ProductCard";
import { publicApi, queryKeys } from "@/lib/queries";

/** "Esto te puede gustar": misma tarjeta del catálogo; carrusel en móvil, rejilla en desktop. */
export function RelatedCarousel({ slug }: { slug: string }) {
  const { data: related = [] } = useQuery({
    queryKey: queryKeys.related(slug),
    queryFn: () => publicApi.getRelated(slug, 4),
    enabled: Boolean(slug),
  });

  if (related.length === 0) return null;

  return (
    <section aria-label="Productos relacionados" className="mx-auto max-w-[1680px] pt-16">
      <div className="mb-4 px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-[11px] font-semibold uppercase tracking-nav text-ink">
          Esto te puede gustar
        </h2>
      </div>

      <ul className="no-scrollbar grid snap-x snap-mandatory auto-cols-[46%] grid-flow-col gap-[var(--ks-grid-gap)] overflow-x-auto md:auto-cols-auto md:grid-flow-row md:grid-cols-4 md:overflow-visible">
        {related.map((product) => (
          <li key={product.id} className="snap-start">
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  );
}
