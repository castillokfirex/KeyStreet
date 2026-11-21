\set ON_ERROR_STOP on
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
  IF (SELECT count(*) FROM products) <> 10 THEN RAISE EXCEPTION 'Se esperaban 10 productos'; END IF;
  IF (SELECT count(*) FROM products WHERE has_discount) <> 4 THEN RAISE EXCEPTION 'Se esperaban 4 descuentos'; END IF;
  IF EXISTS (SELECT 1 FROM products WHERE has_discount AND original_price_cop NOT BETWEEN 170000 AND 185000) THEN
    RAISE EXCEPTION 'Descuento fuera de rango de precio'; END IF;
  IF EXISTS (SELECT 1 FROM products WHERE NOT has_discount AND original_price_cop BETWEEN 170000 AND 185000) THEN
    RAISE EXCEPTION 'Producto elegible sin descuento'; END IF;

  IF (SELECT count(*) FROM products WHERE (slug, final_price_cop) IN
      (('nike-air-force-1-low-07-blanco',166500),('puma-suede-xl',162800),
       ('new-balance-574',154000),('converse-chuck-taylor-all-star-clasico',144500))) <> 4 THEN
    RAISE EXCEPTION 'Precios finales con descuento incorrectos'; END IF;

  IF (SELECT count(*) FROM products WHERE (slug, original_price_cop) IN
      (('nike-air-force-1-low-07-blanco',185000),('nike-dunk-low-retro-panda',195000),
       ('nike-air-jordan-1-retro-high-og',220000),('adidas-samba-og-blanco-negro',190000),
       ('adidas-campus-00s-gris-negro',205000),('adidas-forum-low',195000),('puma-suede-xl',185000),
       ('new-balance-550',215000),('new-balance-574',175000),
       ('converse-chuck-taylor-all-star-clasico',170000))) <> 10 THEN
    RAISE EXCEPTION 'Precios base incorrectos'; END IF;

  IF EXISTS (SELECT 1 FROM products WHERE image_placeholder_paths->>'ready' <> 'false') THEN
    RAISE EXCEPTION 'placeholders deben tener ready=false'; END IF;

  IF (SELECT count(*) FROM product_variants) <> 90 THEN RAISE EXCEPTION 'Se esperaban 90 variantes'; END IF;
  IF (SELECT count(DISTINCT sku) FROM product_variants) <> 90 THEN RAISE EXCEPTION 'SKUs duplicados'; END IF;
  IF EXISTS (SELECT 1 FROM product_variants WHERE size_eu NOT BETWEEN 36 AND 44) THEN RAISE EXCEPTION 'Talla fuera de 36-44'; END IF;

  IF (SELECT count(*) FROM users WHERE role IN ('ADMIN_TENANT','CUSTOMER')) <> 2 THEN RAISE EXCEPTION 'Usuarios dev'; END IF;
  IF EXISTS (SELECT 1 FROM users WHERE password_hash NOT LIKE '$2%') THEN RAISE EXCEPTION 'Hash no BCrypt'; END IF;

  RAISE NOTICE 'verify_seed OK: 10 productos, 4 descuentos, 90 variantes, indices e extensiones';
END $$;
