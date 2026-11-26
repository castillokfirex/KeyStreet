"""Prepara las fotos de referencia para IA multivista.

Para cada modelo: quita la barrita del visor (franja pequeña bajo el zapato),
recorta al zapato y lo centra en un cuadrado blanco de 1024 px.
Uso: python prep_views.py <carpeta references> <carpeta salida> [slug ...]
"""
import os
import sys

import numpy as np
from PIL import Image

REF, OUT = sys.argv[1], sys.argv[2]
ONLY = set(sys.argv[3:])
SIZE = 1024
PAD = 0.08


def runs(idx):
    out = []
    if len(idx) == 0:
        return out
    s = p = idx[0]
    for r in idx[1:]:
        if r != p + 1:
            out.append((s, p))
            s = r
        p = r
    out.append((s, p))
    return out


def prep(path):
    im = Image.open(path).convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
    im = Image.alpha_composite(bg, im).convert("RGB")
    a = np.asarray(im).astype(int)
    ink = a.sum(-1) < 735  # todo lo que no es blanco
    rows = runs(np.where(ink.sum(1) > 2)[0])
    if not rows:
        return None
    # El zapato es la franja de filas más alta; la barrita del visor queda fuera
    top, bottom = max(rows, key=lambda r: r[1] - r[0])
    band = ink[top : bottom + 1]
    cols = np.where(band.sum(0) > 1)[0]
    left, right = cols.min(), cols.max()
    crop = im.crop((left, top, right + 1, bottom + 1))
    w, h = crop.size
    side = int(max(w, h) * (1 + 2 * PAD))
    canvas = Image.new("RGB", (side, side), (255, 255, 255))
    canvas.paste(crop, ((side - w) // 2, (side - h) // 2))
    return canvas.resize((SIZE, SIZE), Image.LANCZOS)


for slug in sorted(os.listdir(REF)):
    if ONLY and slug not in ONLY:
        continue
    src = os.path.join(REF, slug)
    if not os.path.isdir(src):
        continue
    dst = os.path.join(OUT, slug)
    os.makedirs(dst, exist_ok=True)
    n = 0
    for f in sorted(os.listdir(src)):
        if "suela" in f:
            continue  # la suela no siempre es del mismo color
        img = prep(os.path.join(src, f))
        if img is not None:
            img.save(os.path.join(dst, os.path.splitext(f)[0] + ".png"))
            n += 1
    print(slug, n)
