#!/usr/bin/env python3
"""Génère le document de suivi BUGS_ET_AMELIORATIONS.docx (tableau vierge à remplir).

Usage :
    python make_bugs_doc.py --meta docs/recette-meta.json --out docs/BUGS_ET_AMELIORATIONS.docx [--rows 25]
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from docx.enum.table import WD_ALIGN_VERTICAL  # noqa: E402
from docx.shared import Pt  # noqa: E402

import _docx_helpers as H  # noqa: E402
from md_to_docx import fill_cell, render_inline  # noqa: E402

COLUMNS = [
    ("N°", 1.0),
    ("Réf. du test", 2.0),
    ("Module", 2.2),
    ("Description de l'anomalie", 4.6),
    ("Étapes pour reproduire", 4.6),
    ("Attendu / Obtenu", 4.0),
    ("Type et sévérité", 2.8),
    ("Capture d'écran", 3.9),
    ("Statut", 1.6),
]
SEVERITY_CELL = "[ ] Bloquant [ ] Majeur [ ] Mineur [ ] Amélioration"


def build(meta, out, rows):
    doc = H.new_document(meta, landscape=True, cover=False, header_title="Bugs et améliorations")
    usable = H.usable_width_cm(doc)
    H.add_title_block(doc, "Suivi des bugs et améliorations", meta)

    intro = doc.add_paragraph()
    render_inline(intro, "**Comment remplir :** une ligne par anomalie. Indiquer la référence exacte du test "
                  "(ex. : Module 1 - Test 1.2), décrire ce qui s'est passé, coller la capture d'écran dans la "
                  "cellule prévue, puis cocher le type et la sévérité.", size=9.5)
    legend = doc.add_paragraph()
    render_inline(legend, "**Bloquant** : impossible de continuer le test. **Majeur** : fonction principale "
                  "dégradée. **Mineur** : défaut sans conséquence sur l'usage. **Amélioration** : suggestion, "
                  "pas une anomalie.", size=9, color=H.GREY)

    scale = usable / sum(w for _, w in COLUMNS)
    widths = [w * scale for _, w in COLUMNS]
    table = doc.add_table(rows=1 + rows, cols=len(COLUMNS))
    table.style = "Table Grid"
    H.style_table(table, widths)
    for j, (name, _) in enumerate(COLUMNS):
        cell = table.rows[0].cells[j]
        H.shade(cell, H.NAVY)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        fill_cell(cell, name, "generic", name, header=True)
    H.repeat_header(table.rows[0])
    H.cant_split(table.rows[0])
    sev_idx = [n for n, _ in COLUMNS].index("Type et sévérité")
    for i in range(1, rows + 1):
        tr = table.rows[i]
        H.cant_split(tr)
        H.set_row_height(tr, 3.2)
        for j in range(len(COLUMNS)):
            cell = tr.cells[j]
            cell.vertical_alignment = WD_ALIGN_VERTICAL.TOP
            if j == 0:
                fill_cell(cell, str(i), "generic", "N°")
            elif j == sev_idx:
                fill_cell(cell, SEVERITY_CELL, "generic", "")
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    doc.save(out)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--meta")
    ap.add_argument("--out", required=True)
    ap.add_argument("--rows", type=int, default=25)
    a = ap.parse_args()
    out = build(H.load_meta(a.meta), a.out, a.rows)
    print(f"OK -> {out}")


if __name__ == "__main__":
    main()
