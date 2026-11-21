import { API_BASE, ProblemError, TENANT_SLUG } from "./api";
import type { DocumentUploadResponse, ProblemDetailPayload } from "./types";
import { useAuthStore } from "@/stores/auth";

export function uploadDocumentWithProgress(
  file: File,
  title: string,
  onProgress?: (percent: number) => void,
): Promise<DocumentUploadResponse> {
  return new Promise((resolve, reject) => {
    const token = useAuthStore.getState().accessToken;
    const xhr = new XMLHttpRequest();
    const qs = title.trim()
      ? `?title=${encodeURIComponent(title.trim())}`
      : "";
    xhr.open("POST", `${API_BASE}/v1/admin/documents${qs}`);
    xhr.withCredentials = true;
    xhr.setRequestHeader("X-Tenant-Slug", TENANT_SLUG);
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && onProgress) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    };

    xhr.onload = () => {
      let parsed: ProblemDetailPayload | DocumentUploadResponse;
      try {
        parsed = JSON.parse(xhr.responseText || "{}");
      } catch {
        parsed = { detail: xhr.statusText };
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(parsed as DocumentUploadResponse);
      } else {
        reject(new ProblemError(xhr.status, parsed as ProblemDetailPayload));
      }
    };

    xhr.onerror = () => {
      reject(
        new ProblemError(0, {
          detail: "Error de red al subir el PDF.",
        }),
      );
    };

    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}
