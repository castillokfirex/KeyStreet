import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import type { Mesh } from "three";

/**
 * Convenciones de los .glb del catálogo (scripts/models/validate-models.mjs):
 * Y arriba, punta hacia +X, centrado en X/Z, base en y = 0, largo ≈ 0,29 m.
 *
 * El PlaceholderSneaker procedural usa otro marco (suela en y = -0,021 y
 * 0,27 m de largo); estas constantes alinean ambos en el visor y el probador.
 */
export const PLACEHOLDER_FLOOR_Y = -0.021;
export const PLACEHOLDER_LENGTH_M = 0.27;
export const GLB_REFERENCE_LENGTH_M = 0.29;

export interface GltfSneakerProps {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

/** Zapato GLB (meshopt) clonado por instancia, con sombras. */
export function GltfSneaker({ url, position, rotation, scale = 1 }: GltfSneakerProps) {
  const { scene } = useGLTF(url);
  const object = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((node) => {
      if ((node as Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={object} />
    </group>
  );
}
