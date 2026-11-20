import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MessageCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { KastLogo } from "@/components/brand/KastLogo";
import { publicApi, queryKeys } from "@/lib/queries";
import { useToastStore } from "@/stores/toast";

export function Footer() {
  const { data: tenant } = useQuery({
    queryKey: queryKeys.tenant,
    queryFn: publicApi.getTenant,
  });
  const pushToast = useToastStore((s) => s.push);
  const [email, setEmail] = useState("");

  const phone = (tenant?.whatsappPhone || "573000000000").replace(/\D/g, "");

  const handleDropSubmit = (e: FormEvent) => {
    e.preventDefault();
    setEmail("");
    pushToast({
      title: "Membresía Drop List — Próximamente",
      description:
        "Muy pronto habilitaremos alertas por correo. Por ahora contáctanos directo por WhatsApp.",
      tone: "info",
    });
  };

  return (
    <footer
      className="border-t border-line bg-canvas"
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 420px" }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Identidad + Drop list */}
          <div className="md:col-span-5 space-y-5">
            <KastLogo variant="wordmark" size={26} title="Key Street Colombia" />
            <p className="max-w-sm text-xs leading-relaxed text-muted">
              Atelier contemporáneo de sneakers y archivo urbano en Colombia.
              Autenticidad verificada con asesoría anatómica y asistencia IA Kast.
            </p>
            <div>
              <p className="mb-2 font-display text-[10px] font-bold uppercase tracking-[0.18em] text-navy">
                Membresía Drop List · Próximamente
              </p>
              <form onSubmit={handleDropSubmit} className="flex max-w-sm gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ingresa tu correo electrónico"
                  aria-label="Correo electrónico para drop list"
                  className="h-10 flex-1 rounded-xl border border-line bg-surface px-3.5 text-xs text-navy placeholder:text-muted focus:border-navy focus:outline-none"
                />
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-forest px-4 font-display text-[11px] font-bold uppercase tracking-wider text-white hover:bg-[#1e423b] cursor-pointer"
                >
                  Unirse
                </button>
              </form>
            </div>
          </div>

          {/* Explorar */}
          <div className="md:col-span-2 space-y-3">
            <h3 className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-navy">
              Explorar
            </h3>
            <ul className="space-y-2 text-xs text-muted">
              <li>
                <Link to="/catalogo" className="hover:text-navy">
                  Todos los pares
                </Link>
              </li>
              <li>
                <Link to="/catalogo?discounted=true" className="hover:text-navy">
                  Sale 10% – 15% OFF
                </Link>
              </li>
              <li>
                <Link to="/catalogo?silhouette=HIGH" className="hover:text-navy">
                  Caña Alta & Retro
                </Link>
              </li>
              <li>
                <Link to="/catalogo?silhouette=LOW" className="hover:text-navy">
                  Perfil Bajo
                </Link>
              </li>
            </ul>
          </div>

          {/* Atención */}
          <div className="md:col-span-2 space-y-3">
            <h3 className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-navy">
              Atención
            </h3>
            <ul className="space-y-2 text-xs text-muted">
              <li>
                <Link to="/catalogo" className="hover:text-navy">
                  Guía de tallas EU
                </Link>
              </li>
              <li>
                <Link to="/admin/documents" className="hover:text-navy">
                  Portal Admin
                </Link>
              </li>
              <li>
                <span className="text-muted/80">Cambios en 30 días</span>
              </li>
            </ul>
          </div>

          {/* Soporte WhatsApp */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-navy">
              Soporte directo
            </h3>
            <a
              href={`https://wa.me/${phone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-2xl border border-line bg-surface/70 p-4 hover:border-forest transition-colors"
            >
              <div className="flex items-center gap-3">
                <MessageCircle
                  className="h-5 w-5 text-forest shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs font-bold text-navy">
                    Asesoría WhatsApp
                  </p>
                  <p className="text-[11px] text-muted">
                    Lun – Sáb · 9am – 8pm
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted" aria-hidden="true" />
            </a>
            <div className="flex items-center justify-between text-[11px] text-muted pt-1">
              <span>Moneda / Región</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 font-semibold text-navy">
                <span className="h-1.5 w-1.5 rounded-full bg-forest" />
                COP ($) · Colombia
              </span>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-line pt-6 text-[11px] text-muted">
          <p>© {new Date().getFullYear()} Key Street Colombia S.A.S. Todos los derechos reservados.</p>
          <div className="flex items-center gap-5 uppercase tracking-wider text-[10px]">
            <span>Privacidad</span>
            <span>Términos</span>
            <span>Autenticidad</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
