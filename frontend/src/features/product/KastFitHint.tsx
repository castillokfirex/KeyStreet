import { KastMascot } from "@/components/brand/KastMascot";
import { MotionScope } from "@/components/motion/MotionScope";
import { recommendSize } from "@/lib/fitHint";
import { useFitProfileStore } from "@/stores/fitProfile";

export function KastFitHint({
  fit,
  onAskKast,
}: {
  fit?: "TRUE_TO_SIZE" | "RUNS_SMALL" | "RUNS_LARGE";
  onAskKast: () => void;
}) {
  const heightCm = useFitProfileStore((s) => s.heightCm);
  const usualSizeEu = useFitProfileStore((s) => s.usualSizeEu);
  const { reason } = recommendSize(usualSizeEu, fit);

  const heightMeters = (heightCm / 100).toFixed(2).replace(".", ",");

  return (
    <div className="flex items-center justify-between gap-3 border-y border-line py-3">
      <div className="flex min-w-0 items-center gap-3">
        <MotionScope>
          {/* Despierto: sigue el cursor mientras lees la recomendación */}
          <KastMascot state="listening" size={40} title="Consejo de talla Kast" />
        </MotionScope>
        <div className="text-xs leading-snug">
          <p className="font-semibold text-ink">
            Según tu perfil ({heightMeters} m · talla {usualSizeEu})
          </p>
          <p className="mt-0.5 text-muted">{reason}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onAskKast}
        className="shrink-0 font-display text-[10px] font-semibold uppercase tracking-nav text-ink underline underline-offset-4 hover:opacity-60 cursor-pointer"
      >
        Preguntar
      </button>
    </div>
  );
}
