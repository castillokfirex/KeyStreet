-- ============================================================
-- Key Street — seed.sql (ejecuta como superusuario en init; RLS no aplica)
-- ============================================================
BEGIN;

-- ---------- Tenant por defecto ----------
INSERT INTO tenants (id, slug, name, legal_name, whatsapp_phone, branding, settings)
VALUES (
  '00000000-0000-4000-8000-000000000001', 'key-street', 'Key Street', 'Key Street Colombia S.A.S.', '573176576059',
  '{"primary":"#16302B","navy":"#0F172A","surface":"#F5F6F8","fontDisplay":"Space Grotesk","fontBody":"Plus Jakarta Sans",
    "promoBar":"Envíos express gratis a toda Colombia por compras superiores a $300.000 COP"}'::jsonb,
  '{"freeShippingFromCop":300000,"ragTopK":6}'::jsonb);

-- ---------- Usuarios dev (BCrypt vía pgcrypto) ----------
INSERT INTO users (tenant_id, email, password_hash, full_name, role) VALUES
 ('00000000-0000-4000-8000-000000000001', 'admin@keystreet.co',   crypt('KeyStreet2026!', gen_salt('bf', 10)), 'Admin Key Street', 'ADMIN_TENANT'),
 ('00000000-0000-4000-8000-000000000001', 'cliente@keystreet.co', crypt('KeyStreet2026!', gen_salt('bf', 10)), 'Juan Cliente',     'CUSTOMER');

-- ---------- Marcas ----------
INSERT INTO brands (tenant_id, name, slug, code) VALUES
 ('00000000-0000-4000-8000-000000000001', 'Nike',        'nike',        'NIK'),
 ('00000000-0000-4000-8000-000000000001', 'Adidas',      'adidas',      'ADI'),
 ('00000000-0000-4000-8000-000000000001', 'Puma',        'puma',        'PUM'),
 ('00000000-0000-4000-8000-000000000001', 'New Balance', 'new-balance', 'NBL'),
 ('00000000-0000-4000-8000-000000000001', 'Converse',    'converse',    'CNV');

-- ---------- 10 productos (descuento se aplica después por regla) ----------
CREATE TEMP TABLE seed_products (
  slug text, name text, brand_code text, model_code text, silhouette text, colorway text,
  short_description text, badge text, price int,
  upper text, lining text, midsole text, outsole text, closure text, fit text, weight int,
  c_upper text, c_accent text, c_sole text, tags text[]
) ON COMMIT DROP;

INSERT INTO seed_products VALUES
('nike-air-force-1-low-07-blanco', 'Nike Air Force 1 Low ''07 (Blanco)', 'NIK', 'AF1', 'LOW', 'Blanco',
 'El modelo clásico más vendido y buscado en todo el país.', 'BESTSELLER', 185000,
 'Cuero plena flor', 'Textil transpirable', 'Espuma con unidad Air encapsulada', 'Caucho con patrón pivote', 'Cordones planos', 'TRUE_TO_SIZE', 480,
 '#FFFFFF', '#FFFFFF', '#F1F1EF', ARRAY['clasico','urbano','cuero','blanco']),
('nike-dunk-low-retro-panda', 'Nike Dunk Low Retro (Panda / Blanco y Negro)', 'NIK', 'DNK', 'LOW', 'Blanco / Negro',
 'Silueta urbana de perfil bajo con alta rotación en tiendas digitales.', 'ALTA ROTACIÓN', 195000,
 'Cuero con paneles bicolor', 'Textil acolchado', 'Espuma de poliuretano', 'Caucho con patrón pivote', 'Cordones planos', 'TRUE_TO_SIZE', 450,
 '#FFFFFF', '#111111', '#F1F1EF', ARRAY['urbano','bicolor','perfil-bajo','retro']),
