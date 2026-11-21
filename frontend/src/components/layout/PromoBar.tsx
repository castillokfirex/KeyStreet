import { useQuery } from "@tanstack/react-query";
import { publicApi, queryKeys } from "@/lib/queries";

export function PromoBar() {
  const { data: tenant } = useQuery({
    queryKey: queryKeys.tenant,
    queryFn: publicApi.getTenant,
  });

  const text =
    tenant?.branding?.promoBar ||
    "Envíos express gratis a toda Colombia por compras superiores a $300.000 COP";

  return (
    <div className="bg-ink text-canvas" role="region" aria-label="Anuncio">
      <p className="mx-auto flex min-h-8 max-w-[1680px] items-center justify-center px-4 py-1.5 text-center font-display text-[10px] font-medium uppercase tracking-label">
        {text}
      </p>
    </div>
  );
}
