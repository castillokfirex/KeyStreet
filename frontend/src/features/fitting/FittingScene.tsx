import { CameraControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import type { ProductDetailDto } from "@/lib/types";
import type { BodyStyle, FacialHair, HairStyle } from "./avatarAppearance";
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
  heightScale,
}: {
  view: CameraView;
  spinning: boolean;
  heightScale: number;
}) {
  const controlsRef = useRef<CameraControls>(null);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    invalidate();
    if (view === "feet") {
      void ctrl.setLookAt(0.24, 0.25, 0.84, 0, 0.09, 0.04, true);
    } else {
      void ctrl.setLookAt(
        0.38,
        1.02 * heightScale,
        3.05,
        0,
        0.88 * heightScale,
        0,
        true,
      );
    }
  }, [view, heightScale, invalidate]);

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
  bodyStyle,
  skinTone,
  hairStyle,
  hairColor,
  facialHair,
  view,
  spinning,
}: {
  product: ProductDetailDto;
  outfit: Outfit;
  scale: MannequinScale;
  bodyStyle: BodyStyle;
  skinTone: string;
  hairStyle: HairStyle;
  hairColor: string;
  facialHair: FacialHair;
  view: CameraView;
  spinning: boolean;
}) {
  const version = JSON.stringify([
    outfit,
    scale,
    view,
    bodyStyle,
    skinTone,
    hairStyle,
    hairColor,
    facialHair,
  ]);
  return (
    <Canvas
      shadows
      frameloop={spinning ? "always" : "demand"}
      dpr={[1, 1.5]}
      camera={{ position: [0.38, 1.02 * scale.heightScale, 3.05], fov: 38 }}
    >
      <color attach="background" args={["#F1F1EF"]} />
      <hemisphereLight args={["#FFFDF9", "#DCE3EC", 0.82]} />
      <directionalLight
        position={[2.4, 3.8, 3.2]}
        intensity={1.25}
        color="#FFFDF8"
        castShadow
      />
      <directionalLight
        position={[-2.6, 2.2, 1.8]}
        intensity={0.45}
        color="#E8F0FA"
      />
      <directionalLight position={[0, 2.5, -2.6]} intensity={0.55} />
      <SceneInvalidator version={version} />
      <Suspense fallback={null}>
        <Mannequin
          scale={scale}
          outfit={outfit}
          bodyStyle={bodyStyle}
          skinTone={skinTone}
          hairStyle={hairStyle}
          hairColor={hairColor}
          facialHair={facialHair}
          shoeSilhouette={product.silhouette}
          shoePalette={product.materialSpecs?.palette}
          shoeModelUrl={product.model3dUrl}
          shoeModelReady={product.model3dReady}
        />
      </Suspense>
      <CameraRig
        view={view}
        spinning={spinning}
        heightScale={scale.heightScale}
      />
    </Canvas>
  );
}