('nike-air-jordan-1-retro-high-og', 'Nike Air Jordan 1 Retro High OG', 'NIK', 'AJ1', 'HIGH', 'Multicolor',
 'Uno de los modelos de caña alta con mayor demanda y percepción de valor.', 'PREMIUM', 220000,
 'Cuero premium multipanel', 'Textil acolchado', 'Espuma con unidad Air-Sole', 'Caucho con patrón radial', 'Cordones redondos', 'TRUE_TO_SIZE', 560,
 '#F5F5F5', '#B3202A', '#F1F1EF', ARRAY['cana-alta','basquet','premium','retro']),
('adidas-samba-og-blanco-negro', 'Adidas Samba OG (Blanco / Negro)', 'ADI', 'SMB', 'LOW', 'Blanco / Negro',
 'Tenis retro de suela de goma que lidera las tendencias urbanas.', 'TENDENCIA', 190000,
 'Cuero con puntera de gamuza T-toe', 'Textil', 'EVA ligera', 'Goma natural de agarre', 'Cordones planos', 'RUNS_SMALL', 380,
 '#FFFFFF', '#111111', '#C9A878', ARRAY['retro','gamuza','suela-de-goma','urbano']),
('adidas-campus-00s-gris-negro', 'Adidas Campus 00s (Gris / Negro)', 'ADI', 'CMP', 'LOW', 'Gris / Negro',
 'Estilo skate de principios de los 2000 con lengüeta acolchada y cordones anchos.', 'NUEVO DROP', 205000,
 'Gamuza', 'Textil', 'EVA con suela plataforma', 'Caucho con patrón de ondas', 'Cordones anchos', 'TRUE_TO_SIZE', 520,
 '#8A8D91', '#111111', '#F1F1EF', ARRAY['skate','gamuza','y2k','plataforma']),
('adidas-forum-low', 'Adidas Forum Low', 'ADI', 'FRM', 'LOW', 'Blanco / Azul',
 'Diseño clásico de baloncesto con correa de velcro en el tobillo.', 'CLÁSICO', 195000,
 'Cuero sintético premium', 'Textil acolchado', 'Espuma moldeada', 'Caucho con patrón de espiga', 'Cordones y correa de velcro', 'TRUE_TO_SIZE', 500,
 '#FFFFFF', '#2A4B8D', '#F1F1EF', ARRAY['basquet','clasico','velcro','retro']),
('puma-suede-xl', 'Puma Suede XL', 'PUM', 'SXL', 'LOW', 'Negro / Blanco',
 'Versión robusta en gamuza con cuello acolchado y estética streetwear.', 'STREETWEAR', 185000,
 'Gamuza', 'Textil', 'EVA moldeada de perfil voluminoso', 'Caucho con patrón de espiga', 'Cordones anchos', 'TRUE_TO_SIZE', 540,
 '#1B1B1B', '#FFFFFF', '#F1F1EF', ARRAY['gamuza','streetwear','volumen','urbano']),
('new-balance-550', 'New Balance 550', 'NBL', '550', 'LOW', 'Blanco / Verde',
 'Tenis retro de baloncesto muy popular por su estética limpia y versátil.', 'BESTSELLER', 215000,
 'Cuero con detalles perforados', 'Textil', 'Espuma EVA', 'Caucho con patrón de espiga', 'Cordones planos', 'TRUE_TO_SIZE', 490,
 '#FFFFFF', '#1F6B4A', '#F1F1EF', ARRAY['retro','basquet','limpio','cuero']),
('new-balance-574', 'New Balance 574', 'NBL', '574', 'LOW', 'Gris',
 'Silueta clásica de uso diario que destaca por su comodidad y durabilidad.', 'CONFORT', 175000,
 'Gamuza y malla', 'Textil', 'ENCAP con núcleo EVA', 'Caucho de alta durabilidad', 'Cordones redondos', 'TRUE_TO_SIZE', 400,
 '#9A9EA3', '#1F3A5F', '#F1F1EF', ARRAY['confort','diario','retro','malla']),
