import { MessageCircle, ShieldCheck, Truck } from "lucide-react";

const TILES = [
  {
    icon: ShieldCheck,
    title: "100% AUTENTICIDAD VERIFICADA",
    description:
      "Curaduría rigurosa y revisión técnica antes de cada envío con respaldo Key Street.",
  },
  {
    icon: Truck,
    title: "ENVÍOS EXPRESS COLOMBIA",
    description:
      "Despachos asegurados en 24 a 72 horas para las principales ciudades del país.",
  },
  {
    icon: MessageCircle,
    title: "ASESORÍA VIP WHATSAPP",
    description:
      "Atención personalizada para confirmar talla, horma y disponibilidad al instante.",
  },
];

export function TrustStrip() {
  return (
    <section
      aria-label="Garantías de compra"
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 320px" }}
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <div
              key={tile.title}
              className="flex items-start gap-3.5 rounded-2xl border border-line bg-surface/65 p-5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mint text-forest">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-display text-xs font-bold uppercase tracking-[0.12em] text-navy">
                  {tile.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">
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
