\set ON_ERROR_STOP on
BEGIN;
SET LOCAL ROLE keystreet_app;

DO $$
DECLARE n int;
BEGIN
  -- Sin tenant: falla cerrada
  SELECT count(*) INTO n FROM products;
  IF n <> 0 THEN RAISE EXCEPTION 'RLS: sin tenant se vieron % productos', n; END IF;

  -- Tenant inexistente
  PERFORM set_config('app.tenant_id', '00000000-0000-4000-8000-0000000000ff', true);
  SELECT count(*) INTO n FROM products;
  IF n <> 0 THEN RAISE EXCEPTION 'RLS: tenant ajeno vio % productos', n; END IF;

  -- Tenant Key Street: ve su catálogo de 14 modelos activos (los retirados siguen siendo suyos)
  PERFORM set_config('app.tenant_id', '00000000-0000-4000-8000-000000000001', true);
  SELECT count(*) INTO n FROM products WHERE is_active;
  IF n <> 14 THEN RAISE EXCEPTION 'RLS: tenant correcto vio % productos activos (esperado 14)', n; END IF;
  SELECT count(*) INTO n FROM product_variants v JOIN products p ON p.id = v.product_id
  WHERE p.is_active AND v.is_active;
  IF n <> 126 THEN RAISE EXCEPTION 'RLS: variantes activas % (esperado 126)', n; END IF;
  IF EXISTS (SELECT 1 FROM products WHERE tenant_id <> '00000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'RLS: se vieron filas de otro tenant'; END IF;

  -- Insercion con otro tenant debe ser rechazada por WITH CHECK
  BEGIN
    INSERT INTO brands (tenant_id, name, slug, code)
    VALUES ('00000000-0000-4000-8000-0000000000ff', 'X', 'x', 'XXX');
    RAISE EXCEPTION 'RLS: se permitio insertar en otro tenant';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL; -- esperado: violacion de politica / permisos
  END;

  RAISE NOTICE 'verify_rls OK';
END $$;
ROLLBACK;
