import { useFrame, useThree } from "@react-three/fiber";
import { X } from "lucide-react";
import { useEffect, useMemo, type RefObject } from "react";
import { Vector3 } from "three";
import type { ProductHotspot } from "@/lib/types";

/**
 * Ancla 3D en el lienzo que proyecta la coordenada 3D de un hotspot
 * hacia su botón DOM interactivo sin depender de portales secundarios.
 */
export function Hotspot3DAnchor({
  hotspot,
  active,
  containerRef,
}: {
  hotspot: ProductHotspot;
  active: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
}) {
  const { camera, size, invalidate } = useThree();
  const vec = useMemo(() => new Vector3(), []);

  useEffect(() => {
    const el = containerRef.current?.querySelector<HTMLElement>(
      `[data-hotspot-anchor="${hotspot.id}"]`,
    );
    if (!el || size.width === 0 || size.height === 0) return;
    camera.updateMatrixWorld();
    vec.set(hotspot.position[0], hotspot.position[1], hotspot.position[2]);
    vec.project(camera);
    const x = (vec.x * 0.5 + 0.5) * size.width;
    const y = (-vec.y * 0.5 + 0.5) * size.height;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
    el.style.opacity = vec.z > 1 ? "0.25" : "1";
    invalidate();
  }, [camera, size.width, size.height, hotspot.id, hotspot.position, containerRef, vec, invalidate]);

  useFrame(() => {
    const el = containerRef.current?.querySelector<HTMLElement>(
      `[data-hotspot-anchor="${hotspot.id}"]`,
    );
    if (!el || size.width === 0 || size.height === 0) return;
    vec.set(hotspot.position[0], hotspot.position[1], hotspot.position[2]);
    vec.project(camera);
    const x = (vec.x * 0.5 + 0.5) * size.width;
    const y = (-vec.y * 0.5 + 0.5) * size.height;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
    el.style.opacity = vec.z > 1 ? "0.25" : "1";
  });

  return (
    <mesh position={hotspot.position}>
      <sphereGeometry args={[0.008, 12, 12]} />
      <meshStandardMaterial
        color={active ? "#10B981" : "#16302B"}
        emissive={active ? "#10B981" : "#16302B"}
        emissiveIntensity={0.4}
      />
    </mesh>
  );
}

export function HotspotOverlayPin({
  hotspot,
  active,
  onToggle,
}: {
  hotspot: ProductHotspot;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      data-hotspot-anchor={hotspot.id}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        transform: "translate3d(50%, 50%, 0) translate(-50%, -50%)",
      }}
      className="pointer-events-auto"
    >
      <button
        type="button"
        onClick={onToggle}
        data-testid={`hotspot-pin-${hotspot.id}`}
        aria-label={`Ver detalle material: ${hotspot.label}`}
        aria-expanded={active}
        className={[
          "flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-bold shadow-md transition-transform cursor-pointer",
          active
            ? "scale-110 border-white bg-forest text-white"
            : "border-forest bg-canvas text-navy hover:scale-110",
        ].join(" ")}
      >
        {active ? <X className="h-3.5 w-3.5" aria-hidden="true" /> : "+"}
      </button>
    </div>
  );
}
