\set ON_ERROR_STOP on
-- Verifica el estado de datos tras 02-seed.sql + db/migrations/V002__catalogo_15_modelos.sql
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM pg_extension WHERE extname IN ('vector','pgcrypto','unaccent','citext');
  IF n <> 4 THEN RAISE EXCEPTION 'Faltan extensiones (%/4)', n; END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'es_unaccent') THEN
    RAISE EXCEPTION 'Falta configuracion FTS es_unaccent'; END IF;

  IF (SELECT format_type(atttypid, atttypmod) FROM pg_attribute
      WHERE attrelid = 'document_chunks'::regclass AND attname = 'embedding') <> 'vector(768)' THEN
    RAISE EXCEPTION 'embedding no es vector(768)'; END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_chunks_embedding_hnsw'
                 AND indexdef LIKE '%hnsw%' AND indexdef LIKE '%vector_cosine_ops%') THEN
    RAISE EXCEPTION 'Falta indice HNSW coseno'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_chunks_search_gin' AND indexdef LIKE '%gin%') THEN
    RAISE EXCEPTION 'Falta indice GIN de search_vector'; END IF;

  IF (SELECT count(*) FROM tenants WHERE name = 'Key Street') <> 1 THEN RAISE EXCEPTION 'Tenant Key Street'; END IF;

  -- Catálogo: exactamente 15 modelos activos (los retirados quedan inactivos, no se borran)
  IF (SELECT count(*) FROM products WHERE tenant_id = '00000000-0000-4000-8000-000000000001' AND is_active) <> 15 THEN RAISE EXCEPTION 'Se esperaban 15 productos activos'; END IF;
  IF EXISTS (SELECT 1 FROM products WHERE tenant_id = '00000000-0000-4000-8000-000000000001' AND is_active AND slug IN
      ('adidas-forum-low','new-balance-574','nike-air-jordan-1-retro-high-og','adidas-campus-00s-gris-negro')) THEN
    RAISE EXCEPTION 'Modelo retirado sigue activo'; END IF;

  -- Regla de descuentos: 4 modelos activos con 10%-15%
  IF (SELECT count(*) FROM products WHERE tenant_id = '00000000-0000-4000-8000-000000000001' AND is_active AND has_discount) <> 4 THEN RAISE EXCEPTION 'Se esperaban 4 descuentos'; END IF;
  IF EXISTS (SELECT 1 FROM products WHERE tenant_id = '00000000-0000-4000-8000-000000000001' AND is_active AND has_discount AND discount_percent NOT BETWEEN 10 AND 15) THEN
    RAISE EXCEPTION 'Descuento fuera de 10%%-15%%'; END IF;

  IF (SELECT count(*) FROM products WHERE tenant_id = '00000000-0000-4000-8000-000000000001' AND is_active AND (slug, final_price_cop) IN
      (('nike-air-force-1-low-07-blanco',526400),('puma-suede-xl',395900),
       ('new-balance-530',466300),('converse-chuck-taylor-all-star-clasico',254900))) <> 4 THEN
    RAISE EXCEPTION 'Precios finales con descuento incorrectos'; END IF;

  IF (SELECT count(*) FROM products WHERE tenant_id = '00000000-0000-4000-8000-000000000001' AND is_active AND (slug, original_price_cop) IN
      (('nike-air-force-1-low-07-blanco',584950),('adidas-superstar',549950),
       ('nike-dunk-low-retro-panda',679950),('air-jordan-1-low',699950),('vans-old-skool',329900),
       ('adidas-samba-og-blanco-negro',499950),('converse-chuck-taylor-all-star-clasico',299900),
       ('adidas-stan-smith',549950),('new-balance-550',649900),('new-balance-530',529900),
       ('adidas-campus-00s',499950),('puma-suede-xl',449900),('adidas-handball-spezial',549950),
       ('air-jordan-4',1219950),('nike-court-vision-low',459950))) <> 15 THEN
    RAISE EXCEPTION 'Precios base incorrectos'; END IF;

  -- Imágenes: ready=true exige archivos; ready=false no referencia ningún archivo (cero 404)
  IF EXISTS (SELECT 1 FROM products WHERE tenant_id = '00000000-0000-4000-8000-000000000001' AND is_active AND (image_placeholder_paths->>'ready')::boolean
             AND jsonb_array_length(image_placeholder_paths->'files') = 0) THEN
    RAISE EXCEPTION 'ready=true sin archivos'; END IF;
  IF EXISTS (SELECT 1 FROM products WHERE tenant_id = '00000000-0000-4000-8000-000000000001' AND is_active AND NOT (image_placeholder_paths->>'ready')::boolean
             AND jsonb_array_length(image_placeholder_paths->'files') > 0) THEN
    RAISE EXCEPTION 'ready=false con archivos referenciados'; END IF;

  -- 3D: cada modelo activo tiene su .glb
  IF EXISTS (SELECT 1 FROM products WHERE tenant_id = '00000000-0000-4000-8000-000000000001' AND is_active AND (model_3d_url IS NULL OR model_3d_url NOT LIKE '/assets/models/%.glb')) THEN
    RAISE EXCEPTION 'Modelo 3D sin URL'; END IF;

  -- Variantes: 15 x 9 tallas activas, SKUs únicos, tallas 36-44
  IF (SELECT count(*) FROM product_variants v JOIN products p ON p.id = v.product_id
      WHERE p.tenant_id = '00000000-0000-4000-8000-000000000001' AND p.is_active AND v.is_active) <> 135 THEN RAISE EXCEPTION 'Se esperaban 135 variantes activas'; END IF;
  IF (SELECT count(DISTINCT sku) FROM product_variants) <> (SELECT count(*) FROM product_variants) THEN
    RAISE EXCEPTION 'SKUs duplicados'; END IF;
  IF EXISTS (SELECT 1 FROM product_variants WHERE size_eu NOT BETWEEN 36 AND 44) THEN RAISE EXCEPTION 'Talla fuera de 36-44'; END IF;

  IF (SELECT count(*) FROM users WHERE role IN ('ADMIN_TENANT','CUSTOMER')) <> 2 THEN RAISE EXCEPTION 'Usuarios dev'; END IF;
  IF EXISTS (SELECT 1 FROM users WHERE password_hash NOT LIKE '$2%') THEN RAISE EXCEPTION 'Hash no BCrypt'; END IF;

  RAISE NOTICE 'verify_seed OK: 15 productos activos, 4 descuentos, 135 variantes activas, indices e extensiones';
END $$;
