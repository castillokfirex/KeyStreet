import { useEffect, type ReactNode } from "react";
import { Navigate } from "react-router";
import { Skeleton } from "@/components/ui/Skeleton";
import { refreshAccessToken } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

export function AdminGuard({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);

  useEffect(() => {
    if (!bootstrapped && !accessToken) {
      void refreshAccessToken();
    }
  }, [bootstrapped, accessToken]);

  if (!bootstrapped) {
    return (
      <div className="mx-auto max-w-5xl p-8 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!accessToken || user?.role !== "ADMIN_TENANT") {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
