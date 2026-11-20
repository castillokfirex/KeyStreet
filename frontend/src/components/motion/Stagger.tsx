import type { ReactNode } from "react";
import { m, useReducedMotion } from "motion/react";
import { MotionScope } from "./MotionScope";
import { fadeInUpVariants, staggerContainerVariants } from "./presets";

export function Stagger({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) {
    return <div className={className}>{children}</div>;
  }
  return (
    <MotionScope>
      <m.div
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
        className={className}
      >
        {children}
      </m.div>
    </MotionScope>
  );
}

export function StaggerItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) {
    return <div className={className}>{children}</div>;
  }
  return (
    <m.div variants={fadeInUpVariants} className={className}>
      {children}
    </m.div>
  );
}
