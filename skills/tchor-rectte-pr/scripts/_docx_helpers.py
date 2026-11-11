"""Aides python-docx communes à md_to_docx.py et make_bugs_doc.py."""
from __future__ import annotations

import json
import re
import sys
from datetime import date
from pathlib import Path

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_ALIGN_VERTICAL, WD_ROW_HEIGHT_RULE, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor, Twips

NAVY = "1E293B"      # en-têtes de tableaux (imposé par la charte du cahier)
BORDER = "CBD5E1"    # bordures fines
GREY = "64748B"
FONT = "Calibri"

DEFAULT_META = {
    "title": "Cahier de Recette",
    "platform": "",
    "environment": "Staging",
    "url": "",
    "version": "1.0",
    "date": "",
    "author": "",
    "logo": "",
    "primary_color": NAVY,
    "accent_color": NAVY,
}


def norm_hex(value, default):
    v = str(value or "").lstrip("#").strip()
    return v.upper() if re.fullmatch(r"[0-9a-fA-F]{6}", v) else default


def load_meta(path=None):
    meta = dict(DEFAULT_META)
    if path:
        meta.update(json.loads(Path(path).read_text(encoding="utf-8")))
    meta["date"] = meta.get("date") or date.today().strftime("%d/%m/%Y")
    meta["primary_color"] = norm_hex(meta.get("primary_color"), NAVY)
    meta["accent_color"] = norm_hex(meta.get("accent_color"), meta["primary_color"])
    return meta


def rgb(hex6):
    return RGBColor.from_string(hex6.upper())


def strip_md(text):
    return re.sub(r"[*`]", "", text).replace("[ ]", "☐")


# ---------------------------------------------------------------- polices
def set_run_font(run, name=FONT):
    run.font.name = name
    run._element.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), name)


def _style_font(style, size=None, bold=None, color=None, name=FONT):
    style.font.name = name
    style.element.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), name)
    if size:
        style.font.size = Pt(size)
    if bold is not None:
        style.font.bold = bold
    if color:
        style.font.color.rgb = rgb(color)


# ---------------------------------------------------------------- XML utilitaires
def _insert_before(parent, el, before_tags):
    for tag in before_tags:
        found = parent.find(qn(tag))
        if found is not None:
            found.addprevious(el)
            return
    parent.append(el)


def shade(cell, fill):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), fill)
    tcPr.append(shd)


def style_table(table, widths_cm):
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False  # tblLayout fixed
    tblPr = table._tbl.tblPr
    total = sum(widths_cm)
    tblW = tblPr.find(qn("w:tblW"))
    if tblW is not None:
        tblW.set(qn("w:type"), "dxa")
        tblW.set(qn("w:w"), str(int(total * 567)))
    borders = OxmlElement("w:tblBorders")
    for name in ("top", "left", "bottom", "right", "insideH", "insideV"):
        el = OxmlElement(f"w:{name}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), "4")
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), BORDER)
        borders.append(el)
    _insert_before(tblPr, borders, ["w:shd", "w:tblLayout", "w:tblCellMar", "w:tblLook"])
    mar = OxmlElement("w:tblCellMar")
    for side, w in (("top", 50), ("left", 90), ("bottom", 50), ("right", 90)):
        el = OxmlElement(f"w:{side}")
        el.set(qn("w:w"), str(w))
        el.set(qn("w:type"), "dxa")
        mar.append(el)
    _insert_before(tblPr, mar, ["w:tblLook"])
    grid = table._tbl.tblGrid
    for idx, gc in enumerate(grid.findall(qn("w:gridCol"))):
        gc.set(qn("w:w"), str(int(widths_cm[idx] * 567)))
    for row in table.rows:
        for idx, cell in enumerate(row.cells):
            cell.width = Cm(widths_cm[idx])


def repeat_header(row):
    trPr = row._tr.get_or_add_trPr()
    el = OxmlElement("w:tblHeader")
    trPr.append(el)


def cant_split(row):
    trPr = row._tr.get_or_add_trPr()
    trPr.append(OxmlElement("w:cantSplit"))


def set_row_height(row, cm, exact=False):
    row.height = Cm(cm)
    row.height_rule = WD_ROW_HEIGHT_RULE.EXACTLY if exact else WD_ROW_HEIGHT_RULE.AT_LEAST


def bottom_border(paragraph, color=NAVY, sz=6):
    pPr = paragraph._p.get_or_add_pPr()
    pbdr = OxmlElement("w:pBdr")
    b = OxmlElement("w:bottom")
    b.set(qn("w:val"), "single")
    b.set(qn("w:sz"), str(sz))
    b.set(qn("w:space"), "1")
    b.set(qn("w:color"), color)
    pbdr.append(b)
    pPr.append(pbdr)


def _reset_tabs(paragraph, width_cm):
    """Annule les taquets du style En-tête/Pied de page (centre + droite d'une page portrait)
    puis pose un unique taquet droit au bord de la zone utile."""
    ts = paragraph.paragraph_format.tab_stops
    for pos in (4320, 4680, 8640, 9360):
        ts.add_tab_stop(Twips(pos), WD_TAB_ALIGNMENT.CLEAR)
    ts.add_tab_stop(Cm(width_cm), WD_TAB_ALIGNMENT.RIGHT)


def add_field(paragraph, instr, size=8, color=GREY):
    def run_with(el):
        r = paragraph.add_run()
        r.font.size = Pt(size)
        r.font.color.rgb = rgb(color)
        r._r.append(el)
        return r

    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    run_with(begin)
    it = OxmlElement("w:instrText")
    it.set(qn("xml:space"), "preserve")
    it.text = f" {instr} "
    run_with(it)
    sep = OxmlElement("w:fldChar")
    sep.set(qn("w:fldCharType"), "separate")
    run_with(sep)
    r = paragraph.add_run("1")
    r.font.size = Pt(size)
    r.font.color.rgb = rgb(color)
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run_with(end)


