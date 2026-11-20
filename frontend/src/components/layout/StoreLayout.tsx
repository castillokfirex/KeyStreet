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

      {/* FAB global de Kast para abrir el Asistente IA RAG */}
      <button
        type="button"
        onClick={() => openAssistant()}
        aria-label="Preguntar al asistente Kast"
        data-testid="kast-fab"
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2 rounded-full border border-line bg-canvas p-2 pr-4 shadow-lg hover:border-forest hover:shadow-xl transition-all cursor-pointer"
      >
        <LazyKastMascot state={mascotState} size={36} title="Asistente Kast" />
        <span className="hidden sm:inline font-display text-[11px] font-bold uppercase tracking-wider text-navy">
          Pregunta a Kast
        </span>
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
