import { Activity, FileText, LogOut, Package, Store } from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { KastLogo } from "@/components/brand/KastLogo";
import { ToastViewport } from "@/components/ui/ToastViewport";
import { authApi } from "@/lib/queries";
import { useAuthStore } from "@/stores/auth";
import { AdminGuard } from "./AdminGuard";

const NAV_ITEMS = [
  { to: "/admin/documents", label: "Documentos PDF", icon: FileText },
  { to: "/admin/products", label: "Productos", icon: Package },
  { to: "/admin/audit", label: "Auditoría RAG", icon: Activity },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
      navigate("/admin/login", { replace: true });
    }
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-canvas text-navy">
        <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur-sm">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-6">
              <Link to="/admin/documents" className="text-navy">
                <KastLogo variant="wordmark" size={26} title="Key Street Admin" />
              </Link>
              <nav className="hidden md:flex items-center gap-2">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        [
                          "inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97]",
                          isActive
                            ? "bg-forest text-white"
                            : "text-muted hover:bg-surface hover:text-navy",
                        ].join(" ")
                      }
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden text-right leading-tight sm:block">
                <span className="block text-xs font-medium text-ink">{user?.email}</span>
                <span className="block font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                  Administrador
                </span>
              </span>
              <Link
                to="/catalogo"
                className="inline-flex items-center gap-1.5 border border-line px-3 py-1.5 text-xs font-semibold text-navy transition-[background-color,transform] duration-150 ease-out hover:bg-surface active:scale-[0.97]"
              >
                <Store className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Ver tienda</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex cursor-pointer items-center gap-1.5 border border-line px-3 py-1.5 text-xs font-semibold text-navy transition-[background-color,color,border-color,transform] duration-150 ease-out hover:border-kast-error/40 hover:text-kast-error active:scale-[0.97]"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Salir</span>
              </button>
            </div>
          </div>

          <div className="flex md:hidden gap-2 overflow-x-auto border-t border-line px-4 py-2">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `shrink-0 px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                    isActive ? "bg-forest text-white" : "bg-surface text-navy"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <Outlet />
        </main>
        <ToastViewport />
      </div>
    </AdminGuard>
  );
}
