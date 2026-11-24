import { ContactShadows, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import type { Group, Mesh, MeshStandardMaterial, Object3D } from "three";
import {
  GLB_REFERENCE_LENGTH_M,
  GltfSneaker,
  PLACEHOLDER_LENGTH_M,
} from "@/features/viewer3d/GltfSneaker";
import { PlaceholderSneaker } from "@/features/viewer3d/PlaceholderSneaker";
import type { ProductPalette } from "@/lib/types";
import {
  blendHex,
  type BodyStyle,
  type FacialHair,
  type HairStyle,
} from "./avatarAppearance";
import type { MannequinScale } from "./bodyParams";
import type { Outfit } from "./garments";

const AVATAR_URLS: Record<BodyStyle, string> = {
  masculino: "/assets/avatars/avatar-masculino.glb?v=2",
  femenino: "/assets/avatars/avatar-femenino.glb?v=2",
};

const ANKLE_HALF_X: Record<BodyStyle, number> = {
  masculino: 0.113,
  femenino: 0.092,
};

/** Tono un poco más oscuro para sombras de piel, costuras, bolsillos y puños. */
function shade(hex: string, amount = 0.84): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * amount)));
  const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * amount)));
  const b = Math.min(255, Math.max(0, Math.round((n & 255) * amount)));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

interface AvatarRigMeta {
  hipY: number;
  neckY: number;
}

function cloneAvatarScene(source: Group): {
  cloned: Group;
  meta: AvatarRigMeta;
} {
  const root = source.clone(true);
  const clonedMaterials = new Map<string, MeshStandardMaterial>();
  let hipY = 0.98;
  let neckY = 1.43;

  root.traverse((obj: Object3D) => {
    if (obj.name === "LowerBody") {
      const ud = obj.userData as Partial<AvatarRigMeta>;
      if (typeof ud.hipY === "number") hipY = ud.hipY;
      if (typeof ud.neckY === "number") neckY = ud.neckY;
    }
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const cloneMat = (m: MeshStandardMaterial) => {
      const existing = clonedMaterials.get(m.name);
      if (existing) return existing;
      const next = m.clone();
      clonedMaterials.set(m.name, next);
      return next;
    };
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((m) =>
        cloneMat(m as MeshStandardMaterial),
      );
    } else if (mesh.material) {
      mesh.material = cloneMat(mesh.material as MeshStandardMaterial);
    }
  });

  return { cloned: root, meta: { hipY, neckY } };
}

export interface AvatarSyncParams {
  bodyStyle: BodyStyle;
  skinTone: string;
  hairStyle: HairStyle;
  hairColor: string;
  facialHair: FacialHair;
  scale: MannequinScale;
  outfit: Outfit;
  meta: AvatarRigMeta;
}

/**
 * Sincroniza visibilidad de piezas, materiales PBR y escalas anatómicas sobre el grafo
 * clonado del avatar. IMPORTANTE: GLTFLoader convierte mallas multi-material (como
 * `Top_*` y `Bottom_*`) en un `Group("Top_oversize")` con hijos `Mesh("Top_oversize_1")`,
 * por lo que la visibilidad SOLO debe evaluarse en los slots hijos directos de
 * `LowerBody`, `UpperBody` y `HeadGroup` sin apagar las submallas internas.
 */
