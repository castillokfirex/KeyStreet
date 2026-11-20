import { lazy, Suspense, useState } from "react";
import type { KastMascotProps } from "./KastMascot";
import { KastStaticIcon } from "./KastStaticIcon";

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
  const [engaged, setEngaged] = useState(false);
  const state = props.state ?? "idle";
  const shouldLoadAnimated = engaged || state !== "idle";

  if (!shouldLoadAnimated) {
    return (
      <span
        onPointerEnter={() => setEngaged(true)}
        onFocus={() => setEngaged(true)}
        className="inline-flex shrink-0"
      >
        <KastStaticIcon {...props} />
      </span>
    );
  }

  return (
    <Suspense fallback={<KastStaticIcon {...props} />}>
      <InnerAnimatedMascot {...props} />
    </Suspense>
  );
}
