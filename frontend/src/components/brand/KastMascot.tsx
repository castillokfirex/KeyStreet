import { useId } from "react";
import { m, useReducedMotion } from "motion/react";

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
};

const STATUS_DOT: Record<KastMascotState, string> = {
  idle: "#16302B",
  listening: "#0EA5E9",
  thinking: "#F59E0B",
  speaking: "#10B981",
  success: "#16A34A",
  error: "#DC2626",
};

/**
 * Mascota IA animada "Kast" el Koala (< 4 KB).
 * Solo anima transform/opacidad dentro de LazyMotion; respeta prefers-reduced-motion.
 */
export function KastMascot({
  state = "idle",
  size = 40,
  className = "",
  title = "Kast, asistente IA de Key Street",
}: KastMascotProps) {
  const titleId = useId();
  const reduced = useReducedMotion();

  const shouldAnimate = !reduced && state !== "idle";

  const headAnimate = !shouldAnimate
    ? undefined
    : state === "thinking"
      ? { rotate: [-4, 4, -4] }
      : state === "speaking"
        ? { y: [0, -1.8, 0] }
        : state === "success"
          ? { scale: [1, 1.07, 1] }
          : state === "error"
            ? { x: [-2, 2, -2, 0] }
            : undefined;

  const headTransition =
    state === "error"
      ? { duration: 0.4, repeat: 1 }
      : state === "thinking"
        ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" as const }
        : state === "speaking"
          ? { duration: 0.45, repeat: Infinity, ease: "easeInOut" as const }
          : { duration: 0.6, repeat: 1 };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-labelledby={titleId}
      data-kast-state={state}
      className={`shrink-0 overflow-visible ${className}`.trim()}
    >
      <title id={titleId}>{title}</title>

      <m.g
        style={{ transformOrigin: "32px 34px" }}
        animate={headAnimate}
        transition={headTransition}
      >
        {/* Orejas */}
        <m.g
          style={{ transformOrigin: "15px 22px" }}
          animate={
            reduced
              ? undefined
              : state === "listening"
                ? { rotate: [-6, 0, -6] }
                : { rotate: 0 }
          }
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          <circle cx="15" cy="23" r="10.5" fill="#64748B" />
          <circle cx="15.5" cy="23.5" r="5.5" fill="#E2E8F0" />
        </m.g>
        <m.g
          style={{ transformOrigin: "49px 22px" }}
          animate={
            reduced
              ? undefined
              : state === "listening"
                ? { rotate: [6, 0, 6] }
                : { rotate: 0 }
          }
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          <circle cx="49" cy="23" r="10.5" fill="#64748B" />
          <circle cx="48.5" cy="23.5" r="5.5" fill="#E2E8F0" />
        </m.g>

        {/* Cabeza */}
        <rect x="14" y="16" width="36" height="31" rx="15" fill="#94A3B8" />
        <rect x="17" y="19" width="30" height="25" rx="12" fill="#CBD5E1" />

        {/* Ojos pill */}
        <m.rect
          x="22"
          y="27"
          width="4.2"
          height="6"
          rx="2.1"
          fill="#0F172A"
          style={{ transformOrigin: "24.1px 30px" }}
          animate={
            shouldAnimate
              ? { scaleY: [1, 1, 0.15, 1] }
              : undefined
          }
          transition={{
            duration: 3.6,
            repeat: Infinity,
            times: [0, 0.9, 0.95, 1],
          }}
        />
        <m.rect
          x="37.8"
          y="27"
          width="4.2"
          height="6"
          rx="2.1"
          fill="#0F172A"
          style={{ transformOrigin: "39.9px 30px" }}
          animate={
            shouldAnimate
              ? { scaleY: [1, 1, 0.15, 1] }
              : undefined
          }
          transition={{
            duration: 3.6,
            repeat: Infinity,
            times: [0, 0.9, 0.95, 1],
          }}
        />
        {/* Brillos */}
        <circle cx="23.4" cy="28.7" r="0.9" fill="#FFFFFF" />
        <circle cx="39.2" cy="28.7" r="0.9" fill="#FFFFFF" />

        {/* Nariz emblemática de koala */}
        <ellipse cx="32" cy="34.5" rx="4.2" ry="5.4" fill="#0F172A" />

        {/* Mejillas sutiles */}
        <ellipse cx="21" cy="37" rx="2.6" ry="1.4" fill="#F4A3A3" opacity="0.55" />
        <ellipse cx="43" cy="37" rx="2.6" ry="1.4" fill="#F4A3A3" opacity="0.55" />

        {/* Indicador de estado */}
        <circle
          cx="52"
          cy="44"
          r="5"
          fill={STATUS_DOT[state]}
          stroke="#FFFFFF"
          strokeWidth="2"
        />
      </m.g>
    </svg>
  );
}
