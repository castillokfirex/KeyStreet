import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { RotateCw, Sparkles, X } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import type { ProductDetailDto } from "@/lib/types";
import { GltfSneaker, PLACEHOLDER_FLOOR_Y } from "./GltfSneaker";
import { Hotspot3DAnchor, HotspotOverlayPin } from "./Hotspot";
import { PlaceholderSneaker } from "./PlaceholderSneaker";

export function Viewer3D({
  product,
  onAskKast,
}: {
  product: ProductDetailDto;
  onAskKast: (question: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        setInView(entries[0]?.isIntersecting ?? true);
      },
      { threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const specs = product.materialSpecs ?? {};
  const hotspots = specs.hotspots ?? [
    {
      id: "upper",
      label: specs.upper || "Capellada técnica",
      normal: [0, 0, 1] as [number, number, number],
      position: [0.02, 0.06, 0.05] as [number, number, number],
    },
    {
      id: "outsole",
      label: specs.outsole || "Suela vulcanizada de agarre",
      normal: [0, -1, 0] as [number, number, number],
      position: [0, -0.01, 0] as [number, number, number],
    },
  ];

  const getDetailText = (id: string): string => {
    if (id === "upper") return specs.upper || "Material exterior resistente y transpirable.";
    if (id === "midsole") return specs.midsole || "Amortiguación ergonómica de alto retorno.";
    if (id === "outsole") return specs.outsole || "Caucho de tracción multi-direccional.";
    return specs.care?.[0] || "Limpieza en seco o con paño ligeramente húmedo.";
  };

  const activeHotspot =
    hotspots.find((h) => h.id === activeHotspotId) ?? null;

  return (
    <div
      ref={containerRef}
      data-testid="viewer3d-canvas-container"
      className="relative h-full w-full"
    >
      <Canvas
        shadows
        dpr={[1, 1.5]}
        frameloop={inView ? (autoRotate ? "always" : "demand") : "never"}
        // Encuadre para un zapato de ~0,29 m en el contenedor vertical 3:4
        // (a 0,34/0,2/0,36 el campo horizontal cubría ~0,26 m y la punta se cortaba)
        camera={{ position: [0.43, 0.25, 0.46], fov: 36 }}
      >
        <color attach="background" args={["#F5F6F8"]} />
        <ambientLight intensity={0.85} />
        <directionalLight position={[2.2, 3.5, 2.8]} intensity={1.15} castShadow />
        <directionalLight position={[-2, 1.5, -2]} intensity={0.45} />

        <Suspense fallback={null}>
          {product.model3dReady && product.model3dUrl ? (
            // GLB normalizado (base en y = 0) apoyado sobre el piso del visor
            <GltfSneaker url={product.model3dUrl} position={[0, PLACEHOLDER_FLOOR_Y, 0]} />
          ) : (
            <PlaceholderSneaker
              silhouette={product.silhouette}
              palette={specs.palette}
            />
          )}

          {hotspots.map((hs) => (
            <Hotspot3DAnchor
              key={hs.id}
              hotspot={hs}
              active={activeHotspotId === hs.id}
              containerRef={containerRef}
            />
          ))}
        </Suspense>

        <ContactShadows
          frames={1}
          resolution={256}
          position={[0, -0.025, 0]}
          opacity={0.32}
          scale={0.85}
          blur={2.1}
          far={0.4}
        />
        <OrbitControls
          enablePan={false}
          minDistance={0.22}
          maxDistance={0.75}
          autoRotate={autoRotate && !activeHotspotId}
          autoRotateSpeed={1.6}
        />
      </Canvas>

      {/* Overlay DOM síncrono proyectado desde las coordenadas 3D */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        {hotspots.map((hs) => (
          <HotspotOverlayPin
            key={hs.id}
            hotspot={hs}
            active={activeHotspotId === hs.id}
            onToggle={() =>
              setActiveHotspotId((curr) => (curr === hs.id ? null : hs.id))
            }
          />
        ))}
      </div>

      {/* Tarjeta de detalle del hotspot seleccionado */}
      {activeHotspot && (
        <div
          data-testid={`hotspot-card-${activeHotspot.id}`}
          className="absolute right-3 top-14 z-30 w-64 rounded-2xl border border-line bg-canvas/95 p-3.5 shadow-xl backdrop-blur-xs"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-forest">
                {activeHotspot.id}
              </p>
              <p className="mt-0.5 text-xs font-bold text-navy">
                {activeHotspot.label}
              </p>
            </div>
            <button
              type="button"
              aria-label="Cerrar tarjeta de material"
              onClick={() => setActiveHotspotId(null)}
              className="rounded-full p-1 text-muted hover:text-navy cursor-pointer"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-muted">
            {getDetailText(activeHotspot.id)}
          </p>
          <button
            type="button"
            onClick={() =>
              onAskKast(
                `¿Qué detalle y cuidados tiene "${activeHotspot.label}"?`,
              )
            }
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-forest px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-wider text-white hover:bg-forest-hover cursor-pointer"
          >
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            <span>Preguntar a Kast</span>
          </button>
        </div>
      )}

      {/* Botón auto-rotación + chips accesibles de hotspots */}
      <div className="absolute bottom-12 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex flex-wrap gap-1.5 pointer-events-auto">
          {hotspots.map((hs) => (
            <button
              key={hs.id}
              type="button"
              data-testid={`hotspot-chip-${hs.id}`}
              onClick={() =>
                setActiveHotspotId((curr) => (curr === hs.id ? null : hs.id))
              }
              className={`rounded-full px-2.5 py-1 font-display text-[9px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                activeHotspotId === hs.id
                  ? "bg-forest text-white border-forest"
                  : "bg-canvas/90 text-navy border-line hover:border-navy"
              }`}
            >
              • {hs.id}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setAutoRotate((prev) => !prev)}
          aria-pressed={autoRotate}
          aria-label={autoRotate ? "Pausar rotación 360°" : "Activar rotación 360°"}
          className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-line bg-canvas/90 px-3 py-1 font-display text-[10px] font-bold uppercase tracking-wider text-navy hover:border-navy cursor-pointer"
        >
          <RotateCw className="h-3 w-3" aria-hidden="true" />
          <span>{autoRotate ? "Pausar giro" : "Girar 360°"}</span>
        </button>
      </div>
    </div>
  );
}
