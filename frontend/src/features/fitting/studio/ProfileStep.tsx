import {
  Camera,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { useFitProfileStore, type BodyBuild } from "@/stores/fitProfile";
import { clamp, footLengthCm } from "../bodyParams";
import { estimatePoseFromFile } from "../PhotoPoseEstimator";
import { OptionChip, SectionLabel } from "./controls";

const BUILDS: { id: BodyBuild; label: string }[] = [
  { id: "delgada", label: "Delgada" },
  { id: "media", label: "Media" },
  { id: "atletica", label: "Atlética" },
  { id: "robusta", label: "Robusta" },
];

const SIZES = [36, 37, 38, 39, 40, 41, 42, 43, 44];
const MIN_H = 140;
const MAX_H = 210;

export function ProfileStep() {
  const heightCm = useFitProfileStore((s) => s.heightCm);
  const build = useFitProfileStore((s) => s.build);
  const usualSizeEu = useFitProfileStore((s) => s.usualSizeEu);
  const source = useFitProfileStore((s) => s.source);
  const patchProfile = useFitProfileStore((s) => s.patchProfile);
  const setPhotoProfile = useFitProfileStore((s) => s.setPhotoProfile);
  const resetProfile = useFitProfileStore((s) => s.resetProfile);

  const [heightDraft, setHeightDraft] = useState<string | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [photoStatus, setPhotoStatus] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const draftNumber = heightDraft === null ? heightCm : Number(heightDraft);
  const heightInvalid =
    heightDraft !== null &&
    (!Number.isFinite(draftNumber) ||
      draftNumber < MIN_H ||
      draftNumber > MAX_H);

  const commitHeight = () => {
    if (heightDraft === null) return;
    const n = Number(heightDraft);
    if (Number.isFinite(n) && heightDraft.trim() !== "") {
      patchProfile({ heightCm: Math.round(clamp(n, MIN_H, MAX_H)) });
    }
    setHeightDraft(null);
  };

  const handlePhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setEstimating(true);
    setPhotoStatus(null);
    setPhotoError(null);
    try {
      const result = await estimatePoseFromFile(file, heightCm, input);
      setPhotoProfile({
        heightCm: result.heightCm,
        build: result.build,
        usualSizeEu,
        ratios: result.ratios,
      });
      setPhotoStatus("Foto eliminada ✓");
    } catch (err) {
      setPhotoStatus("Foto eliminada ✓");
      setPhotoError(
        err instanceof Error
          ? err.message
          : "No pudimos leer tu postura. Ajusta tus medidas a mano.",
      );
    } finally {
      setEstimating(false);
    }
  };

  return (
    <div className="space-y-7">
      {/* Foto efímera */}
      <section>
        <SectionLabel>Desde una foto</SectionLabel>
        <label
          className={`group flex cursor-pointer items-center gap-3 border border-dashed px-4 py-4 transition-colors ${
            estimating
              ? "border-ink bg-white"
              : "border-ink/30 bg-white/60 hover:border-ink hover:bg-white"
          }`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-ink text-canvas transition-transform duration-300 group-hover:-rotate-6">
            {estimating ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Camera className="h-4 w-4" aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink">
              {estimating
                ? "Analizando tu postura…"
                : "Usar una foto de cuerpo entero"}
            </span>
            <span className="mt-0.5 block text-xs leading-snug text-muted">
              De frente y con buena luz. Se analiza en tu equipo y se borra al
              instante.
            </span>
          </span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhoto}
            disabled={estimating}
            data-testid="fitting-photo-input"
            className="sr-only"
          />
        </label>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.12em]">
          <span className="inline-flex items-center gap-1 text-sale-text">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Nunca sale de tu dispositivo
          </span>
          {photoStatus && (
            <span
              role="status"
              className="ks-rise inline-flex items-center gap-1 text-ink"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {photoStatus}
            </span>
          )}
        </div>

        {photoError && (
          <p
            role="alert"
            className="ks-rise mt-3 flex items-start gap-2 border-l-2 border-kast-thinking bg-kast-thinking/[0.08] px-3 py-2 text-xs text-ink"
          >
            <ShieldAlert
              className="mt-px h-3.5 w-3.5 shrink-0 text-kast-thinking"
              aria-hidden="true"
            />
            {photoError}
          </p>
        )}
      </section>

      <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-gray">
        <span className="h-px flex-1 bg-line" />o a mano
        <span className="h-px flex-1 bg-line" />
      </div>

      {/* Estatura */}
      <section>
        <SectionLabel
          aside={
            source === "photo" ? "Proporciones tomadas de tu foto" : undefined
          }
        >
          Estatura
        </SectionLabel>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={MIN_H}
            max={MAX_H}
            step={1}
            value={heightCm}
            onChange={(e) => patchProfile({ heightCm: Number(e.target.value) })}
            aria-label="Estatura en centímetros"
            className="h-1 flex-1 cursor-pointer accent-ink"
          />
          <div className="flex items-baseline gap-1">
            <input
              type="number"
              inputMode="numeric"
              min={MIN_H}
              max={MAX_H}
              value={heightDraft ?? String(heightCm)}
              onChange={(e) => setHeightDraft(e.target.value)}
              onBlur={commitHeight}
              onKeyDown={(e) => e.key === "Enter" && commitHeight()}
              aria-label="Estatura exacta"
              aria-invalid={heightInvalid}
              aria-describedby={heightInvalid ? "fit-height-error" : undefined}
              className="h-10 w-[4.5rem] border border-line bg-white/70 text-center font-mono text-sm text-ink focus:border-ink focus:outline-none aria-[invalid=true]:border-kast-error"
            />
            <span className="font-mono text-xs text-muted">cm</span>
          </div>
        </div>
        {heightInvalid && (
          <p id="fit-height-error" className="mt-1.5 text-xs text-kast-error">
            Usa una estatura entre {MIN_H} y {MAX_H} cm.
          </p>
        )}
      </section>

      {/* Complexión */}
      <section>
        <SectionLabel>Complexión</SectionLabel>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-2">
          {BUILDS.map((b) => (
            <OptionChip
              key={b.id}
              active={build === b.id}
              onClick={() => patchProfile({ build: b.id })}
            >
              {b.label}
            </OptionChip>
          ))}
        </div>
      </section>

      {/* Talla habitual */}
      <section>
        <SectionLabel
          aside={`Pie aprox. ${footLengthCm(usualSizeEu).toFixed(1).replace(".", ",")} cm`}
        >
          Tu talla habitual (EU)
        </SectionLabel>
        <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-9 lg:grid-cols-5">
          {SIZES.map((s) => (
            <OptionChip
              key={s}
              active={usualSizeEu === s}
              onClick={() => patchProfile({ usualSizeEu: s })}
              label={`Talla habitual ${s}`}
            >
              {s}
            </OptionChip>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={() => {
          resetProfile();
          setPhotoStatus(null);
          setPhotoError(null);
          setHeightDraft(null);
        }}
        className="inline-flex cursor-pointer items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-ink"
      >
        <RotateCcw className="h-3 w-3" aria-hidden="true" />
        Restablecer mi perfil
      </button>
    </div>
  );
}
