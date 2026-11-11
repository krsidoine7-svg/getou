#!/usr/bin/env python3
"""Convertit le cahier de recette Markdown en Word (.docx).

Usage :
    python md_to_docx.py docs/CAHIER-DE-RECETTE.md --meta docs/recette-meta.json \
        --out docs/CAHIER-DE-RECETTE.docx [--portrait]

Le Markdown doit suivre assets/cahier-template.md (voir references/cahier-format.md).
"""
import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from docx.enum.table import WD_ALIGN_VERTICAL  # noqa: E402
from docx.enum.text import WD_ALIGN_PARAGRAPH  # noqa: E402
from docx.shared import Cm, Pt  # noqa: E402

import _docx_helpers as H  # noqa: E402
from _mdparse import parse_blocks, split_checks, split_steps  # noqa: E402

INLINE = re.compile(r"(\*\*[^*]+\*\*|`[^`]+`|(?<![\w*])\*[^*\s][^*]*\*(?![\w*]))")

TEST_FRACTIONS = {"n°": 0.05, "priorité": 0.06, "intitulé": 0.15, "scénario": 0.36,
                  "résultat": 0.27, "validation": 0.11}
SIGNATURE_FRACTIONS = [0.30, 0.25, 0.45]


def render_inline(par, text, size=None, bold=False, color=None, italic=False):
    text = text.replace("[ ]", "☐").replace("[x]", "☒").replace("[X]", "☒")
    for tok in INLINE.split(text):
        if not tok:
            continue
        b, i, mono = bold, italic, False
        if tok.startswith("**") and tok.endswith("**") and len(tok) > 4:
            tok, b = tok[2:-2], True
        elif tok.startswith("`") and tok.endswith("`") and len(tok) > 2:
            tok, mono = tok[1:-1], True
        elif tok.startswith("*") and tok.endswith("*") and len(tok) > 2:
            tok, i = tok[1:-1], True
        run = par.add_run(tok)
        run.bold = b
        run.italic = i
        if size:
            run.font.size = Pt(size)
        if color:
            run.font.color.rgb = H.rgb(color)
        if mono:
            run.font.name = "Consolas"
        else:
            H.set_run_font(run)


def classify(header):
    h = [c.lower() for c in header]
    if any(c.startswith("scénario") for c in h):
        return "test"
    if h and h[0].startswith("nom du testeur"):
        return "signature"
    return "generic"


def compute_widths(header, rows, usable, kind):
    n = len(header)
    if kind == "test":
        fr = []
        for c in header:
            key = next((k for k in TEST_FRACTIONS if c.lower().startswith(k)), None)
            fr.append(TEST_FRACTIONS.get(key))
        if all(f is not None for f in fr):
            s = sum(fr)
            return [usable * f / s for f in fr]
    if kind == "signature" and n == 3:
        return [usable * f for f in SIGNATURE_FRACTIONS]
    weights = []
    for j in range(n):
        longest = max([len(H.strip_md(header[j]))] + [len(H.strip_md(r[j])) for r in rows])
        weights.append(min(max(longest, 8), 50) ** 0.75)
    s = sum(weights)
    return [usable * w / s for w in weights]


def fill_cell(cell, text, kind, col_name, header=False):
    parts = split_steps(text)
    if len(parts) == 1:
        parts = split_checks(text)
    if len(parts) == 1 and text.strip().startswith("- "):
        parts = re.split(r"\s+(?=-\s+)", text.strip())
    center = kind == "test" and col_name.lower().startswith(("n°", "priorité"))
    for idx, part in enumerate(parts):
        par = cell.paragraphs[0] if idx == 0 else cell.add_paragraph()
        pf = par.paragraph_format
        pf.space_after = Pt(2)
        pf.space_before = Pt(1)
        if center or header:
            par.alignment = WD_ALIGN_PARAGRAPH.CENTER if center else WD_ALIGN_PARAGRAPH.LEFT
        if len(parts) > 1 and (re.match(r"^\d{1,2}\.\s", part) or part.startswith("- ")):
            pf.left_indent = Cm(0.40)
            pf.first_line_indent = Cm(-0.40)
        bold = header or (kind == "test" and col_name.lower().startswith(("n°", "priorité")))
        render_inline(par, part, size=9, bold=bold, color="FFFFFF" if header else None)


