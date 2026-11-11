#!/usr/bin/env python3
"""Inventaire rapide d'un projet : stack, URLs, routes, rôles, entités, indices de secteur.

Usage :
    python scan_project.py <dossier-projet> [--limit 300] [--out scan.json]

Sortie JSON. Tout est un INDICE à vérifier en lisant le code et les écrans : le script
ne remplace pas l'audit, il évite de partir de zéro et de rater les évidences.
"""
import argparse
import json
import os
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

SKIP_DIRS = {"node_modules", ".git", "dist", "build", ".next", ".nuxt", "vendor", "__pycache__", "venv", ".venv",
             "env", ".idea", ".vscode", "coverage", ".turbo", ".cache", "target", "out", "Pods", ".gradle",
             "storage", "bower_components", ".svelte-kit", "docs"}
KEEP_HIDDEN = {".vercel", ".github"}
CODE_EXT = {".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".vue", ".svelte", ".php", ".py", ".rb", ".java", ".kt",
            ".go", ".cs", ".dart", ".swift", ".html", ".blade.php"}
TEXT_EXT = CODE_EXT | {".json", ".md", ".sql", ".prisma", ".yml", ".yaml", ".toml", ".env", ".txt"}
MAX_FILE = 400_000
MAX_FILES = 6000
HERE = Path(__file__).resolve().parent
SIGNALS = HERE.parent / "references" / "sector-signals.json"


def norm(s):
    return "".join(c for c in unicodedata.normalize("NFKD", s.lower()) if not unicodedata.combining(c))


def walk(root):
    n = 0
    for dp, dns, fns in os.walk(root):
        dns[:] = [d for d in dns if d not in SKIP_DIRS and (not d.startswith(".") or d in KEEP_HIDDEN)]
        for fn in fns:
            n += 1
            if n > MAX_FILES:
                return
            yield Path(dp) / fn


def read(p):
    try:
        if p.stat().st_size > MAX_FILE:
            return ""
        return p.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return ""


def rel(p, root):
    return str(p.relative_to(root))


# ------------------------------------------------------------------ stack
DEP_LABELS = {
    "next": "Next.js", "react": "React", "vue": "Vue", "nuxt": "Nuxt", "@angular/core": "Angular", "svelte": "Svelte",
    "express": "Express", "@nestjs/core": "NestJS", "fastify": "Fastify", "prisma": "Prisma", "@prisma/client": "Prisma",
    "mongoose": "MongoDB (Mongoose)", "sequelize": "Sequelize", "typeorm": "TypeORM", "drizzle-orm": "Drizzle",
    "next-auth": "NextAuth", "@supabase/supabase-js": "Supabase", "firebase": "Firebase", "react-native": "React Native",
    "expo": "Expo", "electron": "Electron", "tailwindcss": "Tailwind CSS", "@clerk/nextjs": "Clerk", "passport": "Passport",
    "jsonwebtoken": "JWT", "socket.io": "Socket.IO", "multer": "Multer (téléversements)",
}
SERVICE_WORDS = ["stripe", "paypal", "paystack", "flutterwave", "cinetpay", "kkiapay", "fedapay", "twilio", "mailgun",
                 "sendgrid", "resend", "nodemailer", "cloudinary", "aws-sdk", "@aws-sdk", "algolia", "mapbox", "leaflet",
                 "google-maps", "onesignal", "sentry", "africastalking", "orange", "wave"]
MANIFEST_HINTS = [
    ("composer.json", "laravel/framework", "Laravel (PHP)"), ("composer.json", "symfony", "Symfony (PHP)"),
    ("requirements.txt", "django", "Django (Python)"), ("requirements.txt", "flask", "Flask (Python)"),
    ("requirements.txt", "fastapi", "FastAPI (Python)"), ("pyproject.toml", "django", "Django (Python)"),
    ("pyproject.toml", "fastapi", "FastAPI (Python)"), ("Gemfile", "rails", "Ruby on Rails"),
    ("pom.xml", "spring", "Spring (Java)"), ("build.gradle", "spring", "Spring (Java)"),
    ("pubspec.yaml", "flutter", "Flutter (Dart)"), ("go.mod", "", "Go"), ("Cargo.toml", "", "Rust"),
]