export function syncAvatarSceneGraph(
  root: Object3D,
  params: AvatarSyncParams,
): Object3D | null {
  const {
    bodyStyle,
    skinTone,
    hairStyle,
    hairColor,
    facialHair,
    scale,
    outfit,
    meta,
  } = params;

  const legYScale = scale.heightScale * scale.legScale;
  const torsoYScale = scale.heightScale * scale.torsoScale;
  const headScale = Math.max(
    0.88,
    Math.min(1.12, 0.88 + (scale.heightScale - 0.88) * 0.55),
  );

  const activeTop = `Top_${outfit.top.type}`;
  const activeBottom = `Bottom_${outfit.bottom.type}`;
  const activeSocks =
    outfit.socks.type === "ninguna" ? null : `Socks_${outfit.socks.type}`;
  const activeHair = `Hair_${hairStyle}`;
  const activeBeard =
    bodyStyle === "masculino" && facialHair !== "ninguno"
      ? `Beard_${facialHair}`
      : null;

  const paletteByMat: Record<string, { hex: string; rough?: number }> = {
    Mat_Skin: { hex: skinTone, rough: 0.66 },
    Mat_SkinShade: { hex: shade(skinTone, 0.88), rough: 0.72 },
    Mat_Hair: { hex: hairColor },
    Mat_Eyebrows: { hex: blendHex(hairColor, "#1A1715", 0.35) },
    Mat_Beard: {
      hex:
        facialHair === "sombra"
          ? blendHex(skinTone, hairColor, 0.55)
          : hairColor,
    },
    Mat_Top: { hex: outfit.top.color },
    Mat_TopAccent: { hex: shade(outfit.top.color, 0.88) },
    Mat_Bottom: { hex: outfit.bottom.color },
    Mat_BottomAccent: { hex: shade(outfit.bottom.color, 0.86) },
    Mat_Socks: { hex: outfit.socks.color },
  };

  let upperNode: Object3D | null = null;

  root.traverse((obj: Object3D) => {
    const { name } = obj;
    const parentName = obj.parent?.name;
    const isPartSlot =
      parentName === "LowerBody" ||
      parentName === "UpperBody" ||
      parentName === "HeadGroup";

    if (isPartSlot) {
      if (name.startsWith("Top_")) {
        obj.visible = name === activeTop;
      } else if (name.startsWith("Bottom_")) {
        obj.visible = name === activeBottom;
      } else if (name.startsWith("Socks_")) {
        obj.visible = activeSocks !== null && name === activeSocks;
      } else if (name.startsWith("Hair_")) {
        obj.visible = name === activeHair;
      } else if (name.startsWith("Beard_")) {
        obj.visible = activeBeard !== null && name === activeBeard;
      } else if (name === "Ankle_Bridge" || name === "Head_Base") {
        obj.visible = true;
      }
    }

    if (name === "LowerBody") {
      obj.scale.set(
        scale.hipScale,
        legYScale,
        scale.depthScale * scale.hipScale,
      );
    } else if (name === "UpperBody") {
      upperNode = obj;
      obj.position.set(0, meta.hipY * legYScale, 0);
      obj.scale.set(
        scale.shoulderScale,
        torsoYScale,
        scale.depthScale * scale.shoulderScale,
      );
    } else if (name === "HeadGroup") {
      const scaledNeckY =
        meta.hipY * legYScale + (meta.neckY - meta.hipY) * torsoYScale;
      obj.position.set(0, scaledNeckY, 0);
      obj.scale.setScalar(headScale);
    }

    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    for (const m of mats) {
      const std = m as MeshStandardMaterial | undefined;
      const spec = std ? paletteByMat[std.name] : undefined;
      if (std && spec) {
        std.color.set(spec.hex);
        if (spec.rough !== undefined) std.roughness = spec.rough;
      }
    }
  });

  return upperNode;
}

