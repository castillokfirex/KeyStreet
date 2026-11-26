# Zapatos 3D realistas con IA multivista (gratis)

Genera los `.glb` del catálogo a partir de las fotos propias de `assets/models/references/{slug}/`
con **TRELLIS** (Space gratuito `trellis-community/TRELLIS` de Hugging Face, GPU ZeroGPU).

## Requisitos

```powershell
python -m venv .venv-ai3d
.\.venv-ai3d\Scripts\python -m pip install gradio_client pillow numpy
```

Cuota gratuita de GPU: sin cuenta alcanza para ~1 modelo al día. Con una **cuenta gratuita** de
Hugging Face y un token de lectura (`HF_TOKEN`) la cuota diaria es mayor. Cada modelo usa ~2 min de GPU.

## Pasos

```powershell
# 1. Limpiar fotos (quita la barrita del visor y cuadra en 1024 px blanco)
.\.venv-ai3d\Scripts\python scripts\models\ai3d\prep_views.py assets\models\references .ai3d\input

# 2. Generar (uno o varios slugs; reintenta si la cuota se agota)
.\.venv-ai3d\Scripts\hf auth login   # opcional: guarda el token de tu cuenta gratuita
.\.venv-ai3d\Scripts\python scripts\models\ai3d\batch_trellis.py .ai3d\input .ai3d\out nike-air-force-1-low-07-blanco

# 3. Ajustar al catálogo (orientación, 0,29 m, normales, WebP, meshopt) y validar
cd scripts
node models\import-generated.mjs ..\.ai3d\out\nike-air-force-1-low-07-blanco.glb nike-air-force-1-low-07-blanco
node models\validate-models.mjs
```

Las fotos se suben a Hugging Face para procesarlas. `.ai3d/` es una carpeta de trabajo: no se commitea.
