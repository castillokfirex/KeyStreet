import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock, Trash2, UploadCloud } from "lucide-react";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProblemError } from "@/lib/api";
import { adminApi, queryKeys } from "@/lib/queries";
import { uploadDocumentWithProgress } from "@/lib/upload";
import { useToastStore } from "@/stores/toast";

const MAX_PDF_BYTES = 20 * 1024 * 1024;

function formatTime(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function DocumentsPage() {
  const qc = useQueryClient();
  const pushToast = useToastStore((s) => s.push);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.adminDocs,
    queryFn: () => adminApi.getDocuments(0, 30),
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      return items.some((d) => d.status === "PROCESSING") ? 3000 : false;
    },
  });

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0] || null;
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Solo se permiten archivos con extensión .pdf.");
      setSelectedFile(file); // permitimos probar validación servidor si el admin insiste, o rechazamos no-pdf
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setUploadError("El archivo supera el límite máximo de 20 MB.");
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    if (!title.trim()) {
      setTitle(file.name.replace(/\.pdf$/i, ""));
    }
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
      setUploadError("El archivo supera el límite máximo de 20 MB.");
      return;
    }

    setUploadProgress(5);
    try {
      await uploadDocumentWithProgress(file, title, (pct) =>
        setUploadProgress(pct),
      );
      pushToast({
        title: "PDF recibido para indexación efímera",
        description: "Procesando texto/OCR y generando embeddings...",
        tone: "success",
      });
      setTitle("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await qc.invalidateQueries({ queryKey: queryKeys.adminDocs });
    } catch (err) {
      const msg =
        err instanceof ProblemError
          ? `Error ${err.status}: ${err.detail}`
          : "No se pudo subir el documento.";
      setUploadError(msg);
    } finally {
      setUploadProgress(null);
    }
  };

  const handleDelete = async (id: string, docTitle: string) => {
    try {
      await adminApi.deleteDocument(id);
      pushToast({
        title: "Índice eliminado",
        description: `Se eliminaron los fragmentos de "${docTitle}".`,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-navy">
            Base Documental RAG Efímera
          </h1>
          <p className="mt-1 text-xs text-muted">
            Los PDFs se procesan en memoria RAM temporal (tmpfs) y se destruyen al finalizar la indexación.
          </p>
        </div>
      </div>

      {/* Dropzone */}
      <form
        onSubmit={handleUpload}
        className="rounded-2xl border border-line bg-canvas p-6 space-y-4"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 items-end">
          <div className="md:col-span-5 space-y-1.5">
            <label
              htmlFor="pdf-title"
              className="block font-display text-[10px] font-bold uppercase tracking-[0.16em] text-navy"
            >
              Título del documento (visible en citas)
            </label>
            <input
              id="pdf-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Guía de tallas 2026"
              className="h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-xs text-navy focus:border-navy focus:outline-none"
            />
          </div>

          <div className="md:col-span-5 space-y-1.5">
            <label
              htmlFor="pdf-file"
              className="block font-display text-[10px] font-bold uppercase tracking-[0.16em] text-navy"
            >
              Archivo PDF (máx. 20 MB)
            </label>
            <input
              id="pdf-file"
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="block w-full rounded-xl border border-dashed border-line bg-surface px-3 py-2 text-xs text-navy file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white cursor-pointer"
            />
          </div>

          <div className="md:col-span-2">
            <Button
              type="submit"
              variant="forest"
              fullWidth
              disabled={uploadProgress !== null}
            >
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
              <span>{uploadProgress !== null ? `${uploadProgress}%` : "Indexar"}</span>
            </Button>
          </div>
        </div>

        {uploadProgress !== null && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
            <div
              className="h-full bg-forest transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        {uploadError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-900"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{uploadError}</span>
          </div>
        )}
      </form>

      {/* Tabla de documentos */}
      <div className="overflow-x-auto rounded-2xl border border-line bg-canvas">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-line bg-surface/70 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            <tr>
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">SHA-256</th>
              <th className="px-4 py-3">Págs / OCR</th>
              <th className="px-4 py-3">Chunks</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Archivo temporal</th>
              <th className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  Cargando documentos...
                </td>
              </tr>
            ) : docs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  Aún no hay documentos indexados para esta tienda.
                </td>
              </tr>
            ) : (
              docs.map((doc) => (
                <tr key={doc.id} className="hover:bg-surface/40">
                  <td className="px-4 py-3 font-semibold text-navy">
                    <p>{doc.title}</p>
                    <p className="text-[11px] font-normal text-muted">
                      {doc.originalFilename}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted">
                    {doc.sha256.slice(0, 12)}…
                  </td>
                  <td className="px-4 py-3 text-navy">
                    {doc.pageCount ?? "—"} / {doc.ocrPageCount ?? 0} OCR
                  </td>
                  <td className="px-4 py-3 font-semibold text-navy">
                    {doc.chunkCount ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={
                        doc.status === "INDEXED"
                          ? "mint"
                          : doc.status === "FAILED"
                            ? "danger"
                            : "neutral"
                      }
                    >
                      {doc.status}
                    </Badge>
                    {doc.error?.message && (
                      <p className="mt-1 text-[11px] text-red-700">
                        {doc.error.message}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {doc.tempFile?.verified ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-forest">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>
                          PDF temporal eliminado ✓ verificado{" "}
                          {formatTime(doc.tempFile.deletedAt)}
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>En limpieza...</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id, doc.title)}
                      aria-label={`Eliminar índice de ${doc.title}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-red-300 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Aviso de limitaciones */}
      <div className="rounded-2xl border border-line bg-canvas p-5 text-xs leading-relaxed text-muted">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-navy">
          Arquitectura efímera y limitaciones técnicas
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>
            El PDF original vive únicamente en tu equipo: se recibe por HTTPS, se procesa en
            memoria temporal (máx. 20 MB y 150 páginas) y se destruye físicamente al terminar.
          </li>
          <li>
            Las tablas muy complejas o escaneos de baja resolución pueden reducir la precisión del OCR (spa+eng).
          </li>
          <li>
            No se aceptan PDFs cifrados ni documentos duplicados (SHA-256 idéntico dentro de la tienda).
          </li>
        </ul>
      </div>
    </div>
  );
}
