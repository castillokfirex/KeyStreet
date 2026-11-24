import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { KastLogo } from "@/components/brand/KastLogo";
import {
  KastMascot,
  type KastMascotState,
} from "@/components/brand/KastMascot";
import { MotionScope } from "@/components/motion/MotionScope";
import { authApi } from "@/lib/queries";
import { useAuthStore } from "@/stores/auth";
import { KastShowcase, KastStrip } from "./login/KastScenes";
import {
  describeLoginError,
  LOCKOUT_SECONDS,
  loginSchema,
  MAX_FAILED_ATTEMPTS,
  type LoginValues,
} from "./login/loginSchema";

type Status = "idle" | "submitting" | "success" | "error";
type FocusField = "email" | "password" | null;

const SUCCESS_DELAY_MS = 650;

/** Qué hace Kast según lo que pasa en el formulario. */
function kastReaction(
  status: Status,
  focus: FocusField,
  showPassword: boolean,
  hasEmail: boolean,
): { state: KastMascotState; label: string } {
  if (status === "submitting")
    return { state: "thinking", label: "Verificando tu acceso…" };
  if (status === "success")
    return { state: "success", label: "¡Bienvenido al backstage!" };
  if (status === "error") return { state: "error", label: "Algo no cuadra" };
  if (focus === "password") {
    return showPassword
      ? { state: "listening", label: "Uy, la estoy viendo…" }
      : { state: "idle", label: "Tranqui, no estoy mirando" };
  }
  if (focus === "email") return { state: "listening", label: "Te escucho" };
  if (hasEmail) return { state: "speaking", label: "Listo para entrar" };
  return { state: "idle", label: "Escribe tu correo para despertarme" };
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p
      id={id}
      className="ks-rise mt-1.5 flex items-center gap-1.5 text-xs font-medium text-kast-error"
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

const LABEL =
  "mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ink";
const INPUT =
  "peer h-12 w-full border border-line bg-white/80 pl-10 text-sm text-ink placeholder:text-gray transition-[border-color,box-shadow,background-color] duration-300 hover:border-ink/40 focus:border-ink focus:bg-white focus:outline-none focus:ring-4 focus:ring-ink/[0.06] aria-[invalid=true]:border-kast-error aria-[invalid=true]:ring-kast-error/10";
const ICON =
  "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray transition-colors duration-300 group-focus-within/field:text-ink";
const UNDERLINE =
  "pointer-events-none absolute bottom-0 left-0 h-[2px] w-full origin-left scale-x-0 bg-forest transition-transform duration-500 ease-editorial peer-focus:scale-x-100";

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [focus, setFocus] = useState<FocusField>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [failures, setFailures] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const errorTimer = useRef<number | undefined>(undefined);
  const formRef = useRef<HTMLFormElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setFocus: focusField,
    control,
    formState: { errors, touchedFields },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });

  const emailValue = useWatch({ control, name: "email" }) ?? "";
  const emailValid =
    touchedFields.email && !errors.email && emailValue.trim().length > 0;

  // Cuenta regresiva del bloqueo temporal tras varios intentos fallidos
  const lockSeconds = lockedUntil
    ? Math.max(0, Math.ceil((lockedUntil - now) / 1000))
    : 0;
  useEffect(() => {
    if (!lockedUntil) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= lockedUntil) {
        setLockedUntil(null);
        setFailures(0);
        setServerError(null);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [lockedUntil]);

  useEffect(() => () => window.clearTimeout(errorTimer.current), []);

  const locked = lockSeconds > 0;
  const busy = status === "submitting" || status === "success";
  const kast = kastReaction(status, focus, showPassword, Boolean(emailValue));

  const fail = (message: string) => {
    setServerError(message);
    setStatus("error");
    // Sacudida corta del formulario (se omite con movimiento reducido)
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!reduce && typeof formRef.current?.animate === "function") {
      formRef.current.animate(
        [
          { transform: "translateX(0)" },
          { transform: "translateX(-6px)" },
          { transform: "translateX(6px)" },
          { transform: "translateX(-4px)" },
          { transform: "translateX(4px)" },
          { transform: "translateX(0)" },
        ],
        { duration: 420, easing: "ease-in-out" },
      );
    }
    window.clearTimeout(errorTimer.current);
    errorTimer.current = window.setTimeout(() => setStatus("idle"), 1600);
  };

  const onSubmit = async (values: LoginValues) => {
    if (busy || locked) return;
    setServerError(null);
    setStatus("submitting");
    try {
      const res = await authApi.login({
        email: values.email.toLowerCase(),
        password: values.password,
      });
      if (res.user.role !== "ADMIN_TENANT") {
        fail("Esta cuenta no tiene acceso al panel administrativo.");
        return;
      }
      setFailures(0);
      setStatus("success");
      window.setTimeout(() => {
        setSession(res.accessToken, res.user);
        navigate("/admin/documents", { replace: true });
      }, SUCCESS_DELAY_MS);
    } catch (err) {
      const failure = describeLoginError(err);
      const nextFailures =
        failure.kind === "credentials" ? failures + 1 : failures;
      setFailures(nextFailures);
      if (
        failure.kind === "rate-limit" ||
        nextFailures >= MAX_FAILED_ATTEMPTS
      ) {
        const t = Date.now();
        setNow(t);
        setLockedUntil(t + LOCKOUT_SECONDS * 1000);
        fail(
          failure.kind === "rate-limit"
            ? failure.message
            : "Demasiados intentos fallidos. Espera unos segundos antes de volver a intentarlo.",
        );
      } else {
        fail(failure.message);
      }
      if (failure.kind === "credentials") {
        setValue("password", "");
        // Los campos siguen deshabilitados hasta el próximo render
        window.setTimeout(() => focusField("password"), 0);
      }
    }
  };

  const onPasswordKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === "function")
      setCapsLock(e.getModifierState("CapsLock"));
  };

  const emailField = register("email");
  const passwordField = register("password");

  let buttonContent;
  if (status === "submitting") {
    buttonContent = (
      <>
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>Verificando…</span>
      </>
    );
  } else if (status === "success") {
    buttonContent = (
      <>
        <Check className="ks-rise h-4 w-4" aria-hidden="true" />
        <span>¡Listo! Entrando…</span>
      </>
    );
  } else if (locked) {
    buttonContent = (
      <>
        <Lock className="h-4 w-4" aria-hidden="true" />
        <span>Espera {lockSeconds} s</span>
      </>
    );
  } else {
    buttonContent = (
      <>
        <Lock
          className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-12"
          aria-hidden="true"
        />
        <span>Ingresar al panel</span>
        <ArrowRight
          className="h-4 w-4 transition-transform duration-300 ease-editorial group-hover:translate-x-1.5"
          aria-hidden="true"
        />
      </>
    );
  }

  return (
    <MotionScope>
      <div className="grid min-h-svh grid-cols-[minmax(0,1fr)] bg-canvas lg:h-svh lg:min-h-[580px] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Vitrina: escenas de Kast en movimiento continuo */}
        <aside className="relative hidden overflow-hidden bg-ink lg:block">
          <KastShowcase />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink/90 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-ink via-ink/85 to-transparent" />
          <div className="absolute left-6 top-5 text-white xl:left-8 xl:top-7">
            <KastLogo variant="wordmark" size={28} title="Key Street" />
          </div>
          <div className="pointer-events-none absolute bottom-6 left-6 right-6 text-white xl:bottom-10 xl:left-8 xl:right-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/60">
              Key Street · Drop 2026
            </p>
            <p className="mt-2 font-display font-expanded text-[clamp(1.85rem,min(3.5vw,5.5vh),4rem)] font-black uppercase leading-[0.9] tracking-[-0.03em] xl:mt-3">
              <span className="ks-rise block" style={{ animationDelay: "80ms" }}>
                Tu estilo
              </span>
              <span className="ks-rise block" style={{ animationDelay: "200ms" }}>
                <span
                  className="text-outline"
                  style={{ "--outline-color": "#ffffff" } as CSSProperties}
                >
                  te{" "}
                </span>
                <span className="relative isolate inline-block">
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-[-0.08em] bottom-[0.06em] top-[0.18em] -z-10 -rotate-1 bg-[#c9e265]"
                  />
                  <span className="relative text-ink">define.</span>
                </span>
              </span>
            </p>
            <p
              className="ks-rise mt-3 max-w-sm text-xs leading-relaxed text-white/75 xl:mt-5 xl:text-sm"
              style={{ animationDelay: "320ms" }}
            >
              Cada par cuenta quién eres. Elígelo, pruébatelo en 3D y sal a la
              calle a tu manera.
            </p>
            <ul className="mt-3.5 flex flex-wrap gap-2 xl:mt-5" aria-label="Estilos">
              {["Clásico", "Urbano", "Deportivo", "Elegante"].map((style, i) => (
                <li
                  key={style}
                  className="ks-rise border border-white/30 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/85"
                  style={{ animationDelay: `${420 + i * 80}ms` }}
                >
                  {style}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Formulario */}
        <main className="relative flex min-w-0 flex-col lg:overflow-y-auto">
          <div className="flex items-center justify-between px-5 pt-4 sm:px-8 sm:pt-5 xl:pt-7">
            <Link
              to="/"
              className="text-ink lg:invisible"
              aria-label="Key Street, ir a la tienda"
            >
              <KastLogo variant="wordmark" size={24} title="Key Street" />
            </Link>
            <Link
              to="/"
              className="group inline-flex items-center gap-1.5 font-display text-[11px] font-semibold uppercase tracking-nav text-muted transition-colors hover:text-ink"
            >
              <ArrowLeft
                className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span className="relative after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-ink after:transition-transform after:duration-300 group-hover:after:origin-left group-hover:after:scale-x-100">
                Volver a la tienda
              </span>
            </Link>
          </div>

          <div className="mt-4 lg:hidden">
            <KastStrip />
          </div>

          <div className="flex flex-1 items-center justify-center px-5 py-4 sm:px-8 sm:py-6">
            <div className="w-full max-w-[400px]">
              {/* Kast reacciona al formulario */}
              <div className="flex items-center gap-3.5 xl:gap-4">
                <div className="flex h-16 w-16 items-center justify-center bg-surface text-ink xl:h-[80px] xl:w-[80px]">
                  <KastMascot
                    state={kast.state}
                    size={54}
                    title="Kast, asistente de Key Street"
                  />
                </div>
                <p
                  aria-live="polite"
                  className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted"
                >
                  <span className="block text-[9px] text-gray">Kast dice</span>
                  <span key={kast.label} className="ks-rise block text-ink">
                    {kast.label}
                  </span>
                </p>
              </div>

              <h1 className="mt-4 font-display font-expanded text-[clamp(1.75rem,3.4vw,2.5rem)] font-extrabold uppercase leading-[0.95] tracking-[-0.02em] text-ink xl:mt-6">
                Hola de
                <br />
                <span className="text-forest">nuevo.</span>
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-muted sm:text-sm xl:mt-3">
                Panel administrativo: fichas PDF, catálogo en COP y auditoría de
                Kast.
              </p>

              <form
                ref={formRef}
                noValidate
                onSubmit={(e) => void handleSubmit(onSubmit)(e)}
                className="mt-4 space-y-3.5 xl:mt-7 xl:space-y-5"
                aria-describedby={
                  serverError ? "login-server-error" : undefined
                }
              >
                <div>
                  <label htmlFor="admin-email" className={LABEL}>
                    Correo electrónico
                  </label>
                  <div className="group/field relative">
                    <Mail className={ICON} aria-hidden="true" />
                    <input
                      id="admin-email"
                      type="email"
                      inputMode="email"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="nombre@keystreet.co"
                      maxLength={254}
                      disabled={busy}
                      aria-invalid={errors.email ? "true" : "false"}
                      aria-describedby={
                        errors.email ? "admin-email-error" : undefined
                      }
                      className={`${INPUT} pr-10`}
                      {...emailField}
                      onFocus={() => setFocus("email")}
                      onBlur={(e) => {
                        setFocus(null);
                        void emailField.onBlur(e);
                      }}
                    />
                    <span className={UNDERLINE} aria-hidden="true" />
                    {emailValid && (
                      <Check
                        className="ks-rise pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sale-text"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <FieldError
                    id="admin-email-error"
                    message={errors.email?.message}
                  />
                </div>

                <div>
                  <label htmlFor="admin-password" className={LABEL}>
                    Contraseña
                  </label>
                  <div className="group/field relative">
                    <Lock className={ICON} aria-hidden="true" />
                    <input
                      id="admin-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      maxLength={128}
                      disabled={busy}
                      aria-invalid={errors.password ? "true" : "false"}
                      aria-describedby={
                        [
                          errors.password ? "admin-password-error" : "",
                          capsLock ? "admin-caps" : "",
                        ]
                          .filter(Boolean)
                          .join(" ") || undefined
                      }
                      className={`${INPUT} pr-12`}
                      {...passwordField}
                      onFocus={() => setFocus("password")}
                      onBlur={(e) => {
                        setFocus(null);
                        setCapsLock(false);
                        void passwordField.onBlur(e);
                      }}
                      onKeyDown={onPasswordKey}
                      onKeyUp={onPasswordKey}
                    />
                    <span className={UNDERLINE} aria-hidden="true" />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      onMouseDown={(e) => e.preventDefault()}
                      aria-label={
                        showPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                      aria-pressed={showPassword}
                      className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center text-gray transition-colors hover:text-ink"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  <FieldError
                    id="admin-password-error"
                    message={errors.password?.message}
                  />
                  {capsLock && (
                    <p
                      id="admin-caps"
                      className="ks-rise mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-kast-thinking"
                    >
                      Bloq Mayús está activado
                    </p>
                  )}
                </div>

                {serverError && (
                  <div
                    id="login-server-error"
                    role="alert"
                    className="ks-rise flex items-start gap-2.5 border-l-2 border-kast-error bg-kast-error/[0.06] px-3.5 py-3 text-xs font-medium text-kast-error"
                  >
                    <AlertCircle
                      className="mt-px h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span>
                      {serverError}
                      {failures > 0 &&
                        failures < MAX_FAILED_ATTEMPTS &&
                        !locked && (
                          <span className="mt-1 block font-normal text-muted">
                            Intentos restantes antes de una pausa:{" "}
                            {MAX_FAILED_ATTEMPTS - failures}
                          </span>
                        )}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy || locked}
                  aria-busy={status === "submitting"}
                  data-status={status}
                  className="group relative isolate flex h-11 w-full cursor-pointer items-center justify-center gap-2.5 overflow-hidden bg-ink font-display text-[12px] font-semibold uppercase tracking-nav text-canvas transition-[transform,background-color] duration-300 active:scale-[0.98] disabled:cursor-not-allowed data-[status=success]:bg-forest xl:h-[52px]"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 origin-left scale-x-0 bg-forest transition-transform duration-500 ease-editorial group-hover:scale-x-100 group-disabled:scale-x-0"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 -left-1/3 -z-10 w-1/3 -skew-x-12 bg-white/10 transition-[left] duration-700 ease-editorial group-hover:left-[110%]"
                  />
                  {buttonContent}
                </button>
              </form>

              <p className="mt-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted xl:mt-6">
                <ShieldCheck
                  className="h-3.5 w-3.5 text-sale-text"
                  aria-hidden="true"
                />
                Acceso protegido · Solo administradores
              </p>
            </div>
          </div>
        </main>
      </div>
    </MotionScope>
  );
}
