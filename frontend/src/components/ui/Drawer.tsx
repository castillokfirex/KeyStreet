import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  headerExtra?: ReactNode;
  variant?: "right" | "sheet";
  children: ReactNode;
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  headerExtra,
  variant = "right",
  children,
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const panelClasses =
    variant === "sheet"
      ? "fixed inset-x-0 bottom-0 h-[85vh] border-t sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:w-[420px] sm:border-t-0 sm:border-l"
      : "fixed inset-y-0 right-0 h-full w-full max-w-[420px] border-l";

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="fixed inset-0 bg-ink/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`${panelClasses} relative z-10 flex flex-col border-line bg-canvas`}
      >
        <div className="flex min-h-14 items-center justify-between gap-3 border-b border-line px-5 py-3">
          <div className="flex items-center gap-3 min-w-0">
            {headerExtra}
            <div className="min-w-0">
              <h2 className="font-display text-xs font-semibold uppercase tracking-nav text-ink truncate">
                {title}
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
            className="-mr-2 inline-flex h-10 w-10 items-center justify-center text-ink hover:opacity-60 transition-opacity cursor-pointer"
          >
            <X className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
