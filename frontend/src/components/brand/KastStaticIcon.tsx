import { useId } from "react";
import type { KastMascotProps, KastMascotState } from "./KastMascot";

const STATUS_DOT: Record<KastMascotState, string> = {
  idle: "#16302B",
  listening: "#0EA5E9",
  thinking: "#F59E0B",
  speaking: "#10B981",
  success: "#16A34A",
  error: "#DC2626",
};

/**
 * Versión SVG estática ligera (< 1.5 KB) de Kast para carga inicial sin animaciones JS.
 */
export function KastStaticIcon({
  state = "idle",
  size = 40,
  className = "",
  title = "Kast, asistente IA de Key Street",
}: KastMascotProps) {
  const titleId = useId();

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
      <circle cx="15" cy="23" r="10.5" fill="#64748B" />
      <circle cx="15.5" cy="23.5" r="5.5" fill="#E2E8F0" />
      <circle cx="49" cy="23" r="10.5" fill="#64748B" />
      <circle cx="48.5" cy="23.5" r="5.5" fill="#E2E8F0" />
      <rect x="14" y="16" width="36" height="31" rx="15" fill="#94A3B8" />
      <rect x="17" y="19" width="30" height="25" rx="12" fill="#CBD5E1" />
      <rect x="22" y="27" width="4.2" height="6" rx="2.1" fill="#0F172A" />
      <rect x="37.8" y="27" width="4.2" height="6" rx="2.1" fill="#0F172A" />
      <circle cx="23.4" cy="28.7" r="0.9" fill="#FFFFFF" />
      <circle cx="39.2" cy="28.7" r="0.9" fill="#FFFFFF" />
      <ellipse cx="32" cy="34.5" rx="4.2" ry="5.4" fill="#0F172A" />
      <ellipse cx="21" cy="37" rx="2.6" ry="1.4" fill="#F4A3A3" opacity="0.55" />
      <ellipse cx="43" cy="37" rx="2.6" ry="1.4" fill="#F4A3A3" opacity="0.55" />
      <circle
        cx="52"
        cy="44"
        r="5"
        fill={STATUS_DOT[state]}
        stroke="#FFFFFF"
        strokeWidth="2"
      />
    </svg>
  );
}
