import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ProblemError } from "@/lib/api";
import { adminApi, queryKeys } from "@/lib/queries";
import type { DocumentDetailResponse } from "@/lib/types";
import { uploadDocumentWithProgress } from "@/lib/upload";
import { useToastStore } from "@/stores/toast";
import { CARD, PageHeader, SkeletonRows, StatGrid, StatusPill, TABLE, THEAD, timeAgo, type PillTone } from "./ui";

const MAX_PDF_BYTES = 20 * 1024 * 1024;
/** Tiempo que el botón de borrar espera la confirmación. */
const CONFIRM_MS = 3500;

const STATUS: Record<DocumentDetailResponse["status"], { tone: PillTone; label: string }> = {
  INDEXED: { tone: "good", label: "Indexado" },
  PROCESSING: { tone: "busy", label: "Procesando" },
  FAILED: { tone: "bad", label: "Falló" },
};

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

function formatTime(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/** Botón de borrar en dos pasos: el primer clic pide confirmar. */
function DeleteButton({ title, onConfirm }: { title: string; onConfirm: () => Promise<void> }) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), CONFIRM_MS);
    return () => window.clearTimeout(t);
  }, [armed]);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (!armed) return setArmed(true);
        setBusy(true);
        try {
          await onConfirm();
        } finally {
          setBusy(false);
          setArmed(false);
        }
      }}
      onBlur={() => setArmed(false)}
      aria-label={armed ? `Confirmar eliminación de ${title}` : `Eliminar índice de ${title}`}
      className={`inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 overflow-hidden border text-[11px] font-semibold transition-[width,background-color,border-color,color,transform] duration-200 ease-out active:scale-[0.97] disabled:cursor-wait ${
        armed
          ? "w-[6.5rem] border-kast-error bg-kast-error text-white"
          : "w-8 border-line text-muted hover:border-kast-error/50 hover:text-kast-error"
      }`}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      {armed && !busy && <span className="whitespace-nowrap">Confirmar</span>}
    </button>
  );
}

