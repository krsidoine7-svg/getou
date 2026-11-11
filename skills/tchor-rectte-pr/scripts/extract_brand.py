#!/usr/bin/env python3
"""Extrait l'identité visuelle d'un projet : nom, couleurs, logos.

Usage :
    python extract_brand.py <dossier-projet> [--out docs/recette-brand.json]

Sortie JSON : site_name, colors (nom + hex), logos (triés par pertinence pour Word : PNG/JPG d'abord),
suggested_primary. À vérifier visuellement : le script propose, tu décides.
"""
import argparse
import colorsys
import json
import os
import re
import sys
from collections import Counter
from pathlib import Path

SKIP = {"node_modules", ".git", "dist", "build", ".next", ".nuxt", "vendor", "__pycache__", "venv", ".venv", "coverage", "target"}
HEX = re.compile(r"#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b")
NAMED = re.compile(r"""(?:--(?P<var>[\w-]*(?:primary|brand|accent|secondary|main)[\w-]*)\s*:\s*|['"]?(?P<key>primary|brand|accent|secondary|main)(?:[-\w]*)['"]?\s*:\s*['"])(?P<hex>#[0-9a-fA-F]{3,6})\b""", re.I)
LOGO_NAME = re.compile(r"logo|brand|wordmark|favicon|icon", re.I)
IMG_EXT = {".png": 0, ".jpg": 1, ".jpeg": 1, ".webp": 2, ".svg": 3, ".ico": 4}


def expand(h):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return h.upper()


def sat_val(h):
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    _, s, v = colorsys.rgb_to_hsv(r, g, b)
    return s, v


def read(p):
    try:
        return p.read_text(encoding="utf-8", errors="ignore") if p.stat().st_size < 400_000 else ""
    except OSError:
        return ""


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("project")
    ap.add_argument("--out")
    a = ap.parse_args()
    root = Path(a.project).resolve()
    named, freq, logos = [], Counter(), []
    site_name = None
    for dp, dns, fns in os.walk(root):
        dns[:] = [d for d in dns if d not in SKIP]
        for fn in fns:
            p = Path(dp) / fn
            low = fn.lower()
            if p.suffix.lower() in IMG_EXT and LOGO_NAME.search(fn):
                logos.append((IMG_EXT[p.suffix.lower()], 0 if "logo" in low else 1, len(p.parts), str(p.relative_to(root))))
            if p.suffix.lower() in {".css", ".scss", ".less", ".js", ".ts", ".cjs", ".mjs", ".json", ".html", ".tsx", ".jsx", ".vue"} \
                    and ("tailwind" in low or "theme" in low or p.suffix.lower() in {".css", ".scss", ".less"} or low == "manifest.json"):
                txt = read(p)
                for m in NAMED.finditer(txt):
                    named.append({"name": (m.group("var") or m.group("key")), "hex": "#" + expand(m.group("hex")), "file": str(p.relative_to(root))})
                if p.suffix.lower() in {".css", ".scss", ".less"}:
                    freq.update(expand(h) for h in HEX.findall(txt))
            if low == "manifest.json" or low == "site.webmanifest":
                try:
                    d = json.loads(read(p) or "{}")
                    site_name = site_name or d.get("name") or d.get("short_name")
                    for k in ("theme_color", "background_color"):
                        if d.get(k) and HEX.fullmatch(d[k]):
                            named.append({"name": k, "hex": "#" + expand(d[k]), "file": str(p.relative_to(root))})
                except json.JSONDecodeError:
                    pass
            if low == "package.json" and p.parent == root:
                try:
                    site_name = site_name or json.loads(read(p) or "{}").get("name")
                except json.JSONDecodeError:
                    pass
            if low in {"index.html", "layout.tsx", "layout.jsx", "layout.js", "app.vue", "_document.tsx", "_app.tsx"}:
                t = re.search(r"<title>([^<{]+)</title>|title:\s*['\"]([^'\"]+)['\"]", read(p))
                if t:
                    site_name = (t.group(1) or t.group(2)).strip()
    # primaire suggérée
    pick = next((c for c in named if re.search(r"primary|brand|theme_color", c["name"], re.I)), None)
    if not pick and freq:
        colorful = [(h, n) for h, n in freq.most_common(30) if sat_val(h)[0] > 0.25 and 0.15 < sat_val(h)[1] < 0.95]
        if colorful:
            pick = {"name": "plus fréquente (colorée)", "hex": "#" + colorful[0][0]}
    logos.sort()
    result = {
        "site_name": site_name,
        "suggested_primary": pick["hex"] if pick else None,
        "colors": named[:15],
        "frequent_colors": ["#" + h for h, _ in freq.most_common(8)],
        "logos": [l[3] for l in logos[:8]],
        "note": "Word n'accepte pas le SVG : si le logo est un .svg, le convertir en PNG avant md_to_docx.py. Vérifier les couleurs visuellement.",
    }
    out = json.dumps(result, ensure_ascii=False, indent=2)
    if a.out:
        Path(a.out).write_text(out, encoding="utf-8")
        print(f"OK -> {a.out}")
    else:
        print(out)


if __name__ == "__main__":
    sys.exit(main())
