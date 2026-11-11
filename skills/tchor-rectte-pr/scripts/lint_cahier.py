#!/usr/bin/env python3
"""Contrôle qualité d'un cahier de recette Markdown, avant conversion Word.

Usage :
    python lint_cahier.py docs/CAHIER-DE-RECETTE.md [--strict] [--json]

Code de sortie : 1 s'il y a des ERREURS (ou des avertissements avec --strict), sinon 0.
Le script ne juge pas la pertinence métier : il attrape ce qui trahit un contenu
générique, bâclé ou cassé (placeholders, HTML brut, formules creuses, scénarios sans
élément concret, résultats copiés-collés, modules sans cas d'échec...).
"""
import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _mdparse import parse_blocks, split_steps  # noqa: E402

PLACEHOLDER = re.compile(r"\{\{|\}\}|\bTODO\b|\bTBD\b|\bXXX+\b|lorem ipsum|à compléter|à définir|À RENSEIGNER|\[À ", re.I)
EMOJI = re.compile("[\U0001F000-\U0001FAFF\u2600-\u27BF\u2B00-\u2BFF\u2705\u274C\uFE0F]")
RAW_HTML = re.compile(r"&nbsp;|&amp;|<\s*/?\s*[a-zA-Z][a-zA-Z0-9]*[^>]*>")
LOCAL = re.compile(r"localhost|127\.0\.0\.1|0\.0\.0\.0")
VAGUE = [
    r"fonctionne(nt)? (correctement|normalement|bien)",
    r"s'affiche(nt)? (correctement|bien|normalement)",
    r"comme (prévu|attendu)",
    r"tout (se passe|fonctionne) bien",
    r"sans (aucun )?problème",
    r"(de|d')\s?(manière|façon) (appropriée|adéquate|correcte)",
    r"bon fonctionnement",
    r"\bcorrectement\b",
    r"\betc\.?(?!\w)",
    r"le système (réagit|répond) (bien|correctement)",
    r"l'utilisateur peut (alors )?(accéder|utiliser) (à )?(la|le|les) fonctionnalité",
]
FILLER = [r"il est important de", r"n'hésitez pas", r"dans le monde d'aujourd'hui", r"en conclusion",
          r"il convient de noter", r"robuste et scalable", r"expérience utilisateur optimale"]
FAILURE_WORDS = re.compile(
    r"invalide|incorrect|erron|vide|refus|rejet|erreur|interdit|non autoris|trop |mauvais|sans |expir|"
    r"doublon|déjà utilis|bloqu|échec|échou|impossible|dépass|inexistant|annul", re.I)
CONCRETE = re.compile(r"«[^»]+»|\"[^\"]+\"|“[^”]+”|`[^`]+`|(?<![\w])/[\w\-\[\]:.]+|\S+@\S+|https?://|\d")
BUG_PROC = re.compile(r"BUGS_ET_AMELIORATIONS")
EXPECTED_HEAD = ["n°", "intitulé", "scénario", "résultat", "validation"]


class Report:
    def __init__(self):
        self.items = []

    def add(self, level, where, msg):
        self.items.append({"level": level, "where": where, "msg": msg})

    def count(self, level):
        return sum(1 for i in self.items if i["level"] == level)


def col_index(header, prefix):
    for i, c in enumerate(header):
        if c.lower().startswith(prefix):
            return i
    return None