export function DocumentsPage() {
  const qc = useQueryClient();
  const pushToast = useToastStore((s) => s.push);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.adminDocs,
    queryFn: () => adminApi.getDocuments(0, 30),
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      return items.some((d) => d.status === "PROCESSING") ? 3000 : false;
    },
  });

  const pickFile = (file: File | null) => {
    setUploadError(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      // Se deja seleccionar para que el servidor confirme el rechazo (415)
      setUploadError("Solo se permiten archivos .pdf.");
      setSelectedFile(file);
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setUploadError("El archivo supera el límite de 20 MB.");
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    if (!title.trim()) setTitle(file.name.replace(/\.pdf$/i, ""));
  };

  const clearFile = () => {
    setSelectedFile(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    if (file && fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInputRef.current.files = dt.files;
    }
    pickFile(file);
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    const file = selectedFile || fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadError("Selecciona un archivo PDF para indexar.");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setUploadError("El archivo supera el límite de 20 MB.");
      return;
    }

    setUploadProgress(5);
    try {
      await uploadDocumentWithProgress(file, title, (pct) => setUploadProgress(pct));
      pushToast({
        title: "PDF recibido",
        description: "Kast está extrayendo el texto y generando los embeddings.",
        tone: "success",
      });
      setTitle("");
      clearFile();
      await qc.invalidateQueries({ queryKey: queryKeys.adminDocs });
    } catch (err) {
      setUploadError(
        err instanceof ProblemError ? `Error ${err.status}: ${err.detail}` : "No se pudo subir el documento.",
      );
    } finally {
      setUploadProgress(null);
    }
  };

  const handleDelete = async (id: string, docTitle: string) => {
    try {
      await adminApi.deleteDocument(id);
      pushToast({
        title: "Índice eliminado",
        description: `Se borraron los fragmentos de "${docTitle}".`,
        tone: "info",
      });
      await qc.invalidateQueries({ queryKey: queryKeys.adminDocs });
    } catch (err) {
      pushToast({
        title: "No se pudo eliminar",
        description: err instanceof ProblemError ? err.detail : "Error inesperado.",
        tone: "error",
      });
    }
  };

  const docs = data?.items ?? [];
  const indexed = docs.filter((d) => d.status === "INDEXED");
  const failed = docs.filter((d) => d.status === "FAILED").length;
  const processing = docs.filter((d) => d.status === "PROCESSING").length;
  const chunks = indexed.reduce((sum, d) => sum + (d.chunkCount ?? 0), 0);
  const uploading = uploadProgress !== null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Base de conocimiento de Kast"
        title="Documentos PDF"
        description="Los PDF se procesan en memoria temporal y se destruyen al terminar la indexación. Kast responde solo con lo que está aquí."
      />

      <StatGrid
        stats={[
          { label: "Documentos", value: isLoading ? "—" : docs.length },
          {
            label: "Indexados",
            value: isLoading ? "—" : indexed.length,
            tone: "good",
            hint: processing ? `${processing} en proceso` : undefined,
          },
          { label: "Fragmentos", value: isLoading ? "—" : chunks.toLocaleString("es-CO"), hint: "listos para buscar" },
          { label: "Con error", value: isLoading ? "—" : failed, tone: failed ? "bad" : "default" },
        ]}
      />

      {/* Carga */}
      <form onSubmit={handleUpload} className="space-y-4 border border-line bg-canvas p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] lg:items-end">
          <div>
            <label
              htmlFor="pdf-title"
              className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ink"
            >
              Título del documento (visible en citas)
            </label>
            <input
              id="pdf-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Guía de tallas 2026"
              maxLength={160}
              className="h-12 w-full border border-line bg-white/80 px-3.5 text-sm text-ink transition-[border-color,box-shadow] duration-150 placeholder:text-gray hover:border-ink/40 focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/[0.06]"
            />
          </div>

          <div>
            <span className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ink">
              Archivo PDF (máx. 20 MB)
            </span>
            {selectedFile ? (
              <div className="flex h-12 items-center gap-3 border border-ink/20 bg-white px-3.5">
                <FileText className="h-4 w-4 shrink-0 text-forest" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{selectedFile.name}</span>
                <span className="font-mono text-[11px] text-muted">{formatBytes(selectedFile.size)}</span>
                <button
                  type="button"
                  onClick={clearFile}
                  disabled={uploading}
                  aria-label="Quitar archivo"
                  className="-mr-1.5 flex h-8 w-8 cursor-pointer items-center justify-center text-muted transition-colors hover:text-ink"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="pdf-file"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`flex h-12 cursor-pointer items-center justify-center gap-2 border border-dashed px-3.5 text-sm transition-[background-color,border-color,color] duration-150 ${
                  dragging
                    ? "border-forest bg-mint text-forest"
                    : "border-ink/25 bg-white/60 text-muted hover:border-ink hover:text-ink"
                }`}
              >
                <UploadCloud className="h-4 w-4" aria-hidden="true" />
                {dragging ? "Suelta el PDF aquí" : "Arrastra un PDF o haz clic para elegirlo"}
              </label>
            )}
            <input
              id="pdf-file"
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              aria-label="Archivo PDF"
              onChange={(e: ChangeEvent<HTMLInputElement>) => pickFile(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
          </div>

          <Button type="submit" variant="forest" size="lg" disabled={uploading} className="lg:w-40">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
            )}
            <span>{uploading ? `${uploadProgress}%` : "Indexar"}</span>
          </Button>
        </div>

        {uploading && (
          <div className="h-1 w-full overflow-hidden bg-surface" aria-hidden="true">
            <div
              className="h-full w-full origin-left bg-forest transition-transform duration-200 ease-out"
              style={{ transform: `scaleX(${(uploadProgress ?? 0) / 100})` }}
            />
          </div>
        )}

        {uploadError && (
          <div
            role="alert"
            className="ks-rise flex items-start gap-2 border-l-2 border-kast-error bg-kast-error/[0.06] px-4 py-3 text-xs font-medium text-kast-error"
          >
            <AlertTriangle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{uploadError}</span>
          </div>
        )}
      </form>

      {/* Tabla */}
      <div className={CARD}>
        <table className={TABLE}>
          <thead className={THEAD}>
            <tr>
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">Páginas</th>
              <th className="px-4 py-3">Fragmentos</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">PDF temporal</th>
              <th className="px-4 py-3 text-right">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading ? (
              <SkeletonRows cols={6} />
            ) : docs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <p className="font-display text-sm font-bold uppercase text-ink">Sube la primera guía</p>
                  <p className="mt-1 text-xs text-muted">
                    Con una guía de tallas o políticas de envío, Kast ya puede responder a los clientes.
                  </p>
                </td>
              </tr>
            ) : (
              docs.map((doc) => {
                const status = STATUS[doc.status];
                return (
                  <tr key={doc.id} className="transition-colors duration-150 hover:bg-surface/50">
                    <td className="max-w-xs px-4 py-3.5">
                      <p className="truncate text-[13px] font-semibold text-ink">{doc.title}</p>
                      <p className="mt-0.5 flex gap-2 truncate font-mono text-[10px] text-muted">
                        <span className="truncate">{doc.originalFilename}</span>
                        <span title={`SHA-256 ${doc.sha256}`}>· {doc.sha256.slice(0, 8)}</span>
                        <span>· {timeAgo(doc.createdAt)}</span>
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 tabular-nums text-ink">
                      {doc.pageCount ?? "—"}
                      {doc.ocrPageCount ? (
                        <span className="ml-1 text-muted">({doc.ocrPageCount} con OCR)</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5 font-semibold tabular-nums text-ink">{doc.chunkCount ?? "—"}</td>
                    <td className="max-w-[16rem] px-4 py-3.5">
                      <StatusPill tone={status.tone}>
                        {status.label}
                        <span className="sr-only"> ({doc.status})</span>
                      </StatusPill>
                      {doc.error?.message && (
                        <p className="mt-1.5 text-[11px] leading-snug text-kast-error">{doc.error.message}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {doc.tempFile?.verified ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-forest">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>
                            PDF eliminado ✓ verificado
                            <span className="ml-1 font-mono text-[10px] text-muted">
                              {formatTime(doc.tempFile.deletedAt)}
                            </span>
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
                          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                          En limpieza…
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <DeleteButton title={doc.title} onConfirm={() => handleDelete(doc.id, doc.title)} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <details className="group border border-line bg-canvas px-5 py-4 text-xs leading-relaxed text-muted">
        <summary className="flex cursor-pointer list-none items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-ink">
          Cómo se protege cada PDF
          <span aria-hidden="true" className="transition-transform duration-200 ease-out group-open:rotate-45">
            +
          </span>
        </summary>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>
            El PDF original vive en tu equipo: se recibe por HTTPS, se procesa en memoria temporal (máx. 20 MB y 150
            páginas) y se destruye al terminar.
          </li>
          <li>Las tablas complejas o los escaneos de baja resolución pueden reducir la precisión del OCR (spa+eng).</li>
          <li>No se aceptan PDF cifrados ni duplicados (mismo SHA-256 dentro de la tienda).</li>
        </ul>
      </details>
    </div>
  );
}
