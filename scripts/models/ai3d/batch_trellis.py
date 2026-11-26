"""Genera con TRELLIS los GLB de varios modelos (uno tras otro) y guarda un log.

Uso: python batch_trellis.py <carpeta mv-input> <carpeta salida> slug [slug ...]
"""
import os
import subprocess
import sys
import time

INPUT, OUT, *slugs = sys.argv[1:]
HERE = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable

MAIN = ["tres-cuartos-delantero-ext", "lateral-externo", "frente"]
EXTRA = ["lateral-externo", "frente", "lateral-interno", "talon", "tres-cuartos-trasero-ext"]


def pick(files, key):
    for f in files:
        if key in f and "-2" not in f:
            return f
    return None


for slug in slugs:
    files = sorted(os.listdir(os.path.join(INPUT, slug)))
    main = next((m for m in (pick(files, k) for k in MAIN) if m), files[0])
    extra = [f for f in (pick(files, k) for k in EXTRA) if f and f != main]
    out = os.path.join(OUT, f"{slug}.glb")
    if os.path.exists(out):
        print(slug, "ya existe", flush=True)
        continue
    for attempt in range(3):
        t0 = time.time()
        r = subprocess.run(
            [PY, os.path.join(HERE, "gen_trellis.py"), os.path.join(INPUT, slug), out, main, *extra],
            capture_output=True,
            text=True,
        )
        tail = (r.stdout + r.stderr).strip().splitlines()[-1:] or [""]
        print(slug, f"intento {attempt + 1}", "OK" if r.returncode == 0 else "ERROR", tail[0][:300], flush=True)
        if r.returncode == 0:
            break
        time.sleep(60)
