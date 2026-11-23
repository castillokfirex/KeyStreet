import { Home, Search, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Drawer } from "@/components/ui/Drawer";
import { MAIN_NAV } from "./navigation";

export function MobileNav({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/catalogo?q=${encodeURIComponent(q)}` : "/catalogo");
    onClose();
  };

  return (
    <Drawer open={open} onClose={onClose} title="Menú" variant="right">
      <nav aria-label="Navegación móvil" className="flex flex-col gap-6 p-5">
        <form
          onSubmit={handleSearch}
          role="search"
          className="flex items-center gap-2 border-b border-ink"
        >
          <Search className="h-4 w-4 text-muted" strokeWidth={1.5} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Modelo, marca o color"
            aria-label="Buscar en el catálogo"
            className="h-11 flex-1 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
          />
        </form>

        <ul className="flex flex-col">
          <li>
            <Link
              to="/"
              onClick={onClose}
              className="flex items-center gap-2 py-3 font-display text-base font-semibold uppercase tracking-label text-ink"
            >
              <Home className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              <span>Inicio</span>
            </Link>
          </li>
          {MAIN_NAV.map((item) => (
            <li key={item.label}>
              <Link
                to={item.to}
                onClick={onClose}
                className={`block py-3 font-display text-base font-semibold uppercase tracking-label ${item.highlight ? "text-sale-text" : "text-ink"}`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <Link
          to="/admin/documents"
          onClick={onClose}
          className="flex items-center gap-2 border-t border-line pt-4 text-xs font-semibold text-muted hover:text-ink"
        >
          <ShieldCheck className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          <span>Panel Admin / Documentos</span>
        </Link>
      </nav>
    </Drawer>
  );
}
