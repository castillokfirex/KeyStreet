# Catálogo de 15 modelos: fuentes de precio

Generado por `scripts/catalog/build-catalog.mjs` a partir de [`scripts/catalog/catalog.json`](../scripts/catalog/catalog.json). Fecha de consulta: 2026-11-20.

- **VERIFICADO:** precio de lista vigente (precio regular, sin promociones temporales de la tienda) en la tienda oficial de la marca en Colombia, consultado en la URL indicada. Si la tienda tenía una oferta ese día, se anota abajo, pero no se usa como precio base.
- **PRUEBA:** no se encontró un precio verificable en una tienda oficial o distribuidor oficial en Colombia. **Es un precio de prueba, no un precio real**; debe reemplazarse antes de vender.
- **Descuentos:** la regla de negocio se mantiene en 4 modelos activos con descuento automático de 10% a 15%. El precio final lo calcula la base de datos (redondeo a la centena inferior).

| Modelo | Slug | Precio base COP | Descuento → final | Estado | Fuente | Referencia | Consulta |
|---|---|---|---|---|---|---|---|
| Nike Air Force 1 '07 (Blanco) | `nike-air-force-1-low-07-blanco` | $584.950 | -10% → $526.400 | **VERIFICADO** | [Nike Colombia (nike.com.co)](https://www.nike.com.co/nike-air-force-1-07-cw2288-111-th4/p) | CW2288-111 | 2026-11-20 |
| Adidas Superstar (Blanco / Negro) | `adidas-superstar` | $549.950 | — | **VERIFICADO** | [adidas Colombia (adidas.co)](https://www.adidas.co/tenis-superstar-ii/KK4685.html) | KK4685 (Superstar II, versión vigente) | 2026-11-20 |
| Nike Dunk Low Retro (Panda / Blanco y Negro) | `nike-dunk-low-retro-panda` | $679.950 | — | **VERIFICADO** | [Nike Colombia (nike.com.co)](https://www.nike.com.co/nike-dunk-low-retro-hf5441-117-tp6/p) | HF5441-117 (Dunk Low Retro hombre; el colorway Panda DD1391-100 no está publicado hoy) | 2026-11-20 |
| Air Jordan 1 Low (Blanco / Azul marino) | `air-jordan-1-low` | $699.950 | — | **VERIFICADO** | [Nike Colombia (nike.com.co)](https://www.nike.com.co/air-jordan-1-low-tenis-hombre-553558-047-tf6/p) | 553558-047 (Air Jordan 1 Low hombre, precio de lista del modelo) | 2026-11-20 |
| Vans Old Skool (Negro / Blanco) | `vans-old-skool` | $329.900 | — | **VERIFICADO** | [Vans Colombia (vans.com.co)](https://www.vans.com.co/products/tenis-old-skool-vn000d3h-bka) | VN000D3H | 2026-11-20 |
| Adidas Samba OG (Blanco / Negro) | `adidas-samba-og-blanco-negro` | $499.950 | — | **VERIFICADO** | [adidas Colombia (adidas.co)](https://www.adidas.co/tenis-samba-og/B75806.html) | B75806 | 2026-11-20 |
| Converse Chuck Taylor All Star (Bota / Clásico) | `converse-chuck-taylor-all-star-clasico` | $299.900 | -15% → $254.900 | **PRUEBA** | Sin tienda oficial de Converse en Colombia accesible el 2026-11-20 (converse.com.co no responde). | — | 2026-11-20 |
| Adidas Stan Smith (Blanco / Verde) | `adidas-stan-smith` | $549.950 | — | **VERIFICADO** | [adidas Colombia (adidas.co)](https://www.adidas.co/tenis-stan-smith-unisex/M20324.html) | M20324 | 2026-11-20 |
| New Balance 550 (Blanco / Burdeos) | `new-balance-550` | $649.900 | — | **VERIFICADO** | [New Balance Colombia (newbalance.com.co)](https://newbalance.com.co/products/m55096t) | M55096T (550 unisex, precio habitual) | 2026-11-20 |
| New Balance 530 (Blanco / Plata) | `new-balance-530` | $529.900 | -12% → $466.300 | **VERIFICADO** | [New Balance Colombia (newbalance.com.co)](https://newbalance.com.co/products/mr530sg) | MR530SG | 2026-11-20 |
| Adidas Campus 00s (Café / Blanco) | `adidas-campus-00s` | $499.950 | — | **VERIFICADO** | [adidas Colombia (adidas.co)](https://www.adidas.co/tenis-campus-00s/HQ8708.html) | Campus 00s (precio de lista del modelo, p. ej. HQ8708) | 2026-11-20 |
| Puma Suede XL | `puma-suede-xl` | $449.900 | -12% → $395.900 | **PRUEBA** | Sin tienda oficial de Puma en Colombia accesible el 2026-11-20 (co.puma.com no responde; puma.com/co redirige al sitio corporativo). | — | 2026-11-20 |
| Adidas Handball Spezial (Negro / Goma) | `adidas-handball-spezial` | $549.950 | — | **VERIFICADO** | [adidas Colombia (adidas.co)](https://www.adidas.co/tenis-handball-spezial/KZ6705.html) | KZ6705 (Handball Spezial hombre, precio de lista) | 2026-11-20 |
| Air Jordan 4 Retro (White Cement) | `air-jordan-4` | $1.219.950 | — | **VERIFICADO** | [Nike Colombia (nike.com.co)](https://www.nike.com.co/air-jordan-4-retro-calzado-para-hombre-fq8138-600-tu6/p) | FQ8138-600 (Air Jordan 4 Retro hombre, precio de lista del modelo) | 2026-11-20 |
| Nike Court Vision Low (Blanco / Negro) | `nike-court-vision-low` | $459.950 | — | **VERIFICADO** | [Nike Colombia (nike.com.co)](https://www.nike.com.co/nike-court-vision-low-next-nature-dh2987-101/p) | DH2987-101 | 2026-11-20 |

## Notas por modelo

- **Adidas Superstar (Blanco / Negro):** referencia usada: KK4685 (Superstar II, versión vigente).
- **Nike Dunk Low Retro (Panda / Blanco y Negro):** la tienda tenía una oferta temporal a $407.970; referencia usada: HF5441-117 (Dunk Low Retro hombre; el colorway Panda DD1391-100 no está publicado hoy).
- **Air Jordan 1 Low (Blanco / Azul marino):** referencia usada: 553558-047 (Air Jordan 1 Low hombre, precio de lista del modelo).
- **Adidas Samba OG (Blanco / Negro):** la tienda tenía una oferta temporal a $349.965.
- **Converse Chuck Taylor All Star (Bota / Clásico):** PRUEBA. Sin tienda oficial de Converse en Colombia accesible el 2026-11-20 (converse.com.co no responde).
- **Adidas Stan Smith (Blanco / Verde):** la tienda tenía una oferta temporal a $439.960.
- **New Balance 550 (Blanco / Burdeos):** la tienda tenía una oferta temporal a $519.920.
- **Adidas Campus 00s (Café / Blanco):** la tienda tenía una oferta temporal a $299.970; referencia usada: Campus 00s (precio de lista del modelo, p. ej. HQ8708).
- **Puma Suede XL:** PRUEBA. Sin tienda oficial de Puma en Colombia accesible el 2026-11-20 (co.puma.com no responde; puma.com/co redirige al sitio corporativo).
- **Air Jordan 4 Retro (White Cement):** la tienda tenía una oferta temporal a $853.965; referencia usada: FQ8138-600 (Air Jordan 4 Retro hombre, precio de lista del modelo).

## Modelos retirados del catálogo activo

- `adidas-forum-low`: Fuera de la lista de 15 modelos.
- `new-balance-574`: Fuera de la lista de 15 modelos (sustituido por New Balance 530).
- `nike-air-jordan-1-retro-high-og`: La lista pide Air Jordan 1 Low o Mid (sustituido por air-jordan-1-low).
- `adidas-campus-00s-gris-negro`: Colorway sin fotos con licencia; sustituido por adidas-campus-00s (café).
