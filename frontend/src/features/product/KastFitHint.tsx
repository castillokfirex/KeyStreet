import { KastMascot } from "@/components/brand/KastMascot";
import { MotionScope } from "@/components/motion/MotionScope";
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

  const recommended =
    fit === "RUNS_SMALL"
      ? Math.min(44, usualSizeEu + 1)
      : fit === "RUNS_LARGE"
        ? Math.max(36, usualSizeEu - 1)
        : usualSizeEu;

  const fitText =
    fit === "RUNS_SMALL"
      ? `Horma estrecha: te recomendamos talla ${recommended} (+1 EU sobre tu habitual).`
      : fit === "RUNS_LARGE"
        ? `Horma amplia: te recomendamos talla ${recommended}.`
        : `Horma fiel: te recomendamos tu talla habitual ${recommended} EU.`;

  const heightMeters = (heightCm / 100).toFixed(2).replace(".", ",");

  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-surface/75 p-3.5">
      <div className="flex items-start gap-2.5 min-w-0">
        <MotionScope>
          <KastMascot state="idle" size={32} title="Consejo de talla Kast" />
        </MotionScope>
        <div className="text-xs leading-snug">
          <p className="font-semibold text-navy">
            Según tu perfil ({heightMeters} m · talla {usualSizeEu})
          </p>
          <p className="mt-0.5 text-muted">{fitText}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onAskKast}
        className="shrink-0 text-[11px] font-bold text-forest underline hover:opacity-80 cursor-pointer"
      >
        Preguntar
      </button>
    </div>
  );
}
