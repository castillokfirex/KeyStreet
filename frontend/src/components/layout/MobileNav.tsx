import { Link } from "react-router";
import { ShieldCheck } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";

export function MobileNav({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Drawer open={open} onClose={onClose} title="Menú" variant="right">
      <nav aria-label="Navegación móvil" className="flex flex-col p-5 gap-2">
        <Link
          to="/catalogo"
          onClick={onClose}
          className="rounded-xl px-4 py-3 font-display text-sm font-bold uppercase tracking-wider text-navy hover:bg-surface"
        >
          Colección completa
        </Link>
        <Link
          to="/catalogo?silhouette=LOW"
          onClick={onClose}
          className="rounded-xl px-4 py-3 font-display text-sm font-bold uppercase tracking-wider text-navy hover:bg-surface"
        >
          Siluetas Low
        </Link>
        <Link
          to="/catalogo?silhouette=HIGH"
          onClick={onClose}
          className="rounded-xl px-4 py-3 font-display text-sm font-bold uppercase tracking-wider text-navy hover:bg-surface"
        >
          Caña Alta & Retro
        </Link>
        <Link
          to="/catalogo?discounted=true"
          onClick={onClose}
          className="flex items-center justify-between rounded-xl px-4 py-3 font-display text-sm font-bold uppercase tracking-wider text-forest bg-mint/60"
        >
          <span>Sale · Ofertas</span>
          <span className="rounded-full bg-forest px-2 py-0.5 text-[10px] text-white">
            OFF
          </span>
        </Link>
        <div className="my-3 border-t border-line" />
        <Link
          to="/admin/documents"
          onClick={onClose}
          className="flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold text-muted hover:text-navy hover:bg-surface"
        >
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          <span>Panel Admin / Documentos</span>
        </Link>
      </nav>
    </Drawer>
  );
}
