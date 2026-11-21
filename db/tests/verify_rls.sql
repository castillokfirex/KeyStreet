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

  -- Tenant Key Street
  PERFORM set_config('app.tenant_id', '00000000-0000-4000-8000-000000000001', true);
  SELECT count(*) INTO n FROM products;
  IF n <> 10 THEN RAISE EXCEPTION 'RLS: tenant correcto vio % productos (esperado 10)', n; END IF;
  SELECT count(*) INTO n FROM product_variants;
  IF n <> 90 THEN RAISE EXCEPTION 'RLS: variantes % (esperado 90)', n; END IF;

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
