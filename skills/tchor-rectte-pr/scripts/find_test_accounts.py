#!/usr/bin/env python3
"""Repère les comptes de TEST dans un projet (seeds, fixtures, factories, docs, e2e).

Usage :
    python find_test_accounts.py <dossier-projet> [--out comptes.json]

Ne lit JAMAIS les fichiers .env réels (secrets), seulement .env.example / .env.sample.
Les mots de passe déjà hachés (bcrypt, argon2) sont signalés comme inutilisables : il faut alors
demander le mot de passe en clair ou la permission de créer des comptes. Ne rien inventer.
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path

SKIP = {"node_modules", ".git", "dist", "build", ".next", ".nuxt", "vendor", "__pycache__", "venv", ".venv", "coverage", "target"}
NAME_HINT = re.compile(r"seed|fixture|factory|factories|e2e|cypress|playwright|readme|credentials|accounts|comptes|test-users|demo|\.env\.(example|sample)|sample", re.I)
DIR_HINT = re.compile(r"seeders?|seeds?|fixtures?|factories|e2e|cypress|playwright|docs?|prisma|migrations|scripts|tests?", re.I)
EXT = {".js", ".ts", ".tsx", ".php", ".py", ".rb", ".sql", ".json", ".md", ".yml", ".yaml", ".txt", ".example", ".sample", ".sh"}
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PASS = re.compile(r"(?:password|passwd|pwd|mot de passe|mdp|pass)\s*[`'\"]?\s*(?:[:=]|\|)\s*[`'\"]?([^\s`'\",;|)]{4,64})", re.I)
HASH = re.compile(r"^(\$2[aby]\$|\$argon2|\$pbkdf2|pbkdf2_|sha\d+\$|[a-f0-9]{32,})", re.I)
ROLE = re.compile(r"\b(super_?admin|admin|manager|vendor|vendeur|seller|customer|acheteur|moderator|moderateur|editor|agent|teacher|student|doctor|patient|driver|owner|staff)\b", re.I)
NOISE_MAIL = re.compile(r"@(sentry|users\.noreply|example\.org)\b|noreply@|no-reply@", re.I)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("project")
    ap.add_argument("--out")
    a = ap.parse_args()
    root = Path(a.project).resolve()
    found = []
    for dp, dns, fns in os.walk(root):
        dns[:] = [d for d in dns if d not in SKIP and not d.startswith(".")]
        in_hint_dir = bool(DIR_HINT.search(str(Path(dp).relative_to(root))))
        for fn in fns:
            p = Path(dp) / fn
            if fn.lower() in {".env", ".env.local", ".env.production", ".env.development"}:
                continue
            if p.suffix.lower() not in EXT and not fn.lower().startswith(".env."):
                continue
            if not (NAME_HINT.search(fn) or in_hint_dir):
                continue
            try:
                if p.stat().st_size > 300_000:
                    continue
                lines = p.read_text(encoding="utf-8", errors="ignore").splitlines()
            except OSError:
                continue
            for i, line in enumerate(lines):
                emails = [e for e in EMAIL.findall(line) if not NOISE_MAIL.search(e)]
                if not emails:
                    continue
                # Même ligne d'abord, puis les 3 lignes suivantes seulement : regarder en arrière
                # ferait attribuer le mot de passe du compte précédent.
                nxt = [lines[j] for j in range(i + 1, min(len(lines), i + 4))
                       if not EMAIL.search(lines[j])]
                pw = PASS.search(line) or next((m for m in (PASS.search(x) for x in nxt) if m), None)
                role = ROLE.search(line) or next((m for m in (ROLE.search(x) for x in nxt) if m), None)
                pwd = pw.group(1) if pw else None
                found.append({
                    "email": emails[0],
                    "mot_de_passe": pwd,
                    "mot_de_passe_hache": bool(pwd and HASH.match(pwd)),
                    "role_probable": role.group(1).lower() if role else None,
                    "source": f"{p.relative_to(root)}:{i + 1}",
                })
    seen, uniq = set(), []
    for f in found:
        k = (f["email"].lower(), f["mot_de_passe"])
        if k not in seen:
            seen.add(k)
            uniq.append(f)
    usable = [f for f in uniq if f["mot_de_passe"] and not f["mot_de_passe_hache"]]
    result = {
        "comptes_candidats": uniq[:60],
        "utilisables_directement": len(usable),
        "avertissement": "Candidats à vérifier en lisant le fichier source (contexte, rôle réel, environnement concerné). "
                         "Si aucun compte utilisable : l'écrire dans le rapport d'audit et demander les comptes ou la permission d'en créer.",
    }
    out = json.dumps(result, ensure_ascii=False, indent=2)
    if a.out:
        Path(a.out).write_text(out, encoding="utf-8")
        print(f"OK -> {a.out}")
    else:
        print(out)


if __name__ == "__main__":
    sys.exit(main())