function AvatarBody({
  bodyStyle,
  skinTone,
  hairStyle,
  hairColor,
  facialHair,
  scale,
  outfit,
}: {
  bodyStyle: BodyStyle;
  skinTone: string;
  hairStyle: HairStyle;
  hairColor: string;
  facialHair: FacialHair;
  scale: MannequinScale;
  outfit: Outfit;
}) {
  const { scene } = useGLTF(AVATAR_URLS[bodyStyle]);
  const invalidate = useThree((s) => s.invalidate);
  const rootRef = useRef<Group | null>(null);
  const upperRef = useRef<Object3D | null>(null);

  const { cloned, meta } = useMemo(() => cloneAvatarScene(scene), [scene]);
  const torsoYScale = scale.heightScale * scale.torsoScale;

  // Sincroniza visibilidad de piezas, colores PBR y proporciones anatómicas sobre el ref
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    upperRef.current = syncAvatarSceneGraph(root, {
      bodyStyle,
      skinTone,
      hairStyle,
      hairColor,
      facialHair,
      scale,
      outfit,
      meta,
    });
    invalidate();
  }, [
    bodyStyle,
    cloned,
    facialHair,
    hairColor,
    hairStyle,
    invalidate,
    meta,
    outfit,
    scale,
    skinTone,
  ]);

  // Sutil respiración cuando el loop de render está activo (p. ej. al girar)
  useFrame(({ clock }) => {
    if (!upperRef.current) return;
    upperRef.current.scale.y =
      torsoYScale * (1 + Math.sin(clock.getElapsedTime() * 1.6) * 0.004);
  });

  return (
    <group ref={rootRef}>
      <primitive object={cloned} />
    </group>
  );
}

export function Mannequin({
  scale,
  outfit,
  bodyStyle = "masculino",
  skinTone = "#DFAC84",
  hairStyle = "corto",
  hairColor = "#181616",
  facialHair = "ninguno",
  shoeSilhouette,
  shoePalette,
  shoeModelUrl,
  shoeModelReady = false,
}: {
  scale: MannequinScale;
  outfit: Outfit;
  bodyStyle?: BodyStyle;
  skinTone?: string;
  hairStyle?: HairStyle;
  hairColor?: string;
  facialHair?: FacialHair;
  shoeSilhouette?: string;
  shoePalette?: ProductPalette;
  /** GLB normalizado del producto (base y = 0, punta +X); placeholder si no hay */
  shoeModelUrl?: string;
  shoeModelReady?: boolean;
}) {
  const ankleSpanX = ANKLE_HALF_X[bodyStyle] * scale.hipScale;
  const shoePosZ = 0.045 * scale.footScale;

  return (
    <group>
      <Suspense fallback={null}>
        <AvatarBody
          bodyStyle={bodyStyle}
          skinTone={skinTone}
          hairStyle={hairStyle}
          hairColor={hairColor}
          facialHair={facialHair}
          scale={scale}
          outfit={outfit}
        />
      </Suspense>

      {/* Ambos tenis calzados en los tobillos y orientados al frente (+Z) */}
      {([-1, 1] as const).map((side) => {
        const legX = side * ankleSpanX;
        const rotY = -Math.PI / 2 + side * 0.06;
        return shoeModelReady && shoeModelUrl ? (
          <Suspense
            key={side}
            fallback={
              <PlaceholderSneaker
                silhouette={shoeSilhouette}
                palette={shoePalette}
                scale={scale.footScale}
                position={[legX, 0.02, shoePosZ]}
                rotation={[0, rotY, 0]}
              />
            }
          >
            <GltfSneaker
              url={shoeModelUrl}
              scale={
                (scale.footScale * PLACEHOLDER_LENGTH_M) /
                GLB_REFERENCE_LENGTH_M
              }
              position={[legX, 0, shoePosZ]}
              rotation={[0, rotY, 0]}
            />
          </Suspense>
        ) : (
          <PlaceholderSneaker
            key={side}
            silhouette={shoeSilhouette}
            palette={shoePalette}
            scale={scale.footScale}
            position={[legX, 0.02, shoePosZ]}
            rotation={[0, rotY, 0]}
          />
        );
      })}

      {/* Base circular sutil de estudio */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.002, 0]}
        receiveShadow
      >
        <circleGeometry args={[0.78, 48]} />
        <meshStandardMaterial color="#E6E6E2" roughness={0.95} />
      </mesh>

      <ContactShadows
        frames={1}
        resolution={256}
        position={[0, 0, 0]}
        opacity={0.36}
        scale={2.4}
        blur={2}
        far={1.5}
      />
    </group>
  );
}
