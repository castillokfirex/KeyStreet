import { X } from "lucide-react";
import { useToastStore } from "@/stores/toast";

const TONE_BORDER = {
  info: "border-line bg-canvas text-navy",
  success: "border-forest/30 bg-mint text-forest",
  warning: "border-amber-300 bg-amber-50 text-amber-950",
  error: "border-red-300 bg-red-50 text-red-900",
} as const;

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-5 sm:w-96 z-[60] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex items-start justify-between gap-3 rounded-xl border px-4 py-3 shadow-md ${TONE_BORDER[t.tone ?? "info"]}`}
        >
          <div className="min-w-0">
            <p className="text-xs font-bold">{t.title}</p>
            {t.description && (
              <p className="mt-0.5 text-xs opacity-85">{t.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="Cerrar notificación"
            className="shrink-0 opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