def detect_stack(root, files):
    stack, services = set(), set()
    pj = root / "package.json"
    name = None
    if pj.exists():
        try:
            data = json.loads(read(pj) or "{}")
            name = data.get("name")
            deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
            for d in deps:
                if d in DEP_LABELS:
                    stack.add(DEP_LABELS[d])
                if any(w in d.lower() for w in SERVICE_WORDS):
                    services.add(d)
            stack.add("Node.js")
        except json.JSONDecodeError:
            pass
    by_name = {f.name: f for f in files}
    for fname, needle, label in MANIFEST_HINTS:
        f = by_name.get(fname)
        if f and needle in read(f).lower():
            stack.add(label)
    for f in files:
        if f.suffix == ".prisma":
            stack.add("Prisma")
        if f.name == "AndroidManifest.xml":
            stack.add("Android natif")
        if f.suffix == ".xcodeproj":
            stack.add("iOS natif")
    return {"package_name": name, "stack": sorted(stack), "services_tiers": sorted(services)}


# ------------------------------------------------------------------ URLs
URL_RE = re.compile(r"https?://[^\s'\"<>)\]}`,;\\]+")
NOISE = ("w3.org", "schema.org", "github.com", "githubusercontent", "googleapis.com", "gstatic", "cdn", "fonts.",
         "npmjs", "jsdelivr", "unpkg", "cloudflare", "creativecommons", "mozilla.org", "example.com", "opensource.org",
         "apache.org", "shields.io", "xmlns", "reactjs.org", "nextjs.org", "vercel.com/docs", "tailwindcss.com", "docs.")
URL_FILES = {"package.json", "vercel.json", "netlify.toml", "CNAME", "README.md", "readme.md", "app.json", "manifest.json",
             ".env.example", ".env.sample", ".env.local.example", "next.config.js", "next.config.mjs", "next.config.ts",
             "nuxt.config.ts", "vite.config.ts", "docker-compose.yml", "fly.toml", "render.yaml", "firebase.json",
             ".firebaserc", "project.json", "app.config.js", "app.config.ts"}


def detect_urls(root, files):
    cand, local = Counter(), set()
    hints = []
    for f in files:
        if f.name in URL_FILES:
            txt = read(f)
            for u in URL_RE.findall(txt):
                u = u.rstrip(".")
                if "localhost" in u or "127.0.0.1" in u:
                    local.add(u)
                elif not any(n in u for n in NOISE):
                    cand[u] += 1
            if f.name == "project.json" and f.parent.name == ".vercel":
                try:
                    pn = json.loads(txt).get("projectName")
                    if pn:
                        hints.append(f"Projet Vercel « {pn} » : URL probable https://{pn}.vercel.app (à vérifier)")
                except json.JSONDecodeError:
                    pass
            if f.name == "CNAME":
                hints.append(f"CNAME : domaine personnalisé probable {txt.strip()}")
    return {"candidates": [u for u, _ in cand.most_common(15)], "local": sorted(local)[:5], "hints": hints}


# ------------------------------------------------------------------ routes
ROUTE_PATTERNS = [
    (re.compile(r"\b(?:app|router|\w+Router|server|api)\.(get|post|put|patch|delete|all)\(\s*['\"`]([^'\"`]+)['\"`]"), {".js", ".ts", ".mjs", ".cjs"}),
    (re.compile(r"Route::(get|post|put|patch|delete|any|resource|apiResource)\(\s*['\"]([^'\"]+)['\"]"), {".php"}),
    (re.compile(r"\b(?:re_)?(path)\(\s*r?['\"]([^'\"]*)['\"]"), {".py"}),
    (re.compile(r"@\w+\.(route|get|post|put|patch|delete)\(\s*['\"]([^'\"]+)['\"]"), {".py"}),
    (re.compile(r"^\s*(get|post|put|patch|delete|resources|resource|namespace)\s+['\":]?([\w/:\-]+)", re.M), {".rb"}),
    (re.compile(r"<Route[^>]*\bpath=[\"'{]+\s*[\"']?([^\"'}]+)[\"']?()", re.S), {".jsx", ".tsx", ".js", ".ts"}),
    (re.compile(r"\bpath:\s*['\"]([^'\"]+)['\"]()"), {".ts", ".js", ".vue"}),
    (re.compile(r"@(Get|Post|Put|Patch|Delete)\(\s*['\"]?([^'\")]*)"), {".ts"}),
]
NEXT_PAGE = re.compile(r"^page\.(tsx|jsx|ts|js|mdx)$")
NEXT_API = re.compile(r"^route\.(ts|js)$")


