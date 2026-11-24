import { useEffect, useState } from "react";
import { Link } from "react-router";
import { KastLogo } from "@/components/brand/KastLogo";

const SWAP_MS = 4000;

/**
 * Logo central: alterna la silueta de Kast y el wordmark "KEY STREET".
 * Crossfade solo con CSS (opacity) para no sumar `motion` al bundle de
 * entrada. Ambas capas comparten una caja fija: el layout no salta.
 * Con prefers-reduced-motion el cambio es instantáneo (regla global).
 */
export function AlternatingLogo({ compact = false }: { compact?: boolean }) {
  const [showMark, setShowMark] = useState(true);

  useEffect(() => {
    const timer = window.setInterval(() => setShowMark((v) => !v), SWAP_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Link
      to="/"
      aria-label="Key Street, ir al inicio"
      className={[
        "relative block w-[var(--ks-logo-w)] text-ink transition-[height] duration-300",
        compact ? "h-[var(--ks-logo-h-compact)]" : "h-[var(--ks-logo-h)]",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        data-testid="logo-isotype-layer"
        className={`ks-logo-layer absolute inset-0 flex items-center justify-center ${showMark ? "opacity-100" : "opacity-0"}`}
      >
        <KastLogo variant="isotype" size={34} className="h-full w-auto" title="Kast" />
      </span>
      <span
        aria-hidden="true"
        data-testid="logo-wordmark-layer"
        className={`ks-logo-layer absolute inset-0 flex items-center justify-center ${showMark ? "opacity-0" : "opacity-100"}`}
      >
        <KastLogo variant="wordmark" title="Key Street" />
      </span>
    </Link>
  );
}