# ---------------------------------------------------------------- document
def usable_width_cm(doc):
    s = doc.sections[0]
    return (s.page_width - s.left_margin - s.right_margin) / 360000.0


def new_document(meta, landscape=True, cover=True, header_title="Cahier de Recette"):
    doc = Document()
    sec = doc.sections[0]
    if landscape:
        sec.orientation = WD_ORIENT.LANDSCAPE
        sec.page_width, sec.page_height = Cm(29.7), Cm(21.0)
    else:
        sec.page_width, sec.page_height = Cm(21.0), Cm(29.7)
    sec.left_margin = sec.right_margin = Cm(1.5)
    sec.top_margin, sec.bottom_margin = Cm(2.0), Cm(1.8)
    sec.header_distance = sec.footer_distance = Cm(0.8)

    styles = doc.styles
    _style_font(styles["Normal"], size=10)
    styles["Normal"].paragraph_format.space_after = Pt(4)
    for name, size, color, before, after in (
        ("Heading 1", 18, meta["primary_color"], 14, 6),
        ("Heading 2", 14, meta["primary_color"], 12, 6),
        ("Heading 3", 11.5, NAVY, 8, 4),
        ("Heading 4", 10.5, NAVY, 6, 3),
    ):
        st = styles[name]
        _style_font(st, size=size, bold=True, color=color)
        st.paragraph_format.space_before = Pt(before)
        st.paragraph_format.space_after = Pt(after)
        st.paragraph_format.keep_with_next = True

    width = usable_width_cm(doc)
    if cover:
        sec.different_first_page_header_footer = True

    hp = sec.header.paragraphs[0]
    hp.text = ""
    _reset_tabs(hp, width)

    logo = meta.get("logo")
    has_logo = False
    if logo:
        p = Path(logo)
        if p.exists() and p.suffix.lower() in (".png", ".jpg", ".jpeg", ".gif", ".bmp"):
            r_img = hp.add_run()
            r_img.add_picture(str(p), height=Cm(0.55))
            has_logo = True

    if not has_logo and meta.get("platform"):
        r_plat = hp.add_run(meta.get("platform", ""))
        r_plat.font.size = Pt(8)
        r_plat.font.color.rgb = rgb(GREY)

    for text in ("\t", f"{header_title} · v{meta.get('version', '')}"):
        r = hp.add_run(text)
        r.font.size = Pt(8)
        r.font.color.rgb = rgb(GREY)
    bottom_border(hp, BORDER, 4)

    fp = sec.footer.paragraphs[0]
    fp.text = ""
    _reset_tabs(fp, width)
    left = " · ".join(x for x in (meta.get("environment", ""), meta.get("url", "")) if x)
    r = fp.add_run(left + "\tPage ")
    r.font.size = Pt(8)
    r.font.color.rgb = rgb(GREY)
    add_field(fp, "PAGE")
    r = fp.add_run(" / ")
    r.font.size = Pt(8)
    r.font.color.rgb = rgb(GREY)
    add_field(fp, "NUMPAGES")

    cp = doc.core_properties
    cp.title = f"{header_title} - {meta.get('platform', '')}".strip(" -")
    cp.author = meta.get("author", "") or "QA"
    return doc


def add_cover(doc, meta):
    logo = meta.get("logo")
    if logo:
        p = Path(logo)
        if p.exists() and p.suffix.lower() in (".png", ".jpg", ".jpeg", ".gif", ".bmp"):
            para = doc.add_paragraph()
            para.alignment = WD_ALIGN_PARAGRAPH.LEFT
            para.add_run().add_picture(str(p), width=Cm(4.5))
        else:
            print(f"[avertissement] logo ignoré (introuvable ou format non supporté, convertir en PNG) : {logo}", file=sys.stderr)
    for _ in range(3):
        doc.add_paragraph()
    t = doc.add_paragraph()
    r = t.add_run(meta["title"])
    r.bold = True
    r.font.size = Pt(34)
    r.font.color.rgb = rgb(meta["primary_color"])
    set_run_font(r)
    rule = doc.add_paragraph()
    bottom_border(rule, meta["accent_color"], 12)
    if meta.get("platform"):
        p = doc.add_paragraph()
        r = p.add_run(meta["platform"])
        r.font.size = Pt(22)
        r.font.color.rgb = rgb(NAVY)
        set_run_font(r)
    doc.add_paragraph()
    for label, key in (("Environnement", "environment"), ("URL", "url"), ("Version", "version"),
                       ("Date", "date"), ("Rédigé par", "author")):
        if meta.get(key):
            p = doc.add_paragraph()
            p.paragraph_format.space_after = Pt(3)
            r1 = p.add_run(f"{label} : ")
            r1.bold = True
            r1.font.size = Pt(12)
            r2 = p.add_run(str(meta[key]))
            r2.font.size = Pt(12)
    doc.add_page_break()


def add_title_block(doc, title, meta):
    p = doc.add_paragraph()
    r = p.add_run(title)
    r.bold = True
    r.font.size = Pt(20)
    r.font.color.rgb = rgb(meta["primary_color"])
    set_run_font(r)
    bottom_border(p, meta["accent_color"], 10)
    bits = [meta.get("platform", ""), meta.get("environment", ""), meta.get("url", ""),
            f"v{meta.get('version', '')}", meta.get("date", "")]
    q = doc.add_paragraph(" · ".join(b for b in bits if b))
    for r in q.runs:
        r.font.color.rgb = rgb(GREY)
        r.font.size = Pt(9.5)
