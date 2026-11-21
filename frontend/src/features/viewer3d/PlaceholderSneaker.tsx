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
      {/* Suela exterior */}
      <mesh position={[0, -0.012, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.27, 0.018, 0.096]} />
        <meshStandardMaterial color={soleColor} roughness={0.75} metalness={0.05} />
      </mesh>

      {/* Mediasuela */}
      <mesh position={[0, 0.006, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.264, 0.022, 0.092]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.55} />
      </mesh>

      {/* Capellada trasera y mediopié */}
      <mesh position={[-0.03, 0.045, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.17, 0.062, 0.086]} />
        <meshStandardMaterial color={upperColor} roughness={0.5} />
      </mesh>

      {/* Puntera redondeada (toebox) */}
      <mesh position={[0.078, 0.034, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.1, 0.038, 0.084]} />
        <meshStandardMaterial color={upperColor} roughness={0.5} />
      </mesh>

      {/* Caña alta condicional (HIGH vs LOW) */}
      <mesh
        position={[-0.075, pick(0.068, 0.082, 0.095), 0]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry
          args={[0.043, 0.045, pick(0.038, 0.062, 0.088), 20]}
        />
        <meshStandardMaterial color={upperColor} roughness={0.55} />
      </mesh>

      {/* Panel lateral / swoosh acento */}
      <mesh position={[-0.008, 0.044, 0.044]} rotation={[0, 0, -0.18]} castShadow>
        <boxGeometry args={[0.11, 0.018, 0.006]} />
        <meshStandardMaterial color={accentColor} roughness={0.4} />
      </mesh>
      <mesh position={[-0.008, 0.044, -0.044]} rotation={[0, 0, -0.18]} castShadow>
        <boxGeometry args={[0.11, 0.018, 0.006]} />
        <meshStandardMaterial color={accentColor} roughness={0.4} />
      </mesh>

      {/* Contrafuerte del talón */}
      <mesh position={[-0.116, pick(0.05, 0.061, 0.072), 0]} castShadow>
        <boxGeometry args={[0.012, pick(0.055, 0.072, 0.09), 0.076]} />
        <meshStandardMaterial color={accentColor} roughness={0.45} />
      </mesh>

      {/* Lengüeta */}
      <mesh
        position={[0.01, pick(0.072, 0.086, 0.1), 0]}
        rotation={[0, 0, -0.42]}
        castShadow
      >
        <boxGeometry args={[0.05, 0.055, 0.058]} />
        <meshStandardMaterial color={upperColor} roughness={0.6} />
      </mesh>

      {/* Cordones */}
      {[0.025, 0.042, 0.059].map((xPos, i) => (
        <mesh key={i} position={[xPos, 0.066 - i * 0.006, 0]} castShadow>
          <cylinderGeometry args={[0.0035, 0.0035, 0.062, 8]} />
          <meshStandardMaterial color={accentColor === upperColor ? "#CBD5E1" : accentColor} />
        </mesh>
      ))}
    </group>
  );
}
