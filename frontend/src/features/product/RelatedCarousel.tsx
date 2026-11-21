import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/features/catalog/ProductCard";
import { publicApi, queryKeys } from "@/lib/queries";

export function RelatedCarousel({ slug }: { slug: string }) {
  const { data: related = [] } = useQuery({
    queryKey: queryKeys.related(slug),
    queryFn: () => publicApi.getRelated(slug, 4),
    enabled: Boolean(slug),
  });

  if (related.length === 0) return null;

  return (
    <section
      aria-label="Productos relacionados"
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 border-t border-line"
    >
      <div className="mb-6">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-forest">
          Atelier Capsule 2026
        </p>
        <h2 className="mt-1 font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-navy">
          Esto te puede gustar
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:gap-5 md:grid-cols-4">
        {related.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
