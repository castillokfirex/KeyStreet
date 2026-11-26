import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatLatency } from "../AuditPage";
import { DocumentsPage } from "../DocumentsPage";
import { previewFinalPrice, validateDiscount } from "../ProductsAdminPage";
import { timeAgo } from "../ui";

const deleteDocument = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/queries", async (orig) => {
  const real = await orig<typeof import("@/lib/queries")>();
  return {
    ...real,
    adminApi: {
      getDocuments: () =>
        Promise.resolve({
          items: [
            {
              id: "d-1",
              title: "Guía de tallas",
              originalFilename: "guia.pdf",
              status: "INDEXED",
              sha256: "a".repeat(64),
              sizeBytes: 1000,
              pageCount: 4,
              ocrPageCount: 0,
              chunkCount: 9,
              tempFile: { deleted: true, verified: true, deletedAt: new Date().toISOString() },
              createdAt: new Date().toISOString(),
            },
          ],
          page: 0,
          pageSize: 30,
          totalItems: 1,
          totalPages: 1,
        }),
      deleteDocument: (id: string) => deleteDocument(id),
    },
  };
});

afterEach(cleanup);

describe("reglas del panel", () => {
  it("valida el descuento con el mismo rango del backend (0–90, entero)", () => {
    expect(validateDiscount("15")).toBeNull();
    expect(validateDiscount("")).toBe("Escribe un número.");
    expect(validateDiscount("12.5")).toBe("Usa un número entero.");
    expect(validateDiscount("95")).toBe("Entre 0 y 90 %.");
  });

  it("previsualiza el precio final redondeando a la centena como el servidor", () => {
    expect(previewFinalPrice(584950, 10)).toBe(526400);
    expect(previewFinalPrice(299900, 0)).toBe(299900);
  });

  it("formatea tiempos y latencias", () => {
    const now = Date.parse("2026-11-26T12:00:00Z");
    expect(timeAgo("2026-11-26T11:58:00Z", now)).toBe("hace 2 min");
    expect(timeAgo("2026-11-26T09:00:00Z", now)).toBe("hace 3 h");
    expect(formatLatency(310)).toBe("310 ms");
    expect(formatLatency(1820)).toBe("1,8 s");
  });
});

describe("DocumentsPage", () => {
  it("pide confirmación antes de borrar un índice", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <DocumentsPage />
      </QueryClientProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Eliminar índice de Guía de tallas" }));
    expect(deleteDocument).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar eliminación de Guía de tallas" }));
    expect(deleteDocument).toHaveBeenCalledWith("d-1");
  });
});
