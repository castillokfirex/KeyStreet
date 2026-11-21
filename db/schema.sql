-- ============ Extensiones y utilidades ============
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS citext;

-- FTS español sin tildes ("guía" = "guia"), inmutable para columnas generadas
CREATE TEXT SEARCH CONFIGURATION es_unaccent (COPY = pg_catalog.spanish);
ALTER TEXT SEARCH CONFIGURATION es_unaccent
  ALTER MAPPING FOR hword, hword_part, word WITH unaccent, spanish_stem;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

-- Tenant de la transacción actual; NULL => RLS no devuelve filas (falla cerrada)
CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid $$;

-- ============ Tenants ============
CREATE TABLE tenants (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           varchar(63)  NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name           varchar(120) NOT NULL,
  legal_name     varchar(160),
  whatsapp_phone varchar(15)  NOT NULL CHECK (whatsapp_phone ~ '^[1-9][0-9]{7,14}$'),
  currency       char(3)      NOT NULL DEFAULT 'COP',
  locale         varchar(10)  NOT NULL DEFAULT 'es-CO',
  branding       jsonb        NOT NULL DEFAULT '{}'::jsonb,  -- colores, tipografías, logo variant, promo bar
  settings       jsonb        NOT NULL DEFAULT '{}'::jsonb,  -- envío gratis desde, dominios, límites RAG
  status         varchar(16)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED')),
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_at     timestamptz  NOT NULL DEFAULT now()
);

-- ============ Usuarios y sesiones ============
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email         citext NOT NULL,
  password_hash varchar(100) NOT NULL,                       -- BCrypt ($2a$/$2b$)
  full_name     varchar(120),
  role          varchar(20) NOT NULL CHECK (role IN ('ADMIN_TENANT','CUSTOMER')),
  is_active     boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email),
  UNIQUE (tenant_id, id)
);

CREATE TABLE refresh_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  user_id     uuid NOT NULL,
  token_hash  char(64) NOT NULL UNIQUE,                     -- SHA-256 del token opaco
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, user_id) REFERENCES users(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX ix_refresh_tokens_user_active ON refresh_tokens (user_id) WHERE revoked_at IS NULL;

-- ============ Catálogo ============
CREATE TABLE brands (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       varchar(80) NOT NULL,
  slug       varchar(80) NOT NULL,
  code       varchar(4)  NOT NULL,                           -- prefijo SKU (NIK, ADI…)
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug), UNIQUE (tenant_id, code), UNIQUE (tenant_id, id)
);

CREATE TABLE products (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  brand_id           uuid NOT NULL,
  name               varchar(160) NOT NULL,
  slug               varchar(160) NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  model_code         varchar(12)  NOT NULL,
  category           varchar(40)  NOT NULL DEFAULT 'SNEAKERS',
  silhouette         varchar(8)   NOT NULL CHECK (silhouette IN ('LOW','MID','HIGH')),
  colorway           varchar(80),
  short_description  varchar(280) NOT NULL,
  description        text,
  badge              varchar(30),                            -- BESTSELLER, CLÁSICO, NUEVO DROP…
  original_price_cop integer  NOT NULL CHECK (original_price_cop > 0),
  discount_percent   smallint NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 90),
  discount_price_cop integer GENERATED ALWAYS AS (
      CASE WHEN discount_percent > 0
           THEN (((original_price_cop::bigint * (100 - discount_percent)) / 10000) * 100)::integer
      END) STORED,                                          -- redondeo a la centena inferior
  final_price_cop    integer GENERATED ALWAYS AS (
      CASE WHEN discount_percent > 0
           THEN (((original_price_cop::bigint * (100 - discount_percent)) / 10000) * 100)::integer
           ELSE original_price_cop END) STORED,
  has_discount       boolean GENERATED ALWAYS AS (discount_percent > 0) STORED,
  model_3d_url       varchar(255),                           -- /assets/models/{slug}.glb
  model_3d_ready     boolean NOT NULL DEFAULT false,         -- false => placeholder procedural
  image_placeholder_paths jsonb NOT NULL DEFAULT '{}'::jsonb,
  material_specs     jsonb NOT NULL DEFAULT '{}'::jsonb,
  style_tags         text[] NOT NULL DEFAULT '{}',
  is_active          boolean NOT NULL DEFAULT true,
  search_vector      tsvector GENERATED ALWAYS AS (
      setweight(to_tsvector('es_unaccent'::regconfig, coalesce(name,'')), 'A') ||
      setweight(to_tsvector('es_unaccent'::regconfig, coalesce(colorway,'')), 'B') ||
      setweight(to_tsvector('es_unaccent'::regconfig, coalesce(short_description,'')), 'C')) STORED,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, brand_id) REFERENCES brands(tenant_id, id)
);
CREATE INDEX ix_products_catalog   ON products (tenant_id, is_active, final_price_cop);
CREATE INDEX ix_products_brand     ON products (tenant_id, brand_id);
CREATE INDEX ix_products_discount  ON products (tenant_id) WHERE has_discount;
CREATE INDEX ix_products_tags      ON products USING gin (style_tags);
CREATE INDEX ix_products_fts       ON products USING gin (search_vector);
CREATE INDEX ix_products_materials ON products USING gin (material_specs jsonb_path_ops);

