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
      ? "fixed inset-x-0 bottom-0 h-[85vh] rounded-t-2xl sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:w-[420px] sm:rounded-t-none sm:rounded-l-2xl"
      : "fixed inset-y-0 right-0 h-full w-full max-w-[420px] rounded-l-2xl";

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="fixed inset-0 bg-navy/35 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`${panelClasses} relative z-10 flex flex-col bg-canvas border-l border-t border-line shadow-xl`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            {headerExtra}
            <div className="min-w-0">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-navy truncate">
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
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line text-navy hover:bg-surface cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
