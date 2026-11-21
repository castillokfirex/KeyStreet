import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProblemError } from "@/lib/api";
import { formatCop } from "@/lib/money";
import { adminApi, queryKeys } from "@/lib/queries";
import { useToastStore } from "@/stores/toast";

export function ProductsAdminPage() {
  const qc = useQueryClient();
  const pushToast = useToastStore((s) => s.push);
  const [edits, setEdits] = useState<Record<string, number>>({});

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.adminProducts,
    queryFn: () => adminApi.getProducts(0, 24),
  });

  const discountMut = useMutation({
    mutationFn: ({ id, discountPercent }: { id: string; discountPercent: number }) =>
      adminApi.patchDiscount(id, discountPercent),
    onSuccess: async () => {
      pushToast({ title: "Descuento actualizado", tone: "success" });
      await qc.invalidateQueries({ queryKey: queryKeys.adminProducts });
      await qc.invalidateQueries({ queryKey: ["key-street", "products"] });
    },
    onError: (err) => {
      pushToast({
        title: "Error al actualizar descuento",
        description: err instanceof ProblemError ? err.detail : "Error inesperado",
        tone: "error",
      });
    },
  });

  const products = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-navy">
          Gestión de Catálogo & Descuentos
        </h1>
        <p className="mt-1 text-xs text-muted">
          Los descuentos modificados aquí recalculan de inmediato el precio servidor de WhatsApp.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-canvas">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-line bg-surface/70 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            <tr>
              <th className="px-4 py-3">Silueta</th>
              <th className="px-4 py-3">Marca</th>
              <th className="px-4 py-3">Precio Base</th>
              <th className="px-4 py-3">Descuento %</th>
              <th className="px-4 py-3">Precio Final</th>
              <th className="px-4 py-3 text-right">Guardar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  Cargando catálogo...
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const value = edits[p.id] ?? p.discountPercent;
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-semibold text-navy">{p.name}</td>
                    <td className="px-4 py-3 text-muted">{p.brand}</td>
                    <td className="px-4 py-3">{formatCop(p.originalPriceCop)}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        max={90}
                        value={value}
                        aria-label={`Porcentaje descuento ${p.name}`}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [p.id]: Math.max(0, Math.min(90, Number(e.target.value))),
                          }))
                        }
                        className="h-8 w-20 rounded-lg border border-line bg-surface px-2 text-xs font-bold text-navy"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-navy">
                        {formatCop(p.finalPriceCop)}
                      </span>
                      {p.hasDiscount && (
                        <Badge tone="mint" className="ml-2">
                          -{p.discountPercent}%
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="navy"
                        disabled={discountMut.isPending}
                        onClick={() =>
                          discountMut.mutate({ id: p.id, discountPercent: value })
                        }
                      >
                        Aplicar
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
