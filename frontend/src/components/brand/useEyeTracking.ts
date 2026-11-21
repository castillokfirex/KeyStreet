import { useEffect, type RefObject } from "react";
import { useMotionValue, useReducedMotion, useSpring, type MotionValue } from "motion/react";

export interface EyeTrackingOptions {
  /** Activa el seguimiento (Kast lo usa solo en "listening") */
  enabled?: boolean;
  /** Desplazamiento máximo de los ojos, en unidades del SVG */
  radius?: number;
  /** Distancia (px) a la que se alcanza el desplazamiento máximo */
  range?: number;
}

export interface EyeTracking {
  x: MotionValue<number>;
  y: MotionValue<number>;
}

const SPRING = { stiffness: 140, damping: 18, mass: 0.6 };

const matches = (query: string) =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia(query).matches;

/**
 * Ojos que siguen el puntero con interpolación spring.
 * - Mouse: siguen el cursor en toda la ventana.
 * - Táctil: siguen el último toque; tras 2,5 s sin interacción miran al
 *   centro con un micro-movimiento idle.
 * - prefers-reduced-motion: quietos al centro.
 */
export function useEyeTracking(
  ref: RefObject<Element | null>,
  { enabled = true, radius = 6.5, range = 280 }: EyeTrackingOptions = {},
): EyeTracking {
  const reduced = useReducedMotion();
  const targetX = useMotionValue(0);
  const targetY = useMotionValue(0);
  const x = useSpring(targetX, SPRING);
  const y = useSpring(targetY, SPRING);

  useEffect(() => {
    if (!enabled || reduced) {
      targetX.set(0);
      targetY.set(0);
      return;
    }

    const isTouch = matches("(hover: none)");
    let lastInput = 0;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;

    const lookAt = (clientX: number, clientY: number) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dx = clientX - (rect.left + rect.width / 2);
      const dy = clientY - (rect.top + rect.height / 2);
      const distance = Math.hypot(dx, dy) || 1;
      const strength = Math.min(1, distance / range);
      targetX.set((dx / distance) * radius * strength);
      targetY.set((dy / distance) * radius * strength);
    };

    const onPointer = (event: PointerEvent) => {
      lastInput = performance.now();
      lookAt(event.clientX, event.clientY);
    };

    const idle = () => {
      if (performance.now() - lastInput > 2500) {
        const angle = Math.random() * Math.PI * 2;
        const r = radius * (0.12 + Math.random() * 0.28);
        targetX.set(Math.cos(angle) * r);
        targetY.set(Math.sin(angle) * r * 0.6);
      }
      idleTimer = setTimeout(idle, 1400 + Math.random() * 1800);
    };

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointer, { passive: true });
    if (isTouch) idleTimer = setTimeout(idle, 1200);

    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, [enabled, reduced, radius, range, ref, targetX, targetY]);

  return { x, y };
}
