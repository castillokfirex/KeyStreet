import { useQuery } from "@tanstack/react-query";
import { publicApi, queryKeys } from "@/lib/queries";

export function PromoBar({ visible = true }: { visible?: boolean }) {
  const { data: tenant } = useQuery({
    queryKey: queryKeys.tenant,
    queryFn: publicApi.getTenant,
  });

  const text =
    tenant?.branding?.promoBar ||
    "Envíos express gratis a toda Colombia por compras superiores a $300.000 COP";

  return (
    <div
      role="region"
      aria-label="Anuncio"
      aria-hidden={!visible}
      className={[
        "overflow-hidden bg-ink text-canvas transition-[max-height,opacity] duration-300",
        visible ? "max-h-12 opacity-100" : "max-h-0 opacity-0 pointer-events-none",
      ].join(" ")}
    >
      <p className="mx-auto flex min-h-8 max-w-[1680px] items-center justify-center px-4 py-1.5 text-center font-display text-[10px] font-medium uppercase tracking-label">
        {text}
      </p>
    </div>
  );
}
