import { Box, Rotate3d } from "lucide-react";
import { Link } from "react-router";

const BASE =
  "inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-display text-[10px] font-semibold uppercase tracking-nav transition-colors cursor-pointer";

/** Barra de la galería: visor 360° en línea y acceso al probador a pantalla completa. */
export function ViewerToolbar({
  viewerActive,
  onToggleViewer,
  fittingHref,
}: {
  viewerActive: boolean;
  onToggleViewer: () => void;
  fittingHref: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onToggleViewer}
        aria-pressed={viewerActive}
        aria-label={viewerActive ? "Ver fotos del producto" : "Activar Visor 3D 360°"}
        className={`${BASE} ${
          viewerActive
            ? "bg-ink text-canvas"
            : "border border-line bg-canvas/95 text-ink hover:border-ink"
        }`}
      >
        <Rotate3d className="h-3.5 w-3.5" aria-hidden="true" />
        <span>360° Zapato</span>
      </button>

      <Link
        to={fittingHref}
        className={`${BASE} border border-line bg-canvas/95 text-ink hover:border-ink`}
      >
        <Box className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Probador 3D</span>
      </Link>
    </div>
  );
}
