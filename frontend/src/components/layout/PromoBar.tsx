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
    <div className="bg-forest text-white">
      <div className="mx-auto flex min-h-8 max-w-7xl items-center justify-center px-4 py-1.5 text-center text-[11px] font-medium tracking-wide">
        {text}
      </div>
    </div>
  );
}
