import { CameraControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Camera, CheckCircle2, ShieldAlert } from "lucide-react";
import { Suspense, useEffect, useRef, useState, type ChangeEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import type { ProductDetailDto } from "@/lib/types";
import { useFitProfileStore } from "@/stores/fitProfile";
import { BodyForm } from "./BodyForm";
import { computeMannequinScale } from "./bodyParams";
import {
  BOTTOM_GARMENT_OPTIONS,
  GARMENT_SWATCHES,
  TOP_GARMENT_OPTIONS,
  type BottomGarment,
  type TopGarment,
} from "./garments";
import { Mannequin } from "./Mannequin";
import { estimatePoseFromFile } from "./PhotoPoseEstimator";

function SceneInvalidator({ version }: { version: string }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  }, [invalidate, version]);
  return null;
}

function FittingCameraRig({ mode }: { mode: "full" | "feet" }) {
  const controlsRef = useRef<CameraControls>(null);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    invalidate();
    if (mode === "feet") {
      void ctrl.setLookAt(0.18, 0.24, 0.72, 0, 0.09, 0.04, true);
    } else {
      void ctrl.setLookAt(0.28, 1.05, 2.35, 0, 0.88, 0, true);
    }
  }, [mode, invalidate]);

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      minDistance={0.45}
      maxDistance={4.2}
    />
  );
}

export function FittingRoom({
  product,
  cameraMode,
}: {
  product: ProductDetailDto;
  cameraMode: "full" | "feet";
}) {
  const heightCm = useFitProfileStore((s) => s.heightCm);
  const build = useFitProfileStore((s) => s.build);
  const usualSizeEu = useFitProfileStore((s) => s.usualSizeEu);
  const ratios = useFitProfileStore((s) => s.ratios);
  const setPhotoProfile = useFitProfileStore((s) => s.setPhotoProfile);

  const [topGarment, setTopGarment] = useState<TopGarment>("buso");
  const [bottomGarment, setBottomGarment] = useState<BottomGarment>("mochos");
  const [topColor, setTopColor] = useState("#525866");
  const [bottomColor, setBottomColor] = useState("#1F2937");
  const [photoStatus, setPhotoStatus] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [estimating, setEstimating] = useState(false);

  const scale = computeMannequinScale({
    heightCm,
    build,
    usualSizeEu,
    ratios,
  });

  const handlePhotoSelect = async (e: ChangeEvent<HTMLInputElement>) => {
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
          : "No pudimos analizar los puntos corporales. Ajusta manualmente.",
      );
    } finally {
      setEstimating(false);
    }
  };

  return (
    <div
      data-testid="fitting-room"
      data-camera-mode={cameraMode}
      className="flex h-full flex-col justify-between"
    >
      {/* Lienzo 3D del maniquí */}
      <div className="relative flex-1 min-h-0">
        <Canvas
          shadows
          frameloop="demand"
          dpr={[1, 1.4]}
          camera={{ position: [0.28, 1.05, 2.35], fov: 40 }}
        >
          <color attach="background" args={["#F5F6F8"]} />
          <ambientLight intensity={0.9} />
          <directionalLight position={[2.5, 4, 3]} intensity={1.15} castShadow />
          <directionalLight position={[-2, 2.5, -2]} intensity={0.45} />

          <SceneInvalidator
            version={`${heightCm}-${build}-${usualSizeEu}-${topGarment}-${bottomGarment}-${topColor}-${bottomColor}-${cameraMode}`}
          />

          <Suspense fallback={null}>
            <Mannequin
              scale={scale}
              topGarment={topGarment}
              bottomGarment={bottomGarment}
              topColor={topColor}
              bottomColor={bottomColor}
              shoeSilhouette={product.silhouette}
              shoePalette={product.materialSpecs?.palette}
              shoeModelUrl={product.model3dUrl}
              shoeModelReady={product.model3dReady}
            />
          </Suspense>

          <FittingCameraRig mode={cameraMode} />
        </Canvas>
      </div>

      {/* Controles integrados debajo sin salir del layout */}
      <div className="border-t border-line bg-canvas/95 p-3.5 space-y-3">
        {/* Foto efímera + badges */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="inline-flex items-center gap-2 rounded-xl border border-forest bg-mint/60 px-3 py-1.5 text-xs font-bold text-forest hover:bg-mint cursor-pointer">
            <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {estimating
                ? "Analizando pose localmente..."
                : "Foto corporal (borrado instantáneo)"}
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              data-testid="fitting-photo-input"
              className="sr-only"
            />
          </label>

          <div className="flex items-center gap-2">
            {photoStatus && (
              <Badge tone="mint" className="gap-1">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                <span>{photoStatus}</span>
              </Badge>
            )}
            <span className="text-[11px] text-muted">
              Pie: <strong className="text-navy">{scale.footLengthCm} cm</strong>
            </span>
          </div>
        </div>

        {photoError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-950"
          >
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{photoError}</span>
          </div>
        )}

        {/* Prendas & tonos */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {TOP_GARMENT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={topGarment === opt.id}
                onClick={() => setTopGarment(opt.id)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border cursor-pointer ${
                  topGarment === opt.id
                    ? "bg-navy text-white border-navy"
                    : "bg-surface text-navy border-line"
                }`}
              >
                {opt.label}
              </button>
            ))}
            {BOTTOM_GARMENT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={bottomGarment === opt.id}
                onClick={() => setBottomGarment(opt.id)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border cursor-pointer ${
                  bottomGarment === opt.id
                    ? "bg-forest text-white border-forest"
                    : "bg-surface text-navy border-line"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5" role="group" aria-label="Color de prendas">
            {GARMENT_SWATCHES.map((sw) => (
              <button
                key={sw.hex}
                type="button"
                title={sw.name}
                aria-label={`Color ${sw.name}`}
                onClick={() => {
                  setTopColor(sw.hex);
                  setBottomColor(sw.hex === "#E5E7EB" ? "#1F2937" : sw.hex);
                }}
                className={`h-5 w-5 rounded-full border cursor-pointer ${
                  topColor === sw.hex
                    ? "ring-2 ring-forest ring-offset-1 border-white"
                    : "border-line"
                }`}
                style={{ backgroundColor: sw.hex }}
              />
            ))}
          </div>
        </div>

        <BodyForm />
      </div>
    </div>
  );
}
