import { useId } from "react";

/**
 * Rama de eucalipto (el entorno de Kast, el koala). Hojas redondeadas tipo
 * "silver dollar" en verde salvia. Decorativa: siempre aria-hidden.
 */
const LEAVES: { x: number; y: number; r: number; rot: number; tone: 0 | 1 | 2 }[] = [
  { x: 58, y: 34, r: 15, rot: -30, tone: 1 },
  { x: 92, y: 60, r: 18, rot: 20, tone: 0 },
  { x: 60, y: 84, r: 17, rot: -45, tone: 2 },
  { x: 102, y: 108, r: 20, rot: 35, tone: 1 },
  { x: 66, y: 134, r: 19, rot: -20, tone: 0 },
  { x: 110, y: 160, r: 21, rot: 15, tone: 2 },
  { x: 72, y: 186, r: 20, rot: -35, tone: 1 },
  { x: 116, y: 212, r: 18, rot: 40, tone: 0 },
  { x: 82, y: 236, r: 16, rot: -15, tone: 2 },
];

export function EucalyptusBranch({ className = "" }: { className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const tones = [`euc-a-${uid}`, `euc-b-${uid}`, `euc-c-${uid}`];

  return (
    <svg viewBox="0 0 170 270" fill="none" aria-hidden="true" className={className}>
      <defs>
        <radialGradient id={tones[0]} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#C9DACB" />
          <stop offset="100%" stopColor="#7E9E88" />
        </radialGradient>
        <radialGradient id={tones[1]} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#B4CBB9" />
          <stop offset="100%" stopColor="#5F826B" />
        </radialGradient>
        <radialGradient id={tones[2]} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#D8E4D6" />
          <stop offset="100%" stopColor="#93AE97" />
        </radialGradient>
      </defs>
      <path
        d="M80 268 C 92 220, 70 190, 90 150 S 74 70, 70 6"
        stroke="#7E9581"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {LEAVES.map((l, i) => (
        <g key={i} transform={`rotate(${l.rot} ${l.x} ${l.y})`}>
          <ellipse cx={l.x} cy={l.y} rx={l.r} ry={l.r * 0.86} fill={`url(#${tones[l.tone]})`} />
          <path
            d={`M${l.x - l.r * 0.7} ${l.y} Q ${l.x} ${l.y - 2} ${l.x + l.r * 0.7} ${l.y}`}
            stroke="#ffffff"
            strokeOpacity="0.35"
            strokeWidth="1"
            fill="none"
          />
        </g>
      ))}
    </svg>
  );
}
