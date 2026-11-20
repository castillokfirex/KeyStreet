import { lazy, Suspense } from "react";
import { KastLogo } from "./KastLogo";
import type { KastMascotProps } from "./KastMascot";

const InnerAnimatedMascot = lazy(async () => {
  const [{ MotionScope }, { KastMascot }] = await Promise.all([
    import("@/components/motion/MotionScope"),
    import("./KastMascot"),
  ]);
  return {
    default: (props: KastMascotProps) => (
      <MotionScope>
        <KastMascot {...props} />
      </MotionScope>
    ),
  };
});

export function LazyKastMascot(props: KastMascotProps) {
  const size = props.size ?? 40;
  return (
    <Suspense
      fallback={
        <KastLogo
          variant="isotype"
          size={size}
          title={props.title || "Kast"}
          className="text-navy"
        />
      }
    >
      <InnerAnimatedMascot {...props} />
    </Suspense>
  );
}
