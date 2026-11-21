import { apiFetch, TENANT_SLUG } from "./api";
import type {
  AssistantQueryResponse,
  AuthResponse,
  DocumentDetailResponse,
  FacetsDto,
  PagedResponse,
  ProductDetailDto,
  ProductSummaryDto,
  RagAuditEntryDto,
  TenantPublicDto,
  VariantDto,
  WhatsappIntentRes,
} from "./types";

export interface CatalogQueryParams {
  brand?: string;
  size?: number;
  minPrice?: number;
  maxPrice?: number;
  discounted?: boolean;
  silhouette?: string;
  tags?: string;
  q?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export function buildCatalogSearchParams(params: CatalogQueryParams): string {
  const qs = new URLSearchParams();
  if (params.brand) qs.set("brand", params.brand);
  if (params.size) qs.set("size", String(params.size));
  if (params.minPrice !== undefined) qs.set("minPrice", String(params.minPrice));
  if (params.maxPrice !== undefined) qs.set("maxPrice", String(params.maxPrice));
  if (params.discounted) qs.set("discounted", "true");
  if (params.silhouette) qs.set("silhouette", params.silhouette);
  if (params.tags) qs.set("tags", params.tags);
  if (params.q) qs.set("q", params.q);
  if (params.sort) qs.set("sort", params.sort);
  qs.set("page", String(params.page ?? 0));
  qs.set("pageSize", String(params.pageSize ?? 24));
  return qs.toString();
}

export const publicApi = {
  getTenant: () => apiFetch<TenantPublicDto>("/v1/public/tenant"),
  getProducts: (params: CatalogQueryParams = {}) =>
    apiFetch<PagedResponse<ProductSummaryDto>>(
      `/v1/public/products?${buildCatalogSearchParams(params)}`,
    ),
  getFacets: () => apiFetch<FacetsDto>("/v1/public/products/facets"),
  getProduct: (slug: string) =>
    apiFetch<ProductDetailDto>(`/v1/public/products/${encodeURIComponent(slug)}`),
  getRelated: (slug: string, limit = 4) =>
    apiFetch<ProductSummaryDto[]>(
      `/v1/public/products/${encodeURIComponent(slug)}/related?limit=${limit}`,
    ),
  createWhatsappIntent: (items: { variantId: string; quantity: number }[]) =>
    apiFetch<WhatsappIntentRes>("/v1/public/orders/whatsapp-intent", {
      method: "POST",
      body: JSON.stringify({ items }),
    }),
};

export const assistantApi = {
  query: (payload: {
    question: string;
    productSlug?: string;
    sessionId?: string;
  }) =>
    apiFetch<AssistantQueryResponse>("/v1/assistant/query", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export const authApi = {
  login: (payload: { email: string; password: string }) =>
    apiFetch<AuthResponse>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  logout: () =>
    apiFetch<void>("/v1/auth/logout", {
      method: "POST",
    }),
};

export const adminApi = {
  getDocuments: (page = 0, pageSize = 20) =>
    apiFetch<PagedResponse<DocumentDetailResponse>>(
      `/v1/admin/documents?page=${page}&pageSize=${pageSize}`,
    ),
  deleteDocument: (id: string) =>
    apiFetch<void>(`/v1/admin/documents/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  getProducts: (page = 0, pageSize = 24) =>
    apiFetch<PagedResponse<ProductSummaryDto>>(
      `/v1/admin/products?page=${page}&pageSize=${pageSize}`,
    ),
  patchDiscount: (id: string, discountPercent: number) =>
    apiFetch<ProductDetailDto>(
      `/v1/admin/products/${encodeURIComponent(id)}/discount`,
      {
        method: "PATCH",
        body: JSON.stringify({ discountPercent }),
      },
    ),
  updateVariantStock: (variantId: string, stock: number) =>
    apiFetch<VariantDto>(
      `/v1/admin/variants/${encodeURIComponent(variantId)}/stock`,
      {
        method: "PUT",
        body: JSON.stringify({ stock }),
      },
    ),
  getRagAudit: (page = 0, pageSize = 20) =>
    apiFetch<PagedResponse<RagAuditEntryDto>>(
      `/v1/admin/rag-audit?page=${page}&pageSize=${pageSize}`,
    ),
};

export const queryKeys = {
  tenant: [TENANT_SLUG, "tenant"] as const,
  facets: [TENANT_SLUG, "facets"] as const,
  products: (params: CatalogQueryParams) =>
    [TENANT_SLUG, "products", params] as const,
  product: (slug: string) => [TENANT_SLUG, "product", slug] as const,
  related: (slug: string) => [TENANT_SLUG, "related", slug] as const,
  adminDocs: [TENANT_SLUG, "admin", "documents"] as const,
  adminProducts: [TENANT_SLUG, "admin", "products"] as const,
  adminAudit: [TENANT_SLUG, "admin", "audit"] as const,
};