CREATE TABLE product_variants (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL,
  product_id uuid NOT NULL,
  sku        varchar(40) NOT NULL,                           -- KS-NIK-AF1-40
  size_eu    smallint NOT NULL CHECK (size_eu BETWEEN 36 AND 44),
  stock      integer  NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active  boolean  NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, sku), UNIQUE (product_id, size_eu), UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, product_id) REFERENCES products(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX ix_variants_size_in_stock ON product_variants (tenant_id, size_eu) WHERE stock > 0 AND is_active;

-- ============ RAG: documentos (sin binario) ============
CREATE TABLE documents (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  uploaded_by        uuid,
  title              varchar(200) NOT NULL,
  original_filename  varchar(255) NOT NULL,
  mime_type          varchar(50)  NOT NULL DEFAULT 'application/pdf' CHECK (mime_type = 'application/pdf'),
  size_bytes         bigint  NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 52428800),
  sha256_hash        char(64) NOT NULL CHECK (sha256_hash ~ '^[a-f0-9]{64}$'),
  status             varchar(12) NOT NULL DEFAULT 'PROCESSING'
                     CHECK (status IN ('PROCESSING','INDEXED','FAILED')),
  page_count         integer,
  ocr_page_count     integer NOT NULL DEFAULT 0,
  chunk_count        integer NOT NULL DEFAULT 0,
  embedding_model    varchar(80),
  embedding_dim      smallint,
  error_code         varchar(60),
  error_message      varchar(500),
  temp_file_deleted_at        timestamptz,
  temp_file_deletion_verified boolean NOT NULL DEFAULT false,
  processing_started_at       timestamptz NOT NULL DEFAULT now(),
  indexed_at         timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, sha256_hash),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, uploaded_by) REFERENCES users(tenant_id, id) ON DELETE SET NULL (uploaded_by)
);
CREATE INDEX ix_documents_tenant_status ON documents (tenant_id, status, created_at DESC);