def next_routes(root, files):
    out = []
    for f in files:
        parts = f.relative_to(root).parts
        if "app" in parts and (NEXT_PAGE.match(f.name) or NEXT_API.match(f.name)):
            seg = [s for s in parts[parts.index("app") + 1:-1] if not (s.startswith("(") and s.endswith(")")) and not s.startswith("@")]
            out.append({"method": "PAGE" if NEXT_PAGE.match(f.name) else "API", "path": "/" + "/".join(seg), "file": rel(f, root)})
        elif "pages" in parts and f.suffix in {".tsx", ".jsx", ".ts", ".js"} and not f.name.startswith("_"):
            seg = list(parts[parts.index("pages") + 1:])
            seg[-1] = re.sub(r"\.(tsx|jsx|ts|js)$", "", seg[-1])
            if seg[-1] == "index":
                seg = seg[:-1]
            out.append({"method": "API" if seg and seg[0] == "api" else "PAGE", "path": "/" + "/".join(seg), "file": rel(f, root)})
    return out


def detect_routes(root, files, limit):
    routes = next_routes(root, files)
    for f in files:
        sfx = f.suffix.lower()
        if sfx not in CODE_EXT or "test" in f.name.lower():
            continue
        txt = read(f)
        if not txt:
            continue
        for pat, exts in ROUTE_PATTERNS:
            if sfx not in exts:
                continue
            for m in pat.finditer(txt):
                g = m.groups()
                method, path = (g[0], g[1]) if len(g) > 1 and g[1] else ("ROUTE", g[0])
                if not path or len(path) > 120 or " " in path.strip():
                    continue
                routes.append({"method": method.upper(), "path": path, "file": rel(f, root)})
    seen, uniq = set(), []
    for r in routes:
        k = (r["method"], r["path"], r["file"])
        if k not in seen:
            seen.add(k)
            uniq.append(r)
    return {"total": len(uniq), "items": uniq[:limit]}


# ------------------------------------------------------------------ rôles et entités
ROLE_WORDS = ["superadmin", "super_admin", "admin", "administrator", "manager", "vendor", "seller", "customer", "client",
              "user", "moderator", "editor", "agent", "teacher", "student", "doctor", "patient", "driver", "owner",
              "member", "guest", "staff", "operator", "supervisor", "accountant"]
ENUM_ROLE = re.compile(r"enum\s+\w*Role\w*\s*\{([^}]*)\}", re.I)
ARR_ROLE = re.compile(r"\broles?\s*[:=]\s*[\[\(]([^\]\)]{3,200})[\]\)]", re.I)

ENTITY_PATTERNS = [
    (re.compile(r"^model\s+(\w+)\s*\{", re.M), {".prisma"}),
    (re.compile(r"class\s+(\w+)\([^)]*models\.Model"), {".py"}),
    (re.compile(r"Schema::create\(\s*['\"](\w+)['\"]"), {".php"}),
    (re.compile(r"@Entity\([^)]*\)\s*(?:export\s+)?class\s+(\w+)"), {".ts"}),
    (re.compile(r"(?:sequelize\.define|mongoose\.model)\(\s*['\"](\w+)['\"]"), {".js", ".ts"}),
    (re.compile(r"(?:pgTable|mysqlTable|sqliteTable)\(\s*['\"](\w+)['\"]"), {".ts", ".js"}),
    (re.compile(r"CREATE TABLE\s+(?:IF NOT EXISTS\s+)?[`\"\[]?(\w+)", re.I), {".sql"}),
    (re.compile(r"create_table\s+:?['\"]?(\w+)"), {".rb"}),
]