def render_table(doc, header, rows, usable):
    kind = classify(header)
    widths = compute_widths(header, rows, usable, kind)
    table = doc.add_table(rows=1 + len(rows), cols=len(header))
    table.style = "Table Grid"
    H.style_table(table, widths)
    for j, name in enumerate(header):
        cell = table.rows[0].cells[j]
        H.shade(cell, H.NAVY)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        fill_cell(cell, name, kind, name, header=True)
    H.repeat_header(table.rows[0])
    H.cant_split(table.rows[0])
    for i, row in enumerate(rows, start=1):
        tr = table.rows[i]
        H.cant_split(tr)
        for j, text in enumerate(row):
            cell = tr.cells[j]
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER if kind != "test" else WD_ALIGN_VERTICAL.TOP
            fill_cell(cell, text, kind, header[j])
        if all(not c.strip() for c in row):
            H.set_row_height(tr, 2.6 if kind == "signature" else 0.9)
    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_after = Pt(6)


def build(md_path, meta, out, landscape=True):
    text = Path(md_path).read_text(encoding="utf-8")
    doc = H.new_document(meta, landscape=landscape, cover=True)
    usable = H.usable_width_cm(doc)
    H.add_cover(doc, meta)
    fresh_page = True  # juste après la page de garde : pas de saut de page supplémentaire
    first_h1_skipped = False
    for b in parse_blocks(text):
        t = b["type"]
        if t == "h":
            if b["level"] == 1 and not first_h1_skipped:
                first_h1_skipped = True
                continue
            title = H.strip_md(b["text"])
            par = doc.add_heading(title, level=min(b["level"], 4))
            if re.match(r"^Module\s*\d+", title) and not fresh_page:
                par.paragraph_format.page_break_before = True
            fresh_page = False
        elif t == "p":
            par = doc.add_paragraph()
            render_inline(par, b["text"])
            fresh_page = False
        elif t == "quote":
            par = doc.add_paragraph()
            par.paragraph_format.left_indent = Cm(0.6)
            par.paragraph_format.space_after = Pt(1)
            render_inline(par, b["text"], italic=True, color=H.GREY)
            fresh_page = False
        elif t == "bullet":
            par = doc.add_paragraph()
            par.paragraph_format.left_indent = Cm(0.9 + 0.6 * b["level"])
            par.paragraph_format.first_line_indent = Cm(-0.45)
            par.paragraph_format.space_after = Pt(2)
            render_inline(par, "•  " + b["text"])
            fresh_page = False
        elif t == "num":
            par = doc.add_paragraph()
            par.paragraph_format.left_indent = Cm(0.9)
            par.paragraph_format.first_line_indent = Cm(-0.6)
            par.paragraph_format.space_after = Pt(2)
            render_inline(par, f"{b['n']}.  {b['text']}")
            fresh_page = False
        elif t == "table":
            if b["header"]:
                render_table(doc, b["header"], b["rows"], usable)
            fresh_page = False
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    doc.save(out)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("markdown")
    ap.add_argument("--meta", help="JSON : plateforme, environnement, url, version, logo, couleurs")
    ap.add_argument("--out", required=True)
    ap.add_argument("--portrait", action="store_true", help="portrait au lieu de paysage")
    a = ap.parse_args()
    meta = H.load_meta(a.meta)
    out = build(a.markdown, meta, a.out, landscape=not a.portrait)
    print(f"OK -> {out}")


if __name__ == "__main__":
    main()
