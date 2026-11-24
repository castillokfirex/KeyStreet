import type { ProductPalette } from "@/lib/types";

export interface PlaceholderSneakerProps {
  silhouette?: string;
  palette?: ProductPalette;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export function PlaceholderSneaker({
  silhouette = "LOW",
  palette,
  scale = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: PlaceholderSneakerProps) {
  const sil = silhouette.toUpperCase();
  const isHigh = sil === "HIGH";
  /** MID: alturas intermedias (mismas que el GLB genérico de scripts/models). */
  const pick = (low: number, mid: number, high: number) =>
    isHigh ? high : sil === "MID" ? mid : low;
  const upperColor = palette?.upper || "#FFFFFF";
  const soleColor = palette?.sole || "#EAEAE6";
  const accentColor = palette?.accent || "#16302B";

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Suela exterior redondeada */}
      <mesh position={[0, -0.011, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 2.2]} castShadow receiveShadow>
        <capsuleGeometry args={[0.02, 0.22, 6, 16]} />
        <meshStandardMaterial color={soleColor} roughness={0.78} metalness={0.04} />
      </mesh>

      {/* Mediasuela curva */}
      <mesh position={[0, 0.004, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 2.15]} castShadow receiveShadow>
        <capsuleGeometry args={[0.019, 0.215, 6, 16]} />
        <meshStandardMaterial color="#F7F7F5" roughness={0.55} />
      </mesh>

      {/* Cuerpo principal / capellada */}
      <mesh position={[-0.025, 0.038, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1.15, 1, 1.45]} castShadow receiveShadow>
        <capsuleGeometry args={[0.028, 0.145, 8, 18]} />
        <meshStandardMaterial color={upperColor} roughness={0.55} />
      </mesh>

      {/* Puntera curva */}
      <mesh position={[0.068, 0.028, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.72, 1, 1.38]} castShadow receiveShadow>
        <capsuleGeometry args={[0.028, 0.07, 8, 18]} />
        <meshStandardMaterial color={upperColor} roughness={0.52} />
      </mesh>

      {/* Caña (LOW / MID / HIGH) */}
      <mesh
        position={[-0.072, pick(0.068, 0.082, 0.098), 0]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry
          args={[0.042, 0.045, pick(0.038, 0.064, 0.094), 24]}
        />
        <meshStandardMaterial color={upperColor} roughness={0.55} />
      </mesh>

      {/* Panel lateral acento */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[-0.01, 0.04, side * 0.043]}
          rotation={[0, 0, Math.PI / 2 - 0.16]}
          castShadow
        >
          <capsuleGeometry args={[0.006, 0.095, 4, 10]} />
          <meshStandardMaterial color={accentColor} roughness={0.42} />
        </mesh>
      ))}

      {/* Contrafuerte del talón */}
      <mesh position={[-0.112, pick(0.048, 0.06, 0.074), 0]} castShadow>
        <capsuleGeometry args={[0.028, pick(0.024, 0.04, 0.056), 6, 14]} />
        <meshStandardMaterial color={accentColor} roughness={0.48} />
      </mesh>

      {/* Lengüeta redondeada */}
      <mesh
        position={[0.006, pick(0.072, 0.086, 0.102), 0]}
        rotation={[0, 0, -0.45]}
        scale={[0.35, 1, 1.1]}
        castShadow
      >
        <capsuleGeometry args={[0.024, 0.035, 6, 12]} />
        <meshStandardMaterial color={upperColor} roughness={0.6} />
      </mesh>

      {/* Cordones */}
      {[0.022, 0.038, 0.054].map((xPos, i) => (
        <mesh key={i} position={[xPos, 0.062 - i * 0.006, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.003, 0.054, 4, 8]} />
          <meshStandardMaterial color={accentColor === upperColor ? "#CBD5E1" : accentColor} />
        </mesh>
      ))}
    </group>
  );
}
