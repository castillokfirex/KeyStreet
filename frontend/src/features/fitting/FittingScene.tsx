import { CameraControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import type { ProductDetailDto } from "@/lib/types";
import type { MannequinScale } from "./bodyParams";
import type { Outfit } from "./garments";
import { Mannequin } from "./Mannequin";

export type CameraView = "body" | "feet";

function SceneInvalidator({ version }: { version: string }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  }, [invalidate, version]);
  return null;
}

function CameraRig({
  view,
  spinning,
}: {
  view: CameraView;
  spinning: boolean;
}) {
  const controlsRef = useRef<CameraControls>(null);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    invalidate();
    if (view === "feet") {
      void ctrl.setLookAt(0.2, 0.26, 0.78, 0, 0.09, 0.04, true);
    } else {
      void ctrl.setLookAt(0.35, 1.0, 3.05, 0, 0.86, 0, true);
    }
  }, [view, invalidate]);

  // Giro automático alrededor del avatar
  useFrame((_, delta) => {
    if (!spinning || !controlsRef.current) return;
    controlsRef.current.azimuthAngle += delta * 0.6;
  });

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      minDistance={0.45}
      maxDistance={4.2}
    />
  );
}

export function FittingScene({
  product,
  outfit,
  scale,
  view,
  spinning,
}: {
  product: ProductDetailDto;
  outfit: Outfit;
  scale: MannequinScale;
  view: CameraView;
  spinning: boolean;
}) {
  const version = JSON.stringify([outfit, scale, view]);
  return (
    <Canvas
      shadows
      frameloop={spinning ? "always" : "demand"}
      dpr={[1, 1.5]}
      camera={{ position: [0.35, 1.0, 3.05], fov: 38 }}
    >
      <color attach="background" args={["#F1F1EF"]} />
      <hemisphereLight args={["#ffffff", "#d9d6cf", 0.75]} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.25} castShadow />
      <directionalLight position={[-2.5, 2.2, -2]} intensity={0.5} />
      <SceneInvalidator version={version} />
      <Suspense fallback={null}>
        <Mannequin
          scale={scale}
          outfit={outfit}
          shoeSilhouette={product.silhouette}
          shoePalette={product.materialSpecs?.palette}
          shoeModelUrl={product.model3dUrl}
          shoeModelReady={product.model3dReady}
        />
      </Suspense>
      <CameraRig view={view} spinning={spinning} />
    </Canvas>
  );
}
