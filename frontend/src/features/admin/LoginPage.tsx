import { Lock } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { KastLogo } from "@/components/brand/KastLogo";
import { Button } from "@/components/ui/Button";
import { ProblemError } from "@/lib/api";
import { authApi } from "@/lib/queries";
import { useAuthStore } from "@/stores/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.login({ email: email.trim(), password });
      if (res.user.role !== "ADMIN_TENANT") {
        setError("Esta cuenta no tiene permisos de administrador del tenant.");
        return;
      }
      setSession(res.accessToken, res.user);
      navigate("/admin/documents", { replace: true });
    } catch (err) {
      setError(
        err instanceof ProblemError
          ? err.detail
          : "No pudimos iniciar sesión. Verifica tus credenciales.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-line bg-canvas p-7 shadow-xs space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          <Link to="/" className="text-navy hover:text-forest">
            <KastLogo variant="wordmark" size={32} title="Key Street Admin" />
          </Link>
          <div>
            <h1 className="font-display text-lg font-bold uppercase tracking-wider text-navy">
              Panel Administrativo
            </h1>
            <p className="mt-1 text-xs text-muted">
              Gestión efímera de PDFs, catálogo COP y auditoría RAG
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="admin-email"
              className="block font-display text-[10px] font-bold uppercase tracking-[0.16em] text-navy"
            >
              Correo electrónico
            </label>
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@keystreet.co"
              className="h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-navy focus:border-navy focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="admin-password"
              className="block font-display text-[10px] font-bold uppercase tracking-[0.16em] text-navy"
            >
              Contraseña
            </label>
            <input
              id="admin-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-navy focus:border-navy focus:outline-none"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-900"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="forest"
            size="lg"
            fullWidth
            disabled={loading}
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            <span>{loading ? "Verificando..." : "Ingresar al panel"}</span>
          </Button>
        </form>

        <div className="text-center">
          <Link
            to="/"
            className="text-xs font-semibold text-muted hover:text-navy underline"
          >
            Volver a la tienda
          </Link>
        </div>
      </div>
    </div>
  );
}