('converse-chuck-taylor-all-star-clasico', 'Converse Chuck Taylor All Star (Bota / Clásico)', 'CNV', 'CTA', 'HIGH', 'Negro / Blanco',
 'El modelo de lona atemporal que mantiene ventas constantes todo el año.', 'ATEMPORAL', 170000,
 'Lona de algodón', 'Textil', 'Plantilla OrthoLite', 'Caucho vulcanizado', 'Cordones planos', 'RUNS_LARGE', 620,
 '#1B1B1B', '#FFFFFF', '#F4F1EA', ARRAY['lona','atemporal','cana-alta','vulcanizado']);

INSERT INTO products (tenant_id, brand_id, name, slug, model_code, category, silhouette, colorway, short_description,
                      badge, original_price_cop, discount_percent, model_3d_url, model_3d_ready,
                      image_placeholder_paths, material_specs, style_tags)
SELECT '00000000-0000-4000-8000-000000000001', b.id, p.name, p.slug, p.model_code, 'SNEAKERS', p.silhouette, p.colorway, p.short_description,
       p.badge, p.price, 0, '/assets/models/' || p.slug || '.glb', false,
       jsonb_build_object('basePath', '/assets/products/' || p.slug || '/',
                          'files', jsonb_build_array('01-lateral.webp','02-medial.webp','03-suela.webp','04-detalle.webp','05-on-feet.webp'),
                          'aspect', '4/5', 'ready', false),
       jsonb_build_object(
         'upper', p.upper, 'lining', p.lining, 'midsole', p.midsole, 'outsole', p.outsole, 'closure', p.closure,
         'fit', p.fit, 'weightGrams', p.weight,
         'care', jsonb_build_array('Limpiar con paño húmedo', 'No usar lavadora'),
         'palette', jsonb_build_object('upper', p.c_upper, 'accent', p.c_accent, 'sole', p.c_sole),
         'hotspots', jsonb_build_array(
            jsonb_build_object('id','upper','label',p.upper,'position',jsonb_build_array(0.02,0.06,0.05),'normal',jsonb_build_array(0,0,1)),
            jsonb_build_object('id','midsole','label',p.midsole,'position',jsonb_build_array(-0.09,0.015,0.04),'normal',jsonb_build_array(0,0,1)),
            jsonb_build_object('id','outsole','label',p.outsole,'position',jsonb_build_array(0,-0.01,0),'normal',jsonb_build_array(0,-1,0)))),
       p.tags
FROM seed_products p
JOIN brands b ON b.tenant_id = '00000000-0000-4000-8000-000000000001' AND b.code = p.brand_code;

-- ---------- Regla automática de descuentos: solo base entre $170.000 y $185.000 COP ----------
UPDATE products SET discount_percent = CASE slug
    WHEN 'nike-air-force-1-low-07-blanco'         THEN 10
    WHEN 'puma-suede-xl'                          THEN 12
    WHEN 'new-balance-574'                        THEN 12
    WHEN 'converse-chuck-taylor-all-star-clasico' THEN 15 END
WHERE tenant_id = '00000000-0000-4000-8000-000000000001'
  AND original_price_cop BETWEEN 170000 AND 185000;

DO $$ BEGIN
  IF (SELECT count(*) FROM products WHERE has_discount) <> 4
     OR EXISTS (SELECT 1 FROM products WHERE has_discount AND discount_percent NOT BETWEEN 10 AND 15)
     OR EXISTS (SELECT 1 FROM products WHERE has_discount AND original_price_cop NOT BETWEEN 170000 AND 185000)
  THEN RAISE EXCEPTION 'Seed de descuentos inválido'; END IF;
END $$;

-- ---------- 90 variantes (tallas 36-44) ----------
INSERT INTO product_variants (tenant_id, product_id, sku, size_eu, stock)
SELECT p.tenant_id, p.id, 'KS-' || b.code || '-' || p.model_code || '-' || s.size, s.size,
       3 + abs(hashtext(p.slug || s.size::text)) % 10
FROM products p
JOIN brands b ON b.tenant_id = p.tenant_id AND b.id = p.brand_id
CROSS JOIN generate_series(36, 44) AS s(size)
WHERE p.tenant_id = '00000000-0000-4000-8000-000000000001';

COMMIT;
