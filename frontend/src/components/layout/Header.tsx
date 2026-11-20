import { Menu, Search, ShoppingBag, User } from "lucide-react";
import { lazy, Suspense, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { KastLogo } from "@/components/brand/KastLogo";
import { useCartStore } from "@/stores/cart";

const LazyMobileNav = lazy(() =>
  import("./MobileNav").then((m) => ({ default: m.MobileNav })),
);

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const itemsCount = useCartStore((s) =>
    s.items.reduce((acc, item) => acc + item.quantity, 0),
  );
  const setBagOpen = useCartStore((s) => s.setBagOpen);

  const isProductDetail = location.pathname.startsWith("/producto/");

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = searchValue.trim();
    navigate(q ? `/catalogo?q=${encodeURIComponent(q)}` : "/catalogo");
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Izquierda: menú móvil + links editoriales */}
          <div className="flex items-center gap-4 lg:gap-6">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú de navegación"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line text-navy lg:hidden cursor-pointer"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>

            <nav
              aria-label="Categorías principales"
              className="hidden lg:flex items-center gap-6"
            >
              <Link
                to="/catalogo?silhouette=HIGH"
                className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-navy hover:text-forest transition-colors"
              >
                Hombre
              </Link>
              <Link
                to="/catalogo?silhouette=LOW"
                className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-navy hover:text-forest transition-colors"
              >
                Mujer
              </Link>
              <Link
                to="/catalogo"
                className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-navy hover:text-forest transition-colors"
              >
                Streetwear
              </Link>
              <Link
                to="/catalogo?discounted=true"
                className="inline-flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-[0.16em] text-forest hover:opacity-80 transition-opacity"
              >
                <span>Sale</span>
                <span className="rounded-full bg-mint px-1.5 py-0.5 text-[9px] text-forest">
                  OFF
                </span>
              </Link>
            </nav>
          </div>

          {/* Centro: Identidad dual Key Street x Kast */}
          <Link
            to="/"
            aria-label="Inicio Key Street"
            className="flex items-center justify-center text-navy hover:text-forest transition-colors"
          >
            {isProductDetail ? (
              <>
                <KastLogo
                  variant="wordmark"
                  size={30}
                  className="hidden sm:inline-flex"
                  title="Key Street"
                />
                <KastLogo
                  variant="isotype"
                  size={30}
                  className="sm:hidden"
                  title="Key Street x Kast"
                />
              </>
            ) : (
              <span className="inline-flex items-center gap-2">
                <KastLogo
                  variant="isotype"
                  size={30}
                  title="Key Street x Kast"
                />
                <span className="hidden sm:inline font-display text-xs font-bold uppercase tracking-[0.26em]">
                  KEY STREET
                </span>
              </span>
            )}
          </Link>

          {/* Derecha: buscador, admin, bolsa */}
          <div className="flex items-center gap-2 sm:gap-3">
            <form
              onSubmit={handleSearch}
              className="hidden md:flex items-center rounded-full border border-line bg-surface px-3 py-1.5 focus-within:border-navy"
              role="search"
            >
              <Search className="h-3.5 w-3.5 text-muted mr-2" aria-hidden="true" />
              <input
                type="search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Buscar modelo o marca..."
                aria-label="Buscar silueta o marca"
                className="w-40 bg-transparent text-xs text-navy placeholder:text-muted focus:outline-none"
              />
            </form>

            <Link
              to="/admin/documents"
              aria-label="Panel administrativo"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-navy hover:bg-surface transition-colors"
            >
              <User className="h-4 w-4" aria-hidden="true" />
            </Link>

            <button
              type="button"
              onClick={() => setBagOpen(true)}
              aria-label={`Abrir bolsa (${itemsCount} artículos)`}
              className="relative inline-flex h-9 items-center gap-1.5 rounded-full bg-navy px-3 text-white hover:bg-[#1e293b] transition-colors cursor-pointer"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              <span className="font-display text-xs font-bold">{itemsCount}</span>
            </button>
          </div>
        </div>
      </header>
      {mobileOpen && (
        <Suspense fallback={null}>
          <LazyMobileNav
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
}
