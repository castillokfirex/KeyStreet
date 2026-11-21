"""Quita el fondo de un lote de imágenes con rembg (inferencia local, sin red).

Uso: python remove_bg.py pares.json
pares.json = [["entrada.png", "salida.png", "modelo opcional"], ...]

Modelos (licencias permisivas): isnet-general-use (por defecto) y
birefnet-general-lite (más preciso en zapatos claros sobre fondos claros).
"""

import json
import sys

from PIL import Image
from rembg import new_session, remove

DEFAULT_MODEL = "isnet-general-use"


def main() -> None:
    with open(sys.argv[1], encoding="utf-8") as fh:
        pairs = json.load(fh)
    sessions: dict[str, object] = {}
    for item in pairs:
        src, dst = item[0], item[1]
        model = item[2] if len(item) > 2 and item[2] else DEFAULT_MODEL
        if model not in sessions:
            sessions[model] = new_session(model)
        image = Image.open(src).convert("RGB")
        cutout = remove(image, session=sessions[model], post_process_mask=True)
        cutout.save(dst)
        print(f"ok {dst} ({model})", flush=True)


if __name__ == "__main__":
    main()
