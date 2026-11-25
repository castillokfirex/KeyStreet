import { useQuery } from "@tanstack/react-query";
import { publicApi, queryKeys } from "@/lib/queries";

const BRANDS = [
  "NIKE",
  "ADIDAS",
  "JORDAN",
  "NEW BALANCE",
  "CONVERSE",
  "VANS",
  "PUMA",
];

export function PromoBar({ visible = true }: { visible?: boolean }) {
  const { data: tenant } = useQuery({
    queryKey: queryKeys.tenant,
    queryFn: publicApi.getTenant,
  });

  const promoText =
    tenant?.branding?.promoBar ||
    "Envíos express gratis a toda Colombia por compras superiores a $300.000 COP";

  const items = [
    promoText,
    ...BRANDS.map((b) => `MARCA · ${b}`),
    "PROBADOR 3D EN TIEMPO REAL",
  ];

  const renderGroup = (suffix: string) => (
    <div
      key={suffix}
      aria-hidden={suffix === "b" || undefined}
      className="flex shrink-0 items-center gap-8 pr-8"
    >
      {items.map((item, idx) => (
        <span
          key={`${suffix}-${idx}`}
          className="inline-flex items-center gap-8 whitespace-nowrap font-display text-[10px] font-medium uppercase tracking-label"
        >
          <span>{item}</span>
          <span className="h-1 w-1 rounded-full bg-canvas/45" aria-hidden="true" />
        </span>
      ))}
    </div>
  );

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
      <div className="ks-promo-track min-h-8 items-center py-1.5">
        {renderGroup("a")}
        {renderGroup("b")}
      </div>
    </div>
  );
}
