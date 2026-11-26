# Créditos y licencias de los modelos 3D

Generado por `scripts/models/validate-models.mjs` el 2026-11-26. Detalle técnico en [`assets/models/manifest.json`](../assets/models/manifest.json).

## Origen de los modelos

- **Sketchfab (CC0 / CC BY):** no se usó. La descarga requiere `SKETCHFAB_API_TOKEN` y no hay ninguno configurado en `.env`. Cuando se agregue, cada modelo descargado debe registrarse aquí con autor, URL y licencia (CC BY exige atribución visible).
- **3D genérico:** todos los productos usan el sneaker genérico del proyecto (mismas piezas que `PlaceholderSneaker`), exportado a GLB con la paleta de color aproximada de cada colorway. Es un modelo propio, sin derechos de terceros. **No representa la forma real de cada modelo de la marca.**

## Convenciones verificadas

Y arriba · punta hacia +X · centrado en X/Z · base en y = 0 · largo 0,28–0,30 m · sin texturas (solo factores PBR; si se agregan deben ser KTX2 o WebP) · compresión meshopt · ≤ 3 MB por zapato.

Pasos de normalización con `@gltf-transform/cli`: `gltf-transform center <in> <out> --pivot below` y `gltf-transform meshopt <in> <out>`.

## Modelos

| Producto | Tipo | Autor | Licencia | Peso · largo | Validación |
|---|---|---|---|---|---|
| `nike-air-force-1-low-07-blanco` | 3D generado con IA a partir de fotos propias | Key Street (fotos propias) + generación con IA | Propio del proyecto (fotos propias; modelo generado) | 858.0 KB · 0.29 m | validado |
| `adidas-superstar` | 3D generado con IA a partir de fotos propias | Key Street (fotos propias) + generación con IA | Propio del proyecto (fotos propias; modelo generado) | 918.0 KB · 0.29 m | validado |
| `nike-dunk-low-retro-panda` | 3D generado con IA a partir de fotos propias | Key Street (fotos propias) + generación con IA | Propio del proyecto (fotos propias; modelo generado) | 868.6 KB · 0.29 m | validado |
| `air-jordan-1-low` | 3D genérico | Key Street (modelo propio generado) | Propio del proyecto (sin terceros) | 49.4 KB · 0.29 m | validado |
| `vans-old-skool` | 3D generado con IA a partir de fotos propias | Key Street (fotos propias) + generación con IA | Propio del proyecto (fotos propias; modelo generado) | 905.2 KB · 0.29 m | validado |
| `adidas-samba-og-blanco-negro` | 3D generado con IA a partir de fotos propias | Key Street (fotos propias) + generación con IA | Propio del proyecto (fotos propias; modelo generado) | 838.4 KB · 0.29 m | validado |
| `converse-chuck-taylor-all-star-clasico` | 3D genérico | Key Street (modelo propio generado) | Propio del proyecto (sin terceros) | 62.5 KB · 0.29 m | validado |
| `adidas-stan-smith` | 3D genérico | Key Street (modelo propio generado) | Propio del proyecto (sin terceros) | 45.0 KB · 0.29 m | validado |
| `new-balance-550` | 3D genérico | Key Street (modelo propio generado) | Propio del proyecto (sin terceros) | 48.2 KB · 0.29 m | validado |
| `new-balance-530` | 3D genérico | Key Street (modelo propio generado) | Propio del proyecto (sin terceros) | 48.6 KB · 0.29 m | validado |
| `adidas-campus-00s` | 3D genérico | Key Street (modelo propio generado) | Propio del proyecto (sin terceros) | 50.9 KB · 0.29 m | validado |
| `puma-suede-xl` | 3D genérico | Key Street (modelo propio generado) | Propio del proyecto (sin terceros) | 46.8 KB · 0.29 m | validado |
| `adidas-handball-spezial` | 3D genérico | Key Street (modelo propio generado) | Propio del proyecto (sin terceros) | 54.9 KB · 0.29 m | validado |
| `air-jordan-4` | 3D genérico | Key Street (modelo propio generado) | Propio del proyecto (sin terceros) | 48.7 KB · 0.29 m | validado |
| `nike-court-vision-low` | 3D genérico | Key Street (modelo propio generado) | Propio del proyecto (sin terceros) | 49.2 KB · 0.29 m | validado |