CREATE TABLE document_chunks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  document_id     uuid NOT NULL,
  chunk_order     integer  NOT NULL CHECK (chunk_order >= 0),
  content         text     NOT NULL CHECK (length(content) > 0),
  token_count     smallint NOT NULL,
  page_number     integer  NOT NULL CHECK (page_number >= 1),
  page_end        integer  NOT NULL,
  section_title   varchar(300),
  ocr_applied     boolean  NOT NULL DEFAULT false,
  metadata        jsonb    NOT NULL DEFAULT '{}'::jsonb,     -- {document, char_start, heading_path…}
  embedding       vector(768) NOT NULL,
  embedding_model varchar(80) NOT NULL,
  search_vector   tsvector GENERATED ALWAYS AS (
      setweight(to_tsvector('es_unaccent'::regconfig, coalesce(section_title,'')), 'A') ||
      setweight(to_tsvector('es_unaccent'::regconfig, content), 'B')) STORED,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (page_end >= page_number),
  UNIQUE (document_id, chunk_order),
  FOREIGN KEY (tenant_id, document_id) REFERENCES documents(tenant_id, id) ON DELETE CASCADE
);
-- HNSW ajustado a 768 dims, distancia coseno (embeddings normalizados L2)
CREATE INDEX ix_chunks_embedding_hnsw ON document_chunks
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX ix_chunks_search_gin  ON document_chunks USING gin (search_vector);
CREATE INDEX ix_chunks_tenant_doc  ON document_chunks (tenant_id, document_id, chunk_order);

-- ============ Trazabilidad RAG ============
CREATE TABLE rag_audit_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id          uuid,                                     -- sin FK: el log sobrevive al usuario
  session_id       uuid,
  channel          varchar(20) NOT NULL DEFAULT 'STOREFRONT' CHECK (channel IN ('STOREFRONT','ADMIN')),
  question         text NOT NULL,
  product_slug     varchar(160),
  answer           text,
  status           varchar(16) NOT NULL CHECK (status IN ('ANSWERED','NO_EVIDENCE','REJECTED','ERROR')),
  retrieved        jsonb NOT NULL DEFAULT '[]'::jsonb,       -- [{chunkId, vecRank, textRank, rrf, cosSim}]
  citations        jsonb NOT NULL DEFAULT '[]'::jsonb,       -- [{n, documentId, title, page, pageEnd, section, chunkId}]
  embedding_model  varchar(80),
  chat_model       varchar(80),
  prompt_tokens    integer,
  completion_tokens integer,
  latency_ms       integer,
  client_ip_hash   char(64),
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_rag_audit_tenant_created ON rag_audit_logs (tenant_id, created_at DESC);

-- ============ Intenciones de pedido por WhatsApp (analítica) ============
CREATE TABLE whatsapp_order_intents (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id    uuid,
  items      jsonb   NOT NULL,                               -- [{variantId, sku, name, size, qty, unitPriceCop}]
  total_cop  integer NOT NULL CHECK (total_cop > 0),
  message    text    NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_wa_intents_tenant_created ON whatsapp_order_intents (tenant_id, created_at DESC);

-- ============ Triggers updated_at ============
CREATE TRIGGER trg_tenants_upd   BEFORE UPDATE ON tenants          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_upd     BEFORE UPDATE ON users            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_products_upd  BEFORE UPDATE ON products         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_variants_upd  BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_documents_upd BEFORE UPDATE ON documents        FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============ Row-Level Security (defensa en profundidad) ============
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','refresh_tokens','brands','products','product_variants',
                           'documents','document_chunks','rag_audit_logs','whatsapp_order_intents'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (tenant_id = app_current_tenant())
                    WITH CHECK (tenant_id = app_current_tenant())', t);
  END LOOP;
END $$;

-- ============ Privilegios mínimos ============
GRANT USAGE ON SCHEMA public TO keystreet_app, keystreet_rag;
GRANT SELECT ON tenants TO keystreet_app, keystreet_rag;
GRANT UPDATE (whatsapp_phone, branding, settings, name) ON tenants TO keystreet_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON users, refresh_tokens, brands, products, product_variants,
      documents, whatsapp_order_intents TO keystreet_app;
GRANT SELECT, DELETE ON document_chunks TO keystreet_app;           -- verificar conteo / borrar índice
GRANT SELECT ON rag_audit_logs TO keystreet_app;
GRANT SELECT ON documents, products, brands TO keystreet_rag;
GRANT SELECT, INSERT, DELETE ON document_chunks TO keystreet_rag;
GRANT INSERT ON rag_audit_logs TO keystreet_rag;
