"""Genera un GLB texturizado con TRELLIS (Space gratuito de Hugging Face) a partir de varias vistas.

Uso: python gen_trellis.py <carpeta vistas del modelo> <salida.glb> <vista principal> [vista ...]
"""
import os
import shutil
import sys
import time

from gradio_client import Client, handle_file
from huggingface_hub import get_token  # token guardado con "hf auth login"

views_dir, out_glb, main_view, *extra = sys.argv[1:]
path = lambda name: os.path.join(views_dir, name)  # noqa: E731

# Con un token (HF_TOKEN o "hf auth login") de una cuenta gratuita la cuota diaria de GPU es mayor
client = Client("trellis-community/TRELLIS", verbose=False, token=os.environ.get("HF_TOKEN") or get_token())
t0 = time.time()
client.predict(api_name="/start_session")
multi = [{"image": handle_file(path(v)), "caption": None} for v in [main_view, *extra]]
result = client.predict(
    image=handle_file(path(main_view)),
    multiimages=multi,
    seed=7,
    ss_guidance_strength=7.5,
    ss_sampling_steps=12,
    slat_guidance_strength=3.0,
    slat_sampling_steps=12,
    multiimage_algo="multidiffusion",
    mesh_simplify=0.95,
    texture_size=2048,
    api_name="/generate_and_extract_glb",
)
video, glb_preview, glb_download = result
src = glb_download or glb_preview
shutil.copy(src, out_glb)
if isinstance(video, dict) and video.get("video"):
    shutil.copy(video["video"], os.path.splitext(out_glb)[0] + ".mp4")
print("ok", out_glb, os.path.getsize(out_glb), f"{time.time() - t0:.0f}s")
