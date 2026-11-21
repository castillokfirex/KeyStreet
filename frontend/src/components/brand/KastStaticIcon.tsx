import { useId } from "react";
import { KastDefs, KastHead, KastLineEyes, KastMouth, KastNose, KastOpenEye } from "./KastFace";
import type { KastMascotProps } from "./KastMascot";
import { KAST_EYES, KAST_VIEWBOX } from "./kastStatus";

/**
 * Versión estática de Kast (sin `motion`) para la carga inicial.
 * Dibuja el mismo koala que KastMascot para que no haya salto al cargar el
 * animado; "idle" (dormido) usa la respiración CSS y un "z" fijo.
 */
export function KastStaticIcon({
  state = "idle",
  size = 40,
  className = "",
  title = "Kast, asistente IA de Key Street",
}: KastMascotProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const titleId = `kast-static-${uid}`;
  const eyesOpen = state === "listening" || state === "thinking";

  return (
    <svg
      width={size}
      height={size}
      viewBox={KAST_VIEWBOX}
      fill="none"
      role="img"
      aria-labelledby={titleId}
      data-kast-state={state}
      className={`shrink-0 overflow-visible ${className}`.trim()}
    >
      <title id={titleId}>{title}</title>
      <KastDefs uid={uid} />
      <g className={state === "idle" ? "ks-kast-breathe" : undefined}>
        <KastHead uid={uid} />
        {eyesOpen ? (
          KAST_EYES.map(({ x, y }) => (
            <g key={x} transform={`translate(${state === "thinking" ? x + 4.5 : x} ${state === "thinking" ? y - 6.5 : y})`}>
              <KastOpenEye />
            </g>
          ))
        ) : (
          <KastLineEyes state={state} />
        )}
        <KastNose uid={uid} />
        <KastMouth state={state} />
      </g>
      {state === "idle" && (
        <text x={172} y={14} fontSize={20} aria-hidden="true" className="fill-current font-display font-semibold" opacity={0.6}>
          z
        </text>
      )}
    </svg>
  );
}
