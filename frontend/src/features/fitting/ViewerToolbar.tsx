import { Box, Eye, Footprints, Rotate3d } from "lucide-react";

export function ViewerToolbar({
  mode,
  cameraMode,
  onSelectMode,
  onSelectCamera,
}: {
  mode: "fitting" | "viewer3d";
  cameraMode: "full" | "feet";
  onSelectMode: (m: "fitting" | "viewer3d") => void;
  onSelectCamera: (cam: "full" | "feet") => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onSelectMode("fitting")}
        className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-display text-[10px] font-semibold uppercase tracking-nav transition-colors cursor-pointer ${
          mode === "fitting"
            ? "bg-ink text-canvas"
            : "bg-canvas/95 text-ink border border-line hover:border-ink"
        }`}
      >
        <Box className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Probador 3D</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectMode("viewer3d")}
        className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-display text-[10px] font-semibold uppercase tracking-nav transition-colors cursor-pointer ${
          mode === "viewer3d"
            ? "bg-ink text-canvas"
            : "bg-canvas/95 text-ink border border-line hover:border-ink"
        }`}
      >
        <Rotate3d className="h-3.5 w-3.5" aria-hidden="true" />
        <span>360° Zapato</span>
      </button>

      {mode === "fitting" && (
        <>
          <button
            type="button"
            onClick={() => onSelectCamera("full")}
            aria-pressed={cameraMode === "full"}
            className={`inline-flex items-center gap-1 rounded-sm px-3 py-1.5 font-display text-[10px] font-semibold uppercase tracking-nav transition-colors cursor-pointer ${
              cameraMode === "full"
                ? "bg-ink text-canvas"
                : "bg-canvas/95 text-ink border border-line hover:border-ink"
            }`}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Vista completa</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectCamera("feet")}
            aria-pressed={cameraMode === "feet"}
            className={`inline-flex items-center gap-1 rounded-sm px-3 py-1.5 font-display text-[10px] font-semibold uppercase tracking-nav transition-colors cursor-pointer ${
              cameraMode === "feet"
                ? "bg-ink text-canvas"
                : "bg-canvas/95 text-ink border border-line hover:border-ink"
            }`}
          >
            <Footprints className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Zoom pies</span>
          </button>
        </>
      )}
    </div>
  );
}