def detect_roles_entities(root, files):
    roles = Counter()
    entities = set()
    for f in files:
        sfx = f.suffix.lower()
        if sfx not in TEXT_EXT:
            continue
        txt = read(f)
        if not txt:
            continue
        for m in ENUM_ROLE.finditer(txt):
            roles.update({w.strip(): 5 for w in re.findall(r"[A-Za-z_]+", m.group(1))})
        for m in ARR_ROLE.finditer(txt):
            roles.update({w: 3 for w in re.findall(r"['\"]([A-Za-z_ -]{3,30})['\"]", m.group(1))})
        low = txt.lower()
        if sfx in CODE_EXT:
            for w in ROLE_WORDS:
                c = len(re.findall(r"['\"]" + w + r"['\"]", low))
                if c:
                    roles[w] += c
        for pat, exts in ENTITY_PATTERNS:
            if sfx in exts:
                entities.update(pat.findall(txt))
    return {"roles_candidats": [r for r, c in roles.most_common(20) if c >= 2],
            "entites": sorted(entities)[:80]}


# ------------------------------------------------------------------ secteur
def sector_scores(root, files, routes, ents, roles, pkg_name):
    data = json.loads(SIGNALS.read_text(encoding="utf-8"))["sectors"]
    corpora = []  # (poids, texte normalisé, plafond par mot)
    corpora.append((3, norm(" ".join(ents["entites"])), 5))
    corpora.append((2, norm(" ".join(r["path"] for r in routes["items"])), 5))
    corpora.append((2, norm(" ".join(roles["roles_candidats"])), 3))
    readme = next((f for f in files if f.name.lower() == "readme.md"), None)
    corpora.append((1, norm((pkg_name or "") + " " + (read(readme)[:20000] if readme else "")), 5))
    ui, count = [], 0
    for f in files:
        parts = {p.lower() for p in f.relative_to(root).parts}
        if f.suffix.lower() in {".json", ".html", ".vue", ".tsx", ".jsx", ".php", ".blade.php", ".svelte"} and \
                parts & {"locales", "i18n", "messages", "lang", "translations", "components", "pages", "views", "templates", "resources", "screens"}:
            ui.append(norm(read(f)[:60000]))
            count += 1
            if count >= 200:
                break
    corpora.append((1, " ".join(ui), 15))
    results = []
    for key, sec in data.items():
        score, hits = 0, {}
        for kw in sec["keywords"]:
            k = norm(kw)
            pat = re.compile(r"(?<![a-z])" + re.escape(k))
            s = 0
            for weight, text, cap in corpora:
                if text:
                    s += weight * min(len(pat.findall(text)), cap)
            if s:
                hits[kw] = s
                score += s
        results.append({"sector": key, "label": sec["label"], "score": score,
                        "top_keywords": [k for k, _ in sorted(hits.items(), key=lambda x: -x[1])[:8]]})
    results.sort(key=lambda r: -r["score"])
    top = results[0]["score"] if results else 0
    second = results[1]["score"] if len(results) > 1 else 0
    if top >= 25 and top >= 1.5 * max(second, 1):
        conf = "Élevé"
    elif top >= 10:
        conf = "Moyen"
    else:
        conf = "Faible"
    return {"confiance_indicative": conf, "classement": results[:4],
            "note": "Indice automatique. Confirmer en lisant les écrans, les libellés et les rôles. Plusieurs secteurs proches = projet hybride (ex. marketplace + fintech)."}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("project")
    ap.add_argument("--limit", type=int, default=300, help="nombre max de routes listées")
    ap.add_argument("--out")
    a = ap.parse_args()
    root = Path(a.project).resolve()
    if not root.is_dir():
        sys.exit(f"Dossier introuvable : {root}")
    files = list(walk(root))
    stack = detect_stack(root, files)
    urls = detect_urls(root, files)
    routes = detect_routes(root, files, a.limit)
    re_ = detect_roles_entities(root, files)
    sector = sector_scores(root, files, routes, re_, re_, stack["package_name"])
    result = {"projet": str(root), "fichiers_analyses": len(files), **stack, "urls": urls, "routes": routes,
              "roles_et_entites": re_, "secteur": sector}
    out = json.dumps(result, ensure_ascii=False, indent=2)
    if a.out:
        Path(a.out).write_text(out, encoding="utf-8")
        print(f"OK -> {a.out}")
    else:
        print(out)


if __name__ == "__main__":
    main()
