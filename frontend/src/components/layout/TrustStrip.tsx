import { MessageCircle, ShieldCheck, Truck } from "lucide-react";

const TILES = [
  {
    icon: ShieldCheck,
    title: "100% autenticidad verificada",
    description:
      "Curaduría rigurosa y revisión técnica antes de cada envío con respaldo Key Street.",
  },
  {
    icon: Truck,
    title: "Envíos express Colombia",
    description:
      "Despachos asegurados en 24 a 72 horas para las principales ciudades del país.",
  },
  {
    icon: MessageCircle,
    title: "Asesoría VIP WhatsApp",
    description:
      "Atención personalizada para confirmar talla, horma y disponibilidad al instante.",
  },
];

export function TrustStrip() {
  return (
    <section
      aria-label="Garantías de compra"
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 220px" }}
      className="mx-auto max-w-[1680px] px-4 sm:px-6 lg:px-8 pt-20"
    >
      <div className="grid grid-cols-1 gap-8 border-t border-line pt-8 md:grid-cols-3">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <div key={tile.title} className="flex items-start gap-3.5">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-ink" strokeWidth={1.5} aria-hidden="true" />
              <div>
                <h3 className="font-display text-[11px] font-semibold uppercase tracking-nav text-ink">
                  {tile.title}
                </h3>
                <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted">
                  {tile.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
