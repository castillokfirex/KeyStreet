import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router";
import { StoreLayout } from "@/components/layout/StoreLayout";
import { Skeleton } from "@/components/ui/Skeleton";
import { HomePage } from "@/features/home/HomePage";

const CatalogPage = lazy(() =>
  import("@/features/catalog/CatalogPage").then((m) => ({
    default: m.CatalogPage,
  })),
);

const ProductDetailPage = lazy(() =>
  import("@/features/product/ProductDetailPage").then((m) => ({
    default: m.ProductDetailPage,
  })),
);

const LoginPage = lazy(() =>
  import("@/features/admin/LoginPage").then((m) => ({ default: m.LoginPage })),
);

const AdminLayout = lazy(() =>
  import("@/features/admin/AdminLayout").then((m) => ({
    default: m.AdminLayout,
  })),
);

const DocumentsPage = lazy(() =>
  import("@/features/admin/DocumentsPage").then((m) => ({
    default: m.DocumentsPage,
  })),
);

const ProductsAdminPage = lazy(() =>
  import("@/features/admin/ProductsAdminPage").then((m) => ({
    default: m.ProductsAdminPage,
  })),
);

const AuditPage = lazy(() =>
  import("@/features/admin/AuditPage").then((m) => ({ default: m.AuditPage })),
);

function RouteSkeleton() {
  return (
    <div className="mx-auto min-h-[1500px] max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Skeleton className="aspect-[4/5]" />
        <Skeleton className="aspect-[4/5]" />
        <Skeleton className="aspect-[4/5]" />
        <Skeleton className="aspect-[4/5]" />
      </div>
    </div>
  );
}

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<RouteSkeleton />}>{node}</Suspense>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<StoreLayout />}>
        <Route index element={<HomePage />} />
        <Route path="catalogo" element={withSuspense(<CatalogPage />)} />
        <Route path="producto/:slug" element={withSuspense(<ProductDetailPage />)} />
      </Route>
      <Route path="/admin/login" element={withSuspense(<LoginPage />)} />
      <Route path="/admin" element={withSuspense(<AdminLayout />)}>
        <Route index element={<Navigate to="/admin/documents" replace />} />
        <Route path="documents" element={withSuspense(<DocumentsPage />)} />
        <Route path="products" element={withSuspense(<ProductsAdminPage />)} />
        <Route path="audit" element={withSuspense(<AuditPage />)} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
