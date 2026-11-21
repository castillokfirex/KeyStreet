import type { components } from "./api-types";
import type { CitationItem } from "@/stores/assistant";
import type { AuthUser } from "@/stores/auth";

export type ApiSchemas = components["schemas"];

export interface ProductImages {
  basePath: string;
  files: string[];
  aspect: string;
  ready: boolean;
}

export interface ProductHotspot {
  id: string;
  label: string;
  normal: [number, number, number];
  position: [number, number, number];
}

export interface ProductPalette {
  sole?: string;
  upper?: string;
  accent?: string;
}

export interface ProductMaterialSpecs {
  fit?: "TRUE_TO_SIZE" | "RUNS_SMALL" | "RUNS_LARGE";
  care?: string[];
  upper?: string;
  lining?: string;
  closure?: string;
  midsole?: string;
  outsole?: string;
  weightGrams?: number;
  palette?: ProductPalette;
  hotspots?: ProductHotspot[];
}

export interface VariantDto {
  id: string;
  sku: string;
  sizeEu: number;
  stock: number;
  inStock: boolean;
}

export interface ProductSummaryDto {
  id: string;
  slug: string;
  name: string;
  brand: string;
  brandSlug: string;
  modelCode: string;
  category: string;
  silhouette: "LOW" | "HIGH" | string;
  colorway?: string;
  shortDescription: string;
  badge?: string | null;
  originalPriceCop: number;
  discountPercent: number;
  discountPriceCop?: number | null;
  finalPriceCop: number;
  hasDiscount: boolean;
  images: ProductImages;
  availableSizes: number[];
  styleTags: string[];
  model3dReady: boolean;
  model3dUrl: string;
  isActive: boolean;
}

export interface ProductDetailDto {
  id: string;
  slug: string;
  name: string;
  brand: string;
  brandSlug: string;
  modelCode: string;
  category: string;
  silhouette: "LOW" | "HIGH" | string;
  colorway?: string;
  shortDescription: string;
  description?: string;
  badge?: string | null;
  originalPriceCop: number;
  discountPercent: number;
  discountPriceCop?: number | null;
  finalPriceCop: number;
  hasDiscount: boolean;
  model3dUrl: string;
  model3dReady: boolean;
  images: ProductImages;
  materialSpecs: ProductMaterialSpecs;
  styleTags: string[];
  variants: VariantDto[];
}

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface FacetsDto {
  brands: { slug: string; name: string; count: number }[];
  sizes: { sizeEu: number; count: number }[];
  silhouettes: string[];
  minPriceCop: number;
  maxPriceCop: number;
  discountedCount: number;
}

export interface TenantBranding {
  promoBar?: string;
  primary?: string;
  navy?: string;
  surface?: string;
  fontDisplay?: string;
  fontBody?: string;
}

export interface TenantPublicDto {
  id: string;
  slug: string;
  name: string;
  whatsappPhone: string;
  currency: string;
  locale: string;
  branding: TenantBranding;
  settings: {
    ragTopK?: number;
    freeShippingFromCop?: number;
  };
}

export interface WhatsappIntentRes {
  intentId: string;
  totalCop: number;
  message: string;
  whatsappUrl: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
}

export interface AssistantQueryResponse {
  status: "ANSWERED" | "NO_EVIDENCE" | "REJECTED" | "ERROR";
  answer: string;
  citations: CitationItem[];
  auditId?: string;
  latencyMs: number;
}

export interface DocumentDetailResponse {
  id: string;
  title: string;
  originalFilename: string;
  status: "PROCESSING" | "INDEXED" | "FAILED";
  sha256: string;
  sizeBytes: number;
  pageCount?: number | null;
  ocrPageCount?: number | null;
  chunkCount?: number | null;
  embeddingModel?: string | null;
  embeddingDim?: number | null;
  tempFile: {
    deleted: boolean;
    verified: boolean;
    deletedAt?: string | null;
  };
  error?: {
    code?: string;
    message?: string;
  } | null;
  processingStartedAt?: string | null;
  indexedAt?: string | null;
  createdAt: string;
}

export interface DocumentUploadResponse {
  id: string;
  title: string;
  status: "PROCESSING" | "INDEXED" | "FAILED";
  sha256: string;
  sizeBytes: number;
  createdAt: string;
}

export interface RagAuditEntryDto {
  id: string;
  userId?: string | null;
  channel: string;
  question: string;
  productSlug?: string | null;
  status: string;
  citations: CitationItem[];
  embeddingModel?: string | null;
  chatModel?: string | null;
  latencyMs: number;
  createdAt: string;
}

export interface ProblemDetailPayload {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  errorCode?: string;
  existingDocumentId?: string;
}