def lint(text):
    rep = Report()
    blocks = parse_blocks(text)
    stats = {"modules": 0, "tests": 0, "p1": 0, "per_module": {}, "failure_tests": 0}

    if not BUG_PROC.search(text):
        rep.add("ERREUR", "document", "Procédure en cas de bug absente (doit citer BUGS_ET_AMELIORATIONS).")
    if not re.search(r"https?://", text):
        rep.add("AVERTISSEMENT", "document", "Aucune URL réelle d'environnement trouvée.")
    for m in LOCAL.finditer(text):
        ln = text.count("\n", 0, m.start()) + 1
        rep.add("AVERTISSEMENT", f"ligne {ln}", "URL locale (localhost) : à remplacer par l'URL de staging/production, sinon à signaler.")
        break
    if "à fournir" in text.lower():
        n = len(re.findall(r"à fournir", text, re.I))
        rep.add("AVERTISSEMENT", "document", f"{n} compte(s) ou donnée(s) « À FOURNIR » : point bloquant à remonter à l'utilisateur.")
    if not re.search(r"^#+\s+.*comptes? de test", text, re.I | re.M):
        rep.add("AVERTISSEMENT", "document", "Section « Comptes de test » introuvable.")

    for ln, line in enumerate(text.splitlines(), 1):
        if PLACEHOLDER.search(line):
            rep.add("ERREUR", f"ligne {ln}", f"Placeholder non résolu : {PLACEHOLDER.search(line).group(0)!r}")
        if EMOJI.search(line):
            rep.add("ERREUR", f"ligne {ln}", "Emoji interdit dans le cahier.")
        if "`" in line:
            rep.add("ERREUR", f"ligne {ln}", "Accent grave (backtick) interdit : écrire en texte simple.")
        if RAW_HTML.search(line):
            rep.add("ERREUR", f"ligne {ln}", f"HTML brut interdit : {RAW_HTML.search(line).group(0)!r}")
        for pat in FILLER:
            if re.search(pat, line, re.I):
                rep.add("AVERTISSEMENT", f"ligne {ln}", f"Formule creuse de type « IA » : {pat!r}")

    # --- découpage en modules
    modules = []  # (titre, numéro, [blocs])
    current = None
    for b in blocks:
        if b["type"] == "h" and b["level"] == 2:
            m = re.match(r"^Module\s*(\d+)\b", b["text"])
            current = {"title": b["text"], "num": int(m.group(1)) if m else None, "line": b["line"], "blocks": []}
            modules.append(current)
        elif current is not None:
            current["blocks"].append(b)

    expected_counter = Counter()
    title_counter = Counter()
    vague_rows = no_concrete = 0
    no_concrete_examples = []

    for mod in [m for m in modules if m["num"] is not None]:
        stats["modules"] += 1
        label = f"Module {mod['num']}"
        tables = [b for b in mod["blocks"] if b["type"] == "table"]
        test_t = next((t for t in tables if col_index(t["header"], "scénario") is not None), None)
        sign_t = next((t for t in tables if t["header"] and t["header"][0].lower().startswith("nom du testeur")), None)
        if test_t is None:
            rep.add("ERREUR", label, "Tableau de tests introuvable (colonne « Scénario pas-à-pas » absente).")
            continue
        h = test_t["header"]
        idx = {k: col_index(h, k) for k in EXPECTED_HEAD}
        idx["prio"] = col_index(h, "priorité")
        missing = [k for k in EXPECTED_HEAD if idx[k] is None]
        if missing:
            rep.add("ERREUR", label, f"Colonnes manquantes : {', '.join(missing)}")
            continue

        # signature
        if sign_t is None:
            rep.add("ERREUR", label, "Tableau de validation de fin de module absent.")
        else:
            rows = sign_t["rows"]
            has_empty = any(all(not c.strip() for c in r) for r in rows)
            dec = [r for r in rows if "décision finale" in " ".join(r).lower()]
            if not has_empty:
                rep.add("ERREUR", label, "Tableau de validation : ligne vide pour la signature absente.")
            if not dec or not ("conforme" in " ".join(dec[0]).lower() and "non conforme" in " ".join(dec[0]).lower()):
                rep.add("ERREUR", label, "Tableau de validation : ligne « Décision finale » avec Conforme / Non Conforme absente.")

        seen_ids = set()
        last_seq = 0
        mod_failure = 0
        n_tests = 0
        for r in test_t["rows"]:
            n_tests += 1
            tid = r[idx["n°"]].strip()
            where = f"{label} - Test {tid or '?'}"
            m = re.fullmatch(r"(\d+)\.(\d+)", tid)
            if not m:
                rep.add("ERREUR", where, "N° invalide (attendu : 1.1, 1.2...).")
            else:
                if int(m.group(1)) != mod["num"]:
                    rep.add("ERREUR", where, f"Le N° ne correspond pas au module {mod['num']}.")
                if tid in seen_ids:
                    rep.add("ERREUR", where, "N° en double.")
                seen_ids.add(tid)
                seq = int(m.group(2))
                if seq != last_seq + 1:
                    rep.add("AVERTISSEMENT", where, f"Numérotation non séquentielle (après {mod['num']}.{last_seq}).")
                last_seq = seq
            if idx["prio"] is not None:
                p = r[idx["prio"]].strip()
                if p not in ("P1", "P2", "P3"):
                    rep.add("ERREUR", where, f"Priorité invalide : {p!r} (P1, P2 ou P3).")
                elif p == "P1":
                    stats["p1"] += 1
            title = r[idx["intitulé"]].strip()
            scen = r[idx["scénario"]].strip()
            exp = r[idx["résultat"]].strip()
            val = r[idx["validation"]].strip()
            if not title:
                rep.add("ERREUR", where, "Intitulé vide.")
            title_counter[title.lower()] += 1
            steps = split_steps(scen)
            nums = [int(re.match(r"(\d{1,2})\.", s).group(1)) for s in steps if re.match(r"\d{1,2}\.", s)]
            if len(steps) < 2 or len(nums) != len(steps):
                rep.add("AVERTISSEMENT", where, "Scénario : moins de 2 étapes numérotées (« 1. ... 2. ... »).")
            elif nums != list(range(1, len(nums) + 1)):
                rep.add("ERREUR", where, f"Étapes mal numérotées : {nums}")
            if any(len(re.sub(r"^\d+\.\s*", "", s).split()) < 2 for s in steps) and len(steps) >= 2:
                rep.add("AVERTISSEMENT", where, "Étape trop courte pour être actionnable (moins de 2 mots).")
            plain = re.sub(r"(?:(?<=\s)|^)\d{1,2}\.\s", " ", scen)
            if not CONCRETE.search(plain):
                no_concrete += 1
                if len(no_concrete_examples) < 8:
                    no_concrete_examples.append(where)
            if not exp:
                rep.add("ERREUR", where, "Résultat attendu vide.")
            else:
                expected_counter[exp.lower()] += 1
                if len(exp.split()) < 6:
                    rep.add("AVERTISSEMENT", where, "Résultat attendu très court (moins de 6 mots) : est-il vérifiable sans interprétation ?")
                for pat in VAGUE:
                    mm = re.search(pat, exp + " " + scen, re.I)
                    if mm:
                        vague_rows += 1
                        rep.add("AVERTISSEMENT", where, f"Formule vague « {mm.group(0)} » : écrire le message, l'URL ou l'élément exact attendu.")
                        break
            if not ("[ ] OK" in val and "[ ] NA" in val):
                rep.add("ERREUR", where, "Validation : cases « [ ] OK » et « [ ] NA » obligatoires.")
            if FAILURE_WORDS.search(title + " " + scen + " " + exp):
                mod_failure += 1
        stats["tests"] += n_tests
        stats["failure_tests"] += mod_failure
        stats["per_module"][label] = {"tests": n_tests, "cas_echec": mod_failure}
        if n_tests < 3:
            rep.add("AVERTISSEMENT", label, f"Seulement {n_tests} test(s) : module probablement sous-couvert.")
        if mod_failure == 0:
            rep.add("AVERTISSEMENT", label, "Aucun cas d'échec ou cas limite détecté dans ce module.")

    if stats["modules"] == 0:
        rep.add("ERREUR", "document", "Aucun module « ## Module N : ... » trouvé.")
    if no_concrete:
        rep.add("AVERTISSEMENT", "document",
                f"{no_concrete} scénario(s) sans élément concret (libellé entre «», URL, e-mail, valeur) : "
                f"contenu probablement générique. Ex. : {', '.join(no_concrete_examples)}")
    for exp, n in expected_counter.items():
        if n >= 3 and len(exp) > 15:
            rep.add("AVERTISSEMENT", "document", f"Résultat attendu identique dans {n} tests (copier-coller ?) : « {exp[:70]}... »")
    for t, n in title_counter.items():
        if n >= 2 and t:
            rep.add("AVERTISSEMENT", "document", f"Intitulé en double ({n}x) : « {t[:70]} »")
    if "matrice de couverture" not in text.lower():
        rep.add("AVERTISSEMENT", "document", "Matrice de couverture absente.")
    return rep, stats


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("markdown")
    ap.add_argument("--strict", action="store_true", help="les avertissements font échouer")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    rep, stats = lint(Path(a.markdown).read_text(encoding="utf-8"))
    errors, warns = rep.count("ERREUR"), rep.count("AVERTISSEMENT")
    if a.json:
        print(json.dumps({"stats": stats, "issues": rep.items, "errors": errors, "warnings": warns}, ensure_ascii=False, indent=2))
    else:
        for level in ("ERREUR", "AVERTISSEMENT"):
            for it in rep.items:
                if it["level"] == level:
                    print(f"[{level}] {it['where']} : {it['msg']}")
        print(f"\nModules : {stats['modules']} | Tests : {stats['tests']} (dont P1 : {stats['p1']}) | "
              f"Tests avec cas d'échec : {stats['failure_tests']}")
        for k, v in stats["per_module"].items():
            print(f"  {k} : {v['tests']} tests, {v['cas_echec']} cas d'échec/limite")
        print(f"Erreurs : {errors} | Avertissements : {warns}")
    sys.exit(1 if errors or (a.strict and warns) else 0)


if __name__ == "__main__":
    main()
