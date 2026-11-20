import { useQuery } from "@tanstack/react-query";
import { publicApi, queryKeys } from "@/lib/queries";

export function PromoBar() {
  const { data: tenant } = useQuery({
    queryKey: queryKeys.tenant,
    queryFn: publicApi.getTenant,
  });

  const text =
    tenant?.branding?.promoBar ||
    "Envíos express gratis a toda Colombia por compras superiores a $300.000 COP · Despachos 24–48 h";

  return (
    <div className="bg-forest text-white">
      <div className="mx-auto max-w-7xl px-4 py-2 text-center text-[11px] font-medium tracking-wide">
        {text}
      </div>
    </div>
  );
}
