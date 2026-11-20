import type { ReactNode } from "react";
import { m, useReducedMotion } from "motion/react";
import { EDITORIAL_EASE } from "./presets";

type FadeInProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function FadeIn({ children, className = "", delay = 0 }: FadeInProps) {
  const reduced = useReducedMotion();
  if (reduced) {
    return <div className={className}>{children}</div>;
  }
  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: EDITORIAL_EASE }}
      className={className}
    >
      {children}
    </m.div>
  );
}
