import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Contenido junto al título (p. ej. el contador de la bolsa). */
  titleAddon?: ReactNode;
  headerExtra?: ReactNode;
  variant?: "right" | "sheet";
  children: ReactNode;
}

/** Duración de la salida; también es el respaldo si no llega `animationend`. */
const EXIT_MS = 260;

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  titleAddon,
  headerExtra,
  variant = "right",
  children,
}: DrawerProps) {
  // Se mantiene montado mientras corre la animación de salida
  const [rendered, setRendered] = useState(open);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setRendered(true);
  }
  const closing = !open && rendered;

  useEffect(() => {
    if (!closing) return;
    const t = window.setTimeout(() => setRendered(false), EXIT_MS + 80);
    return () => window.clearTimeout(t);
  }, [closing]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!rendered) return null;

  const panelClasses =
    variant === "sheet"
      ? "fixed inset-x-0 bottom-0 h-[85vh] border-t sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:w-[420px] sm:border-t-0 sm:border-l"
      : "fixed inset-y-0 right-0 h-full w-full max-w-[420px] border-l";
  const motion =
    variant === "sheet"
      ? closing
        ? "ks-sheet-out"
        : "ks-sheet-in"
      : closing
        ? "ks-drawer-out"
        : "ks-drawer-in";

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`fixed inset-0 bg-ink/30 backdrop-blur-[2px] ${closing ? "ks-fade-out" : "ks-fade-in"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`${panelClasses} ${motion} relative z-10 flex flex-col border-line bg-canvas shadow-[-24px_0_60px_-30px_rgb(17_17_17/0.45)]`}
        onAnimationEnd={(e) => {
          if (closing && e.target === e.currentTarget) setRendered(false);
        }}
      >
        <div className="flex min-h-14 items-center justify-between gap-3 border-b border-line px-5 py-3">
          <div className="flex items-center gap-3 min-w-0">
            {headerExtra}
            <div className="min-w-0">
              <h2 className="flex min-w-0 items-start gap-0.5 font-display text-xs font-semibold uppercase tracking-nav text-ink">
                <span className="truncate">{title}</span>
                {titleAddon}
              </h2>
              {subtitle && (
                <p className="text-[11px] text-muted truncate">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Cerrar ${title}`}
            className="group -mr-2 inline-flex h-10 w-10 items-center justify-center text-ink cursor-pointer"
          >
            <X
              className="h-5 w-5 transition-transform duration-300 ease-editorial group-hover:rotate-90"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
