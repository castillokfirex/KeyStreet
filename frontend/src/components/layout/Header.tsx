import { Home, Menu, Search, ShoppingBag, User } from "lucide-react";
import { lazy, Suspense, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useCartStore } from "@/stores/cart";
import { AlternatingLogo } from "./AlternatingLogo";
import { isNavActive, MAIN_NAV, type NavItem } from "./navigation";
import { useScrolled } from "./useScrolled";

const LazyMobileNav = lazy(() =>
  import("./MobileNav").then((m) => ({ default: m.MobileNav })),
);

const ICON_BTN =
  "relative inline-flex h-10 w-10 items-center justify-center text-ink hover:opacity-60 transition-opacity cursor-pointer";

function NavLinkItem({
  item,
  active,
  size,
}: {
  item: NavItem;
  active: boolean;
  size: "main" | "sub";
}) {
  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={[
        "group relative inline-block whitespace-nowrap py-2 font-display uppercase tracking-nav transition-colors",
        size === "main"
          ? "text-[11px] font-semibold"
          : "text-[10px] font-medium",
        item.highlight
          ? "text-sale-text"
          : size === "sub" && !active
            ? "text-muted hover:text-ink"
            : "text-ink",
      ].join(" ")}
    >
      {item.label}
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 bottom-1 h-px origin-left bg-current transition-transform duration-300 ${active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`}
      />
    </Link>
  );
}

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const compact = useScrolled(40);
  const [searchValue, setSearchValue] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const itemsCount = useCartStore((s) =>
    s.items.reduce((acc, item) => acc + item.quantity, 0),
  );
  const setBagOpen = useCartStore((s) => s.setBagOpen);

  const active = (to: string) =>
    isNavActive(to, location.pathname, location.search);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = searchValue.trim();
    navigate(q ? `/catalogo?q=${encodeURIComponent(q)}` : "/catalogo");
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-canvas">
        <div
          className={[
            "mx-auto grid max-w-[1680px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6 lg:px-8 transition-[height] duration-300",
            compact ? "h-[var(--ks-header-h-compact)]" : "h-[var(--ks-header-h)]",
          ].join(" ")}
        >
          {/* Izquierda: menú móvil + inicio + navegación principal */}
          <div className="flex min-w-0 items-center gap-1 lg:gap-4">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú de navegación"
              className={`${ICON_BTN} -ml-2 lg:hidden`}
            >
              <Menu className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            </button>

            <Link
              to="/"
              aria-label="Inicio"
              title="Inicio"
              aria-current={location.pathname === "/" ? "page" : undefined}
              className={`${ICON_BTN} lg:-ml-2`}
            >
              <Home className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            </Link>

            <nav aria-label="Categorías principales" className="hidden lg:block">
              <ul className="flex items-center gap-6">
                {MAIN_NAV.map((item) => (
                  <li key={item.label}>
                    <NavLinkItem item={item} active={active(item.to)} size="main" />
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Centro: Kast ↔ KEY STREET */}
          <AlternatingLogo compact={compact} />

          {/* Derecha: búsqueda, cuenta, bolsa */}
          <div className="-mr-2 flex items-center justify-end gap-1">
            <form
              onSubmit={handleSearch}
              role="search"
              className="mr-2 hidden items-center gap-2 border-b border-line focus-within:border-ink md:flex"
            >
              <Search className="h-4 w-4 text-muted" strokeWidth={1.5} aria-hidden="true" />
              <input
                type="search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Buscar modelo o marca"
                aria-label="Buscar silueta o marca"
                className="h-9 w-32 bg-transparent text-xs text-ink placeholder:text-muted focus:outline-none lg:w-40"
              />
            </form>

            <Link
              to="/admin/documents"
              aria-label="Panel administrativo"
              className={`${ICON_BTN} hidden sm:inline-flex`}
            >
              <User className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            </Link>

            <button
              type="button"
              onClick={() => setBagOpen(true)}
              aria-label={`Abrir bolsa (${itemsCount} artículos)`}
              className={ICON_BTN}
            >
              <ShoppingBag className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
              {itemsCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ink px-1 font-display text-[10px] font-semibold leading-none text-canvas"
                >
                  {itemsCount > 99 ? "99+" : itemsCount}
                </span>
              )}
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
