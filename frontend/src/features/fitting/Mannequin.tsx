import { ContactShadows } from "@react-three/drei";
import { Suspense } from "react";
import {
  GLB_REFERENCE_LENGTH_M,
  GltfSneaker,
  PLACEHOLDER_LENGTH_M,
} from "@/features/viewer3d/GltfSneaker";
import { PlaceholderSneaker } from "@/features/viewer3d/PlaceholderSneaker";
import type { ProductPalette } from "@/lib/types";
import type { MannequinScale } from "./bodyParams";
import type { BottomGarment, TopGarment } from "./garments";

export function Mannequin({
  scale,
  topGarment,
  bottomGarment,
  topColor,
  bottomColor,
  shoeSilhouette,
  shoePalette,
  shoeModelUrl,
  shoeModelReady = false,
}: {
  scale: MannequinScale;
  topGarment: TopGarment;
  bottomGarment: BottomGarment;
  topColor: string;
  bottomColor: string;
  shoeSilhouette?: string;
  shoePalette?: ProductPalette;
  /** GLB normalizado del producto (base y = 0, punta +X); placeholder si no hay */
  shoeModelUrl?: string;
  shoeModelReady?: boolean;
}) {
  const skinMat = { color: "#CBD5E1", roughness: 0.78, metalness: 0.03 };

  const legLen = 0.82 * scale.heightScale * scale.legScale;
  const torsoLen = 0.52 * scale.heightScale * scale.torsoScale;
  const hipY = 0.08 + legLen;
  const chestY = hipY + torsoLen * 0.54;
  const shoulderY = hipY + torsoLen;
  const neckY = shoulderY + 0.06 * scale.heightScale;
  const headY = neckY + 0.12 * scale.heightScale;

  const shoulderHalf = 0.17 * scale.shoulderScale;
  const hipHalf = 0.095 * scale.hipScale;
  const torsoTopR = 0.14 * scale.shoulderScale;
  const torsoBotR = 0.115 * scale.hipScale;

  const topShellR = topGarment === "buso" ? 1.12 : 1.05;
  const botShellR = bottomGarment === "mochos" ? 1.18 : 1.11;

  return (
    <group>
      {/* Cabeza y cuello */}
      <mesh position={[0, headY, 0]} castShadow>
        <sphereGeometry args={[0.092 * scale.heightScale, 20, 20]} />
        <meshStandardMaterial {...skinMat} />
      </mesh>
      <mesh position={[0, neckY, 0]} castShadow>
        <cylinderGeometry args={[0.042, 0.048, 0.11 * scale.heightScale, 16]} />
        <meshStandardMaterial {...skinMat} />
      </mesh>

      {/* Torso base maniquí */}
      <mesh
        position={[0, chestY, 0]}
        scale={[1, 1, scale.depthScale * 0.68]}
        castShadow
      >
        <cylinderGeometry args={[torsoTopR, torsoBotR, torsoLen, 24]} />
        <meshStandardMaterial {...skinMat} />
      </mesh>

      {/* Prenda superior (camiseta | buso) */}
      <mesh
        position={[0, chestY + 0.01, 0]}
        scale={[topShellR, 0.96, scale.depthScale * 0.72 * topShellR]}
        castShadow
      >
        <cylinderGeometry
          args={[torsoTopR + 0.012, torsoBotR + 0.014, torsoLen * 0.98, 24]}
        />
        <meshStandardMaterial color={topColor} roughness={0.85} />
      </mesh>
      {topGarment === "buso" && (
        <mesh position={[0, shoulderY + 0.01, -0.025]} castShadow>
          <torusGeometry args={[0.075, 0.028, 12, 24]} />
          <meshStandardMaterial color={topColor} roughness={0.85} />
        </mesh>
      )}

      {/* Brazos + mangas */}
      {[-1, 1].map((side) => {
        const armX = side * (shoulderHalf + 0.028);
        const armLen = 0.56 * scale.heightScale;
        const armCenterY = shoulderY - armLen * 0.46;
        return (
          <group key={side}>
            <mesh position={[armX, armCenterY, 0]} rotation={[0, 0, side * 0.08]} castShadow>
              <capsuleGeometry args={[0.036 * scale.shoulderScale, armLen * 0.85, 8, 16]} />
              <meshStandardMaterial {...skinMat} />
            </mesh>
            {topGarment === "buso" ? (
              <mesh
                position={[armX, armCenterY + 0.02, 0]}
                rotation={[0, 0, side * 0.08]}
                castShadow
              >
                <cylinderGeometry
                  args={[0.049 * scale.shoulderScale, 0.042 * scale.shoulderScale, armLen * 0.9, 16]}
                />
                <meshStandardMaterial color={topColor} roughness={0.85} />
              </mesh>
            ) : (
              <mesh
                position={[armX * 0.99, shoulderY - armLen * 0.16, 0]}
                rotation={[0, 0, side * 0.1]}
                castShadow
              >
                <cylinderGeometry
                  args={[0.052 * scale.shoulderScale, 0.048 * scale.shoulderScale, armLen * 0.34, 16]}
                />
                <meshStandardMaterial color={topColor} roughness={0.85} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Cadera y cintura prenda inferior */}
      <mesh
        position={[0, hipY - 0.02, 0]}
        scale={[1, 0.72, scale.depthScale * 0.72]}
        castShadow
      >
        <cylinderGeometry
          args={[torsoBotR * botShellR, hipHalf * 1.15 * botShellR, 0.13, 24]}
        />
        <meshStandardMaterial color={bottomColor} roughness={0.85} />
      </mesh>

      {/* Piernas + prenda inferior (mochos | pantaloneta | sudadera) */}
      {[-1, 1].map((side) => {
        const legX = side * hipHalf;
        const legCenterY = 0.08 + legLen * 0.5;
        const pantFactor =
          bottomGarment === "pantaloneta"
            ? 0.34
            : bottomGarment === "mochos"
              ? 0.54
              : 0.93;
        const garmentLen = legLen * pantFactor;
        const garmentCenterY = hipY - garmentLen * 0.5;

        return (
          <group key={side}>
            {/* Pierna anatómica base */}
            <mesh position={[legX, legCenterY, 0]} castShadow>
              <capsuleGeometry args={[0.048 * scale.hipScale, legLen * 0.88, 8, 16]} />
              <meshStandardMaterial {...skinMat} />
            </mesh>

            {/* Carcasa prenda inferior */}
            <mesh position={[legX, garmentCenterY, 0]} castShadow>
              <cylinderGeometry
                args={[
                  0.068 * scale.hipScale * botShellR,
                  (bottomGarment === "sudadera" ? 0.048 : 0.064) *
                    scale.hipScale *
                    botShellR,
                  garmentLen,
                  18,
                ]}
              />
              <meshStandardMaterial color={bottomColor} roughness={0.86} />
            </mesh>

            {/* Zapatos del producto escalados a la talla del pie (GLB o placeholder) */}
            {shoeModelReady && shoeModelUrl ? (
              <Suspense
                fallback={
                  <PlaceholderSneaker
                    silhouette={shoeSilhouette}
                    palette={shoePalette}
                    scale={scale.footScale}
                    position={[legX, 0.02, 0.045 * scale.footScale]}
                    rotation={[0, -Math.PI / 2, 0]}
                  />
                }
              >
                <GltfSneaker
                  url={shoeModelUrl}
                  scale={(scale.footScale * PLACEHOLDER_LENGTH_M) / GLB_REFERENCE_LENGTH_M}
                  position={[legX, 0, 0.045 * scale.footScale]}
                  rotation={[0, -Math.PI / 2, 0]}
                />
              </Suspense>
            ) : (
              <PlaceholderSneaker
                silhouette={shoeSilhouette}
                palette={shoePalette}
                scale={scale.footScale}
                position={[legX, 0.02, 0.045 * scale.footScale]}
                rotation={[0, -Math.PI / 2, 0]}
              />
            )}
          </group>
        );
      })}

      <ContactShadows
        frames={1}
        resolution={256}
        position={[0, 0, 0]}
        opacity={0.35}
        scale={2.4}
        blur={2}
        far={1.5}
      />
    </group>
  );
}
