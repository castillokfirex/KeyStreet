import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MessageCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { KastLogo } from "@/components/brand/KastLogo";
import { publicApi, queryKeys } from "@/lib/queries";
import { useToastStore } from "@/stores/toast";

const HEADING =
  "mb-4 font-display text-[10px] font-semibold uppercase tracking-nav text-ink";
const LINK = "text-xs text-muted transition-colors hover:text-ink";

export function Footer() {
  const { data: tenant } = useQuery({
    queryKey: queryKeys.tenant,
    queryFn: publicApi.getTenant,
  });
  const pushToast = useToastStore((s) => s.push);
  const [email, setEmail] = useState("");

  const phone = (tenant?.whatsappPhone || "573176576059").replace(/\D/g, "");

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
      className="mt-24 border-t border-line bg-canvas"
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 420px" }}
    >
      <div className="mx-auto max-w-[1680px] px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-12">
          {/* Identidad */}
          <div className="col-span-2 space-y-4 md:col-span-4">
            <Link
              to="/"
              aria-label="Key Street, ir al inicio"
              className="inline-flex items-center gap-3 text-ink"
            >
              <KastLogo variant="wordmark" size={36} showMark title="Key Street Colombia" />
            </Link>
            <p className="max-w-xs text-xs leading-relaxed text-muted">
              Atelier contemporáneo de sneakers y archivo urbano en Colombia.
              Autenticidad verificada con asesoría anatómica y asistencia IA Kast.
            </p>
          </div>

          {/* Explorar */}
          <nav aria-label="Explorar" className="md:col-span-2">
            <h3 className={HEADING}>Explorar</h3>
            <ul className="space-y-2">
              <li><Link to="/catalogo" className={LINK}>Todos los pares</Link></li>
              <li><Link to="/catalogo?discounted=true" className={LINK}>Sale 10% – 15% OFF</Link></li>
              <li><Link to="/catalogo?silhouette=HIGH" className={LINK}>Caña alta & retro</Link></li>
              <li><Link to="/catalogo?silhouette=LOW" className={LINK}>Perfil bajo</Link></li>
            </ul>
          </nav>

          {/* Atención */}
          <nav aria-label="Atención" className="md:col-span-2">
            <h3 className={HEADING}>Atención</h3>
            <ul className="space-y-2">
              <li><Link to="/catalogo" className={LINK}>Guía de tallas EU</Link></li>
              <li>
                <a
                  href={`https://wa.me/${phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${LINK} inline-flex items-center gap-1.5`}
                >
                  <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                  Asesoría WhatsApp
                </a>
              </li>
              <li><span className="text-xs text-muted">Lun – Sáb · 9am – 8pm</span></li>
            </ul>
          </nav>

          {/* Soporte */}
          <nav aria-label="Soporte" className="md:col-span-1">
            <h3 className={HEADING}>Soporte</h3>
            <ul className="space-y-2">
              <li><span className="text-xs text-muted">Cambios en 30 días</span></li>
              <li><Link to="/admin/documents" className={LINK}>Portal Admin</Link></li>
            </ul>
          </nav>

          {/* Drop list */}
          <div className="col-span-2 md:col-span-3">
            <h3 className={HEADING}>Membresía Drop List · Próximamente</h3>
            <p className="mb-3 text-xs text-muted">Lanzamientos y restocks antes que nadie.</p>
            <form
              onSubmit={handleDropSubmit}
              className="flex items-center border-b border-ink focus-within:border-b-2"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Tu correo electrónico"
                aria-label="Correo electrónico para drop list"
                className="h-10 min-w-0 flex-1 bg-transparent text-xs text-ink placeholder:text-muted focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Unirse a la drop list"
                className="-mr-2 inline-flex h-10 w-10 items-center justify-center text-ink hover:opacity-60 cursor-pointer"
              >
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>

        <div className="mt-16 flex flex-col-reverse gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] uppercase tracking-label text-muted">
            © {new Date().getFullYear()} Key Street Colombia S.A.S. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-5 text-[10px] uppercase tracking-label text-muted">
            <span>Privacidad</span>
            <span>Términos</span>
            <span className="inline-flex items-center gap-1.5 border-b border-ink pb-0.5 font-semibold text-ink">
              COP ($) · Colombia
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
