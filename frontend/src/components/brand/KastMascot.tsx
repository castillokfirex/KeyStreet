import { useId, useRef } from "react";
import { m, useReducedMotion, type Variants } from "motion/react";
import { KastDefs, KastHead, KastLineEyes, KastMouth, KastNose, KastOpenEye } from "./KastFace";
import { KAST_EYES, KAST_STATUS_DOT, KAST_STATUS_LABEL, KAST_VIEWBOX } from "./kastStatus";
import { useEyeTracking } from "./useEyeTracking";

export type KastMascotState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "success"
  | "error";

export type KastMascotProps = {
  state?: KastMascotState;
  size?: number;
  className?: string;
  title?: string;
  /** Muestra la etiqueta de estado ("Te escucho"…) debajo del koala */
  showStatus?: boolean;
};

/*
 * Mapeo de estados (ver AUDITORIA_UI.md §4):
 *   idle      → dormido: ojos ︶ ︶, respiración, Zzz
 *   listening → despierto: ojos que siguen el cursor + parpadeo
 *   thinking  → mira arriba a un lado, tres puntos
 *   speaking  → ojos felices, leve rebote, boca animada
 *   success   → ojos felices + pulso
 *   error     → ojos "x" + sacudida corta
 * Solo anima transform/opacidad dentro de LazyMotion.
 */
const BODY: Variants = {
  idle: {
    scale: [1, 1.03, 1],
    x: 0,
    y: 0,
    rotate: 0,
    transition: { duration: 3.4, repeat: Infinity, ease: "easeInOut" },
  },
  listening: {
    scaleY: [1, 1.07, 0.98, 1],
    scaleX: [1, 0.97, 1.01, 1],
    scale: 1,
    x: 0,
    y: [0, -5, 0],
    rotate: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
  thinking: { scale: 1, x: 0, y: 0, rotate: -4, transition: { duration: 0.4, ease: "easeOut" } },
  speaking: {
    scale: 1,
    x: 0,
    rotate: 0,
    y: [0, -4, 0],
    transition: { duration: 0.7, repeat: Infinity, ease: "easeInOut" },
  },
  success: { scale: [1, 1.08, 1], x: 0, y: 0, rotate: 0, transition: { duration: 0.6 } },
  error: { scale: 1, y: 0, rotate: 0, x: [0, -4, 4, -3, 3, 0], transition: { duration: 0.45 } },
  still: { scale: 1, scaleX: 1, scaleY: 1, x: 0, y: 0, rotate: 0 },
};

export function KastMascot({
  state = "idle",
  size = 40,
  className = "",
  title = "Kast, asistente IA de Key Street",
  showStatus = false,
}: KastMascotProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const titleId = `kast-mascot-${uid}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const eyes = useEyeTracking(svgRef, { enabled: state === "listening" });
  const eyesOpen = state === "listening" || state === "thinking";

  const svg = (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={KAST_VIEWBOX}
      fill="none"
      role="img"
      aria-labelledby={titleId}
      data-kast-state={state}
      className={`shrink-0 overflow-visible ${showStatus ? "" : className}`.trim()}
    >
      <title id={titleId}>{title}</title>
      <KastDefs uid={uid} />

      <m.g
        variants={BODY}
        initial={false}
        animate={reduced ? "still" : state}
        style={{ originX: 0.5, originY: 1 }}
      >
        <KastHead uid={uid} />

        {eyesOpen ? (
          KAST_EYES.map((pos) => (
            <g key={pos.x} transform={`translate(${pos.x} ${pos.y})`}>
              <m.g
                style={state === "listening" ? { x: eyes.x, y: eyes.y } : undefined}
                animate={state === "thinking" ? { x: 4.5, y: -6.5 } : undefined}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <m.g
                  className="ks-kast-eye"
                  initial={reduced ? false : { scaleY: 0.08 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.4, ease: [0.2, 1.6, 0.4, 1], delay: 0.1 }}
                >
                  {/* parpadeo en un grupo aparte: la animación CSS no pisa el scaleY de motion */}
                  <g className={state === "listening" ? "ks-kast-eye ks-kast-blink" : undefined}>
                    <KastOpenEye />
                  </g>
                </m.g>
              </m.g>
            </g>
          ))
        ) : (
          <KastLineEyes state={state} />
        )}

        <KastNose uid={uid} />

        {state === "speaking" && !reduced ? (
          <m.ellipse
            cx="100"
            cy="157"
            rx="5"
            ry="3.4"
            fill="var(--color-kast-nose-dark)"
            style={{ originX: 0.5, originY: 0.5 }}
            animate={{ scaleY: [0.6, 1.2, 0.6] }}
            transition={{ duration: 0.36, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : (
          <KastMouth state={state} />
        )}
      </m.g>

      {state === "idle" && <Zzz still={Boolean(reduced)} />}
      {state === "thinking" && <ThinkingDots still={Boolean(reduced)} />}
    </svg>
  );

  if (!showStatus) return svg;

  return (
    <span className={`inline-flex flex-col items-center gap-2 ${className}`.trim()}>
      {svg}
      <KastStatusLabel state={state} />
    </span>
  );
}

export function KastStatusLabel({ state }: { state: KastMascotState }) {
  return (
    <span
      aria-live="polite"
      className="inline-flex items-center gap-2 font-display text-[10px] font-semibold uppercase tracking-label text-muted"
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${KAST_STATUS_DOT[state]} ${state === "thinking" ? "motion-safe:animate-pulse" : ""}`}
      />
      {KAST_STATUS_LABEL[state]}
    </span>
  );
}

function Zzz({ still }: { still: boolean }) {
  const letters = [
    { char: "Z", x: 168, y: 18, size: 20, delay: 0 },
    { char: "z", x: 184, y: 2, size: 15, delay: 0.6 },
    { char: "z", x: 197, y: -9, size: 11, delay: 1.2 },
  ];
  return (
    <g aria-hidden="true" className="fill-current font-display font-semibold" opacity={0.7}>
      {letters.map((l) =>
        still ? (
          <text key={l.x} x={l.x} y={l.y} fontSize={l.size}>
            {l.char}
          </text>
        ) : (
          <m.text
            key={l.x}
            x={l.x}
            y={l.y}
            fontSize={l.size}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: [0, 1, 0], y: [4, -4, -10] }}
            transition={{ duration: 2.6, repeat: Infinity, delay: l.delay, ease: "easeOut" }}
          >
            {l.char}
          </m.text>
        ),
      )}
    </g>
  );
}

function ThinkingDots({ still }: { still: boolean }) {
  return (
    <g aria-hidden="true" className="fill-current">
      {[0, 1, 2].map((i) =>
        still ? (
          <circle key={i} cx={164 + i * 13} cy={4} r={4} opacity={0.6} />
        ) : (
          <m.circle
            key={i}
            cx={164 + i * 13}
            cy={4}
            r={4}
            animate={{ opacity: [0.25, 1, 0.25], y: [0, -4, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          />
        ),
      )}
    </g>
  );
}
