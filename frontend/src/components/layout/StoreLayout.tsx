import { lazy, Suspense } from "react";
import { Outlet } from "react-router";
import { LazyKastMascot } from "@/components/brand/LazyKastMascot";
import { ToastViewport } from "@/components/ui/ToastViewport";
import { useAssistantStore } from "@/stores/assistant";
import { useCartStore } from "@/stores/cart";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { PromoBar } from "./PromoBar";

const LazyAssistantDrawer = lazy(() =>
  import("@/features/assistant/AssistantDrawer").then((mod) => ({
    default: mod.AssistantDrawer,
  })),
);

const LazyBagDrawer = lazy(() =>
  import("@/features/cart/BagDrawer").then((mod) => ({
    default: mod.BagDrawer,
  })),
);

export function StoreLayout() {
  const assistantOpen = useAssistantStore((s) => s.open);
  const openAssistant = useAssistantStore((s) => s.openDrawer);
  const mascotState = useAssistantStore((s) => s.mascotState);
  const bagOpen = useCartStore((s) => s.bagOpen);

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-navy">
      <PromoBar />
      <Header />

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />

      {/* FAB global: círculo oscuro con Kast (dormido en reposo) → Asistente IA RAG */}
      <button
        type="button"
        onClick={() => openAssistant()}
        aria-label="Preguntar al asistente Kast"
        data-testid="kast-fab"
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-canvas shadow-[0_8px_28px_rgb(17_17_17/0.18)] transition-transform hover:-translate-y-0.5 cursor-pointer sm:h-16 sm:w-16"
      >
        <LazyKastMascot state={mascotState} size={48} title="Asistente Kast" />
      </button>

      {assistantOpen && (
        <Suspense fallback={null}>
          <LazyAssistantDrawer />
        </Suspense>
      )}

      {bagOpen && (
        <Suspense fallback={null}>
          <LazyBagDrawer />
        </Suspense>
      )}

      <ToastViewport />
    </div>
  );
}
