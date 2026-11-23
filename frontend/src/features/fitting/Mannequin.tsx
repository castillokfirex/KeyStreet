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
import type { Outfit } from "./garments";

const SKIN = { color: "#CBD5E1", roughness: 0.78, metalness: 0.03 };

function Fabric({
  color,
  roughness = 0.86,
}: {
  color: string;
  roughness?: number;
}) {
  return <meshStandardMaterial color={color} roughness={roughness} />;
}

/** Tono un poco más oscuro para costuras, bolsillos y puños. */
function shade(hex: string, amount = 0.82): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * amount);
  const g = Math.round(((n >> 8) & 255) * amount);
  const b = Math.round((n & 255) * amount);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Longitud de la pierna cubierta por cada prenda inferior (fracción). */
const BOTTOM_COVER: Record<Outfit["bottom"]["type"], number> = {
  pantaloneta: 0.34,
  mochos: 0.54,
  jean: 0.93,
  jogger: 0.91,
  cargo: 0.92,
};

export function Mannequin({
  scale,
  outfit,
  shoeSilhouette,
  shoePalette,
  shoeModelUrl,
  shoeModelReady = false,
}: {
  scale: MannequinScale;
  outfit: Outfit;
  shoeSilhouette?: string;
  shoePalette?: ProductPalette;
  /** GLB normalizado del producto (base y = 0, punta +X); placeholder si no hay */
  shoeModelUrl?: string;
  shoeModelReady?: boolean;
}) {
  const { top, bottom, socks } = outfit;

  const legLen = 0.82 * scale.heightScale * scale.legScale;
  const torsoLen = 0.52 * scale.heightScale * scale.torsoScale;
  const hipY = 0.08 + legLen;
  const chestY = hipY + torsoLen * 0.54;
  const shoulderY = hipY + torsoLen;
  const neckY = shoulderY + 0.06 * scale.heightScale;
  const headY = neckY + 0.12 * scale.heightScale;
  const armLen = 0.56 * scale.heightScale;

  const shoulderHalf = 0.17 * scale.shoulderScale;
  const hipHalf = 0.095 * scale.hipScale;
  const torsoTopR = 0.14 * scale.shoulderScale;
  const torsoBotR = 0.115 * scale.hipScale;
  const depth = scale.depthScale;

  // ---- Prenda superior
  const topShell = {
    camiseta: 1.05,
    oversize: 1.17,
    hoodie: 1.12,
    camisa: 1.06,
  }[top.type];
  const topLen =
    top.type === "oversize"
      ? torsoLen * 1.1
      : top.type === "camisa"
        ? torsoLen * 1.03
        : torsoLen * 0.98;
  const topCenterY = shoulderY - topLen / 2 + 0.005;
  const sleeveFrac = {
    camiseta: 0.34,
    oversize: 0.5,
    hoodie: 0.92,
    camisa: 0.9,
  }[top.type];
  const sleeveR =
    top.type === "oversize" ? 0.06 : top.type === "hoodie" ? 0.05 : 0.047;

  // ---- Prenda inferior
  const cover = BOTTOM_COVER[bottom.type];
  const garmentLen = legLen * cover;
  const garmentCenterY = hipY - garmentLen * 0.5;
  const botShell =
    bottom.type === "mochos" ? 1.18 : bottom.type === "cargo" ? 1.16 : 1.1;
  const legTopR =
    (bottom.type === "cargo" ? 0.074 : 0.068) * scale.hipScale * botShell;
  const legBotR =
    {
      jean: 0.06,
      jogger: 0.046,
      cargo: 0.066,
      mochos: 0.066,
      pantaloneta: 0.066,
    }[bottom.type] *
    scale.hipScale *
    botShell;
  const pantHemY = hipY - garmentLen;

  // ---- Medias: alto visible sobre el zapato
  const sockH =
    socks.type === "altas" ? 0.17 : socks.type === "tobilleras" ? 0.065 : 0;
  const sockR = 0.05 * scale.hipScale;

  return (
    <group>
      {/* Cabeza y cuello */}
      <mesh position={[0, headY, 0]} castShadow>
        <sphereGeometry args={[0.092 * scale.heightScale, 24, 24]} />
        <meshStandardMaterial {...SKIN} />
      </mesh>
      <mesh position={[0, neckY, 0]} castShadow>
        <cylinderGeometry args={[0.042, 0.048, 0.11 * scale.heightScale, 16]} />
        <meshStandardMaterial {...SKIN} />
      </mesh>

      {/* Torso base */}
      <mesh position={[0, chestY, 0]} scale={[1, 1, depth * 0.68]} castShadow>
        <cylinderGeometry args={[torsoTopR, torsoBotR, torsoLen, 24]} />
        <meshStandardMaterial {...SKIN} />
      </mesh>

      {/* ---------------- Prenda superior ---------------- */}
      <mesh
        position={[0, topCenterY, 0]}
        scale={[topShell, 1, depth * 0.72 * topShell]}
        castShadow
      >
        <cylinderGeometry
          args={[
            torsoTopR + 0.012,
            torsoBotR + (top.type === "oversize" ? 0.03 : 0.014),
            topLen,
            28,
          ]}
        />
        <Fabric color={top.color} />
      </mesh>

      {top.type === "hoodie" && (
        <>
          {/* Capucha recogida y bolsillo canguro */}
          <mesh
            position={[0, shoulderY + 0.012, -0.03]}
            rotation={[0.25, 0, 0]}
            castShadow
          >
            <torusGeometry args={[0.078, 0.03, 12, 28]} />
            <Fabric color={top.color} />
          </mesh>
          <mesh
            position={[
              0,
              hipY + torsoLen * 0.22,
              torsoBotR * depth * 0.8 + 0.012,
            ]}
            castShadow
          >
            <boxGeometry args={[0.17 * scale.shoulderScale, 0.09, 0.012]} />
            <Fabric color={shade(top.color, 0.9)} />
          </mesh>
          {/* Cordones */}
          {[-1, 1].map((s) => (
            <mesh
              key={s}
              position={[
                s * 0.025,
                shoulderY - 0.07,
                torsoTopR * depth * 0.82 + 0.01,
              ]}
            >
              <cylinderGeometry args={[0.003, 0.003, 0.11, 6]} />
              <meshStandardMaterial color="#E9E7E1" roughness={0.6} />
            </mesh>
          ))}
        </>
      )}

      {top.type === "camisa" && (
        <>
          {/* Cuello y botonadura */}
          {[-1, 1].map((s) => (
            <mesh
              key={s}
              position={[
                s * 0.035,
                shoulderY - 0.005,
                torsoTopR * depth * 0.7 + 0.012,
              ]}
              rotation={[0.35, 0, s * -0.55]}
              castShadow
            >
              <boxGeometry args={[0.06, 0.035, 0.008]} />
              <Fabric color={shade(top.color, 0.95)} />
            </mesh>
          ))}
          <mesh
            position={[0, topCenterY + 0.01, torsoTopR * depth * 0.8 + 0.008]}
          >
            <boxGeometry args={[0.022, topLen * 0.92, 0.006]} />
            <Fabric color={shade(top.color, 0.93)} />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh
              key={i}
              position={[
                0,
                shoulderY - 0.05 - i * (topLen / 6),
                torsoTopR * depth * 0.8 + 0.013,
              ]}
            >
              <sphereGeometry args={[0.0045, 8, 8]} />
              <meshStandardMaterial color="#D9D6CF" roughness={0.4} />
            </mesh>
          ))}
        </>
      )}

      {/* Brazos + mangas */}
      {[-1, 1].map((side) => {
        const armX = side * (shoulderHalf + 0.028);
        const armCenterY = shoulderY - armLen * 0.46;
        const sleeveLen = armLen * sleeveFrac;
        const sleeveCenterY = shoulderY - sleeveLen / 2 + 0.01;
        const long = sleeveFrac > 0.8;
        return (
          <group key={side}>
            <mesh
              position={[armX, armCenterY, 0]}
              rotation={[0, 0, side * 0.08]}
              castShadow
            >
              <capsuleGeometry
                args={[0.036 * scale.shoulderScale, armLen * 0.85, 8, 16]}
              />
              <meshStandardMaterial {...SKIN} />
            </mesh>
            <mesh
              position={[armX * (long ? 1 : 0.99), sleeveCenterY, 0]}
              rotation={[0, 0, side * (long ? 0.08 : 0.1)]}
              castShadow
            >
              <cylinderGeometry
                args={[
                  (sleeveR + 0.004) * scale.shoulderScale,
                  (long ? sleeveR - 0.008 : sleeveR) * scale.shoulderScale,
                  sleeveLen,
                  18,
                ]}
              />
              <Fabric color={top.color} />
            </mesh>
            {long && (
              <mesh
                position={[
                  armX + side * sleeveLen * 0.08,
                  shoulderY - sleeveLen + 0.02,
                  0,
                ]}
                castShadow
              >
                <cylinderGeometry
                  args={[
                    0.043 * scale.shoulderScale,
                    0.043 * scale.shoulderScale,
                    0.035,
                    16,
                  ]}
                />
                <Fabric color={shade(top.color, 0.88)} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* ---------------- Prenda inferior ---------------- */}
      <mesh
        position={[0, hipY - 0.02, 0]}
        scale={[1, 0.72, depth * 0.72]}
        castShadow
      >
        <cylinderGeometry
          args={[torsoBotR * botShell, hipHalf * 1.15 * botShell, 0.13, 28]}
        />
        <Fabric
          color={bottom.color}
          roughness={bottom.type === "jean" ? 0.92 : 0.86}
        />
      </mesh>
      {/* Pretina */}
      <mesh position={[0, hipY + 0.035, 0]} scale={[1, 1, depth * 0.72]}>
        <cylinderGeometry
          args={[
            torsoBotR * botShell * 1.01,
            torsoBotR * botShell * 1.01,
            0.03,
            28,
          ]}
        />
        <Fabric color={shade(bottom.color, 0.85)} />
      </mesh>

      {[-1, 1].map((side) => {
        const legX = side * hipHalf;
        const legCenterY = 0.08 + legLen * 0.5;

        return (
          <group key={side}>
            {/* Pierna base */}
            <mesh position={[legX, legCenterY, 0]} castShadow>
              <capsuleGeometry
                args={[0.048 * scale.hipScale, legLen * 0.88, 8, 16]}
              />
              <meshStandardMaterial {...SKIN} />
            </mesh>

            {/* Pierna de la prenda */}
            <mesh position={[legX, garmentCenterY, 0]} castShadow>
              <cylinderGeometry args={[legTopR, legBotR, garmentLen, 20]} />
              <Fabric
                color={bottom.color}
                roughness={bottom.type === "jean" ? 0.92 : 0.86}
              />
            </mesh>

            {bottom.type === "jogger" && (
              <mesh position={[legX, pantHemY + 0.018, 0]} castShadow>
                <cylinderGeometry
                  args={[legBotR * 0.92, legBotR * 0.92, 0.04, 18]}
                />
                <Fabric color={shade(bottom.color, 0.85)} />
              </mesh>
            )}
            {bottom.type === "jean" && (
              <mesh
                position={[legX + side * legTopR * 0.98, garmentCenterY, 0]}
              >
                <boxGeometry args={[0.003, garmentLen * 0.96, 0.01]} />
                <meshStandardMaterial color="#B89B6A" roughness={0.8} />
              </mesh>
            )}
            {bottom.type === "cargo" && (
              <mesh
                position={[
                  legX + side * (legTopR + 0.008),
                  hipY - garmentLen * 0.42,
                  0.005,
                ]}
                castShadow
              >
                <boxGeometry args={[0.018, 0.1, 0.085]} />
                <Fabric color={shade(bottom.color, 0.9)} />
              </mesh>
            )}

            {/* Medias */}
            {sockH > 0 && (
              <mesh position={[legX, 0.05 + sockH / 2, 0.01]} castShadow>
                <cylinderGeometry
                  args={[sockR * 1.06, sockR * 1.12, sockH, 18]}
                />
                <Fabric color={socks.color} roughness={0.95} />
              </mesh>
            )}

            {/* Zapato del producto escalado a la talla del pie (GLB o placeholder) */}
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
                  scale={
                    (scale.footScale * PLACEHOLDER_LENGTH_M) /
                    GLB_REFERENCE_LENGTH_M
                  }
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
