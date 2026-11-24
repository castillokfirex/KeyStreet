import type { KastMascotState } from "./KastMascot";
import { KAST_EYES } from "./kastStatus";

/**
 * Piezas estáticas de Kast (koala "orbe" gris con degradado radial, orejas
 * con interior claro, nariz brillante, mejillas y brillo especular).
 * Sin `motion`: la comparten KastMascot (animado) y KastStaticIcon (entrada).
 * Colores desde tokens @theme (--color-kast-*).
 */
export function KastDefs({ uid }: { uid: string }) {
  return (
    <defs>
      <radialGradient id={`kf-fur-${uid}`} cx="38%" cy="30%" r="75%">
        <stop offset="0%" style={{ stopColor: "var(--color-kast-fur-light)" }} />
        <stop offset="100%" style={{ stopColor: "var(--color-kast-fur-dark)" }} />
      </radialGradient>
      <radialGradient id={`kf-ear-${uid}`} cx="45%" cy="40%" r="70%">
        <stop offset="0%" style={{ stopColor: "var(--color-kast-ear-light)" }} />
        <stop offset="100%" style={{ stopColor: "var(--color-kast-ear-dark)" }} />
      </radialGradient>
      <radialGradient id={`kf-nose-${uid}`} cx="38%" cy="30%" r="80%">
        <stop offset="0%" style={{ stopColor: "var(--color-kast-nose-light)" }} />
        <stop offset="100%" style={{ stopColor: "var(--color-kast-nose-dark)" }} />
      </radialGradient>
      <radialGradient id={`kf-spec-${uid}`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" style={{ stopColor: "#ffffff", stopOpacity: 0.65 }} />
        <stop offset="100%" style={{ stopColor: "#ffffff", stopOpacity: 0 }} />
      </radialGradient>
    </defs>
  );
}

export function KastHead({ uid }: { uid: string }) {
  return (
    <>
      <circle cx="50" cy="64" r="34" fill={`url(#kf-fur-${uid})`} />
      <circle cx="150" cy="64" r="34" fill={`url(#kf-fur-${uid})`} />
      <circle cx="54" cy="68" r="20" fill={`url(#kf-ear-${uid})`} />
      <circle cx="146" cy="68" r="20" fill={`url(#kf-ear-${uid})`} />
      <circle cx="100" cy="112" r="70" fill={`url(#kf-fur-${uid})`} />
      <ellipse cx="76" cy="70" rx="30" ry="15" transform="rotate(-24 76 70)" fill={`url(#kf-spec-${uid})`} />
      <ellipse cx="38" cy="44" rx="10" ry="6" transform="rotate(-35 38 44)" fill={`url(#kf-spec-${uid})`} />
      <ellipse cx="58" cy="134" rx="12" ry="7" className="fill-kast-cheek" opacity="0.4" />
      <ellipse cx="142" cy="134" rx="12" ry="7" className="fill-kast-cheek" opacity="0.4" />
    </>
  );
}

export function KastNose({ uid }: { uid: string }) {
  return (
    <>
      <ellipse cx="100" cy="130" rx="15" ry="19" fill={`url(#kf-nose-${uid})`} />
      <ellipse cx="94" cy="119" rx="5" ry="3.2" transform="rotate(-24 94 119)" fill="#ffffff" opacity="0.55" />
      <circle cx="104" cy="114" r="1.6" fill="#ffffff" opacity="0.55" />
    </>
  );
}

const LINE = {
  fill: "none",
  stroke: "var(--color-ink)",
  strokeWidth: 4,
  strokeLinecap: "round" as const,
};

/** Ojos dibujados (sin animación) para estados que no son "abiertos". */
export function KastLineEyes({ state }: { state: KastMascotState }) {
  if (state === "idle") {
    // ︶ ︶ ojos cerrados
    return (
      <g {...LINE}>
        {KAST_EYES.map(({ x, y }) => (
          <path key={x} d={`M${x - 10} ${y} Q${x} ${y + 9} ${x + 10} ${y}`} />
        ))}
      </g>
    );
  }
  if (state === "speaking" || state === "success") {
    // ︵ ︵ ojos felices
    return (
      <g {...LINE}>
        {KAST_EYES.map(({ x, y }) => (
          <path key={x} d={`M${x - 9} ${y + 3} Q${x} ${y - 8} ${x + 9} ${y + 3}`} />
        ))}
      </g>
    );
  }
  if (state === "error") {
    // ojos en "x"
    return (
      <g {...LINE} strokeWidth={3.6}>
        {KAST_EYES.map(({ x, y }) => (
          <path key={x} d={`M${x - 6} ${y - 6} L${x + 6} ${y + 6} M${x + 6} ${y - 6} L${x - 6} ${y + 6}`} />
        ))}
      </g>
    );
  }
  return null;
}

/** Un ojo abierto (óvalo negro con brillos) centrado en 0,0. */
export function KastOpenEye() {
  return (
    <>
      <ellipse cx="0" cy="0" rx="7.5" ry="10" className="fill-ink" />
      <circle cx="-2.6" cy="-3.6" r="2.8" fill="#ffffff" />
      <circle cx="2.4" cy="3.4" r="1.1" fill="#ffffff" />
    </>
  );
}

export function KastMouth({ state }: { state: KastMascotState }) {
  const d =
    state === "idle"
      ? "M95 156 Q100 158 105 156"
      : state === "error"
        ? "M93 158 Q100 153 107 158"
        : "M93 154 Q100 159.5 107 154";
  return (
    <path
      d={d}
      fill="none"
      stroke="var(--color-kast-nose-dark)"
      strokeWidth={2.6}
      strokeLinecap="round"
      opacity={0.7}
    />
  );
}
