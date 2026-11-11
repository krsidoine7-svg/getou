"""Parseur Markdown minimal, partagé par md_to_docx.py et lint_cahier.py.

Il ne comprend que le sous-ensemble de Markdown utilisé par le cahier de recette :
titres, paragraphes, listes, citations, tableaux. C'est volontaire : un format
restreint rend la conversion Word prévisible.
"""
import re

# "1. Aller sur... 2. Saisir..." -> coupe avant "2. " (numéro suivi d'un espace puis d'un mot)
STEP_SPLIT = re.compile(r"\s+(?=\d{1,2}\.\s+[^\d\s])")
# "[ ] OK [ ] NA" -> coupe avant chaque case à cocher
CHECK_SPLIT = re.compile(r"\s+(?=\[[ xX]\])")
SEP_CELL = re.compile(r":?-{2,}:?")


def split_cells(line):
    s = line.strip()
    if s.startswith("|"):
        s = s[1:]
    if s.endswith("|") and not s.endswith("\\|"):
        s = s[:-1]
    return [p.strip().replace("\\|", "|") for p in re.split(r"(?<!\\)\|", s)]


def _is_separator(cells):
    cleaned = [c.replace(" ", "") for c in cells if c.strip()]
    return bool(cleaned) and all(SEP_CELL.fullmatch(c) for c in cleaned)


def parse_table(lines):
    rows = [split_cells(l) for l in lines]
    rows = [r for r in rows if not _is_separator(r)]
    if not rows:
        return [], []
    header, body = rows[0], rows[1:]
    n = len(header)
    body = [(r + [""] * n)[:n] for r in body]
    return header, body


def split_steps(text):
    t = text.strip()
    if re.match(r"^1\.\s+\S", t):
        return STEP_SPLIT.split(t)
    return [t]


def split_checks(text):
    t = text.strip()
    if t.startswith("["):
        return CHECK_SPLIT.split(t)
    return [t]


def parse_blocks(text):
    """Retourne une liste de blocs (dict) avec le numéro de ligne (1-based)."""
    lines = text.splitlines()
    blocks, para, para_line = [], [], 0
    quote_open = False

    def flush():
        nonlocal para
        if para:
            blocks.append({"type": "p", "text": " ".join(para), "line": para_line})
            para = []

    i = 0
    while i < len(lines):
        raw = lines[i]
        s = raw.strip()
        if not s:
            flush()
            quote_open = False
            i += 1
            continue
        if s.startswith("|"):
            flush()
            quote_open = False
            start = i
            tbl = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                tbl.append(lines[i])
                i += 1
            header, rows = parse_table(tbl)
            blocks.append({"type": "table", "header": header, "rows": rows, "line": start + 1})
            continue
        m = re.match(r"^(#{1,4})\s+(.*)$", s)
        if m:
            flush()
            quote_open = False
            blocks.append({"type": "h", "level": len(m.group(1)), "text": m.group(2).strip(), "line": i + 1})
            i += 1
            continue
        if re.fullmatch(r"(-{3,}|\*{3,}|_{3,})", s):
            flush()
            i += 1
            continue
        if s.startswith(">"):
            flush()
            # Chaque ligne « > » est un paragraphe : la procédure de bug garde ses étapes sur des lignes séparées.
            blocks.append({"type": "quote", "text": s.lstrip(">").strip(), "line": i + 1})
            i += 1
            continue
        quote_open = False
        m = re.match(r"^(\s*)[-*]\s+(.*)$", raw)
        if m:
            flush()
            level = min(len(m.group(1).replace("\t", "  ")) // 2, 2)
            blocks.append({"type": "bullet", "text": m.group(2).strip(), "level": level, "line": i + 1})
            i += 1
            continue
        m = re.match(r"^\s*(\d+)\.\s+(.*)$", raw)
        if m:
            flush()
            blocks.append({"type": "num", "n": m.group(1), "text": m.group(2).strip(), "line": i + 1})
            i += 1
            continue
        if not para:
            para_line = i + 1
        para.append(s)
        i += 1
    flush()
    return blocks
