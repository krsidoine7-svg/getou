# tchor-rectte-pr

Skill pour Claude : **audite n'importe quel projet logiciel, détecte son secteur, puis produit un
cahier de recette pas-à-pas personnalisé**, en Markdown et en Word, prêt à être imprimé ou rempli
par des testeurs non techniques.

Règle fondatrice : **pas de contenu générique**. Chaque test cite de vrais libellés, de vraies URL,
de vrais comptes, de vrais messages, ou signale honnêtement qu'ils manquent.

## Ce qu'il produit

| Fichier (dans docs/ du projet) | Rôle |
| :--- | :--- |
| AUDIT-RECETTE.md | Rapport d'audit : contexte, secteur, modules et sources, comptes, écarts, questions. Soumis à validation. |
| CAHIER-DE-RECETTE.md | Cahier source : comptes de test, modules de tests, matrice de couverture, annexe d'écarts. |
| CAHIER-DE-RECETTE.docx | Version Word officielle (paysage, page de garde, en-têtes, tableaux à cocher). |
| BUGS_ET_AMELIORATIONS.docx | Tableau de suivi des anomalies avec cellule de capture d'écran. |
| recette-meta.json | Métadonnées (plateforme, URL, version, logo, couleur de marque). |

## Fonctionnement

1. **Phase 0, cadrage** : scripts d'inventaire, détection du secteur (avec niveau de confiance), questions seulement si nécessaire.
2. **Phase 1, audit** (lecture seule) : stack, écrans, rôles, flux, règles, comptes, URL, marque.
3. **Phase 1B, profil sectoriel** : fonctionnalités standards du secteur comparées au projet, parcours de bout en bout, cas réels, conformité.
4. **Phase 2, validation** : rapport d'audit, l'utilisateur confirme ou corrige.
5. **Phase 3, rédaction** : cahier modulaire, tests nominaux, échecs, limites, droits.
6. **Phase 4, contrôle et Word** : lint_cahier.py, conversion, vérification.

## Installation

- **Claude Code** : copie le dossier tchor-rectte-pr/ dans ~/.claude/skills/ (tous tes projets)
  ou dans .claude/skills/ à la racine d'un projet.
- **Claude.ai / application** : importe le fichier tchor-rectte-pr.skill dans les paramètres des skills.

Prérequis des scripts : Python 3.9 ou plus et python-docx (pip install python-docx).

## Utilisation

Phrases qui déclenchent le skill :
- « Fais-moi le cahier de recette de ce projet. »
- « Audite l'application et prépare les tests pour mes testeurs. »
- « Je veux un plan de test complet de la plateforme, avec un document Word. »

Il fonctionne aussi sans code source (URL de staging, captures, maquettes) : l'audit repose alors sur
l'interface seule et les comptes de test doivent être fournis.

## Scripts

Tous s'exécutent depuis n'importe quel dossier. <projet> est la racine du projet audité.

    # Phase 0 : inventaire (JSON sur la sortie standard, ou --out fichier.json)
    python scripts/scan_project.py <projet>            # stack, URLs, routes, rôles, entités, secteur probable
    python scripts/find_test_accounts.py <projet>      # comptes de test candidats (jamais les .env réels)
    python scripts/extract_brand.py <projet>           # nom, couleurs, logos

    # Phase 4 : contrôle et livrables
    python scripts/lint_cahier.py docs/CAHIER-DE-RECETTE.md [--strict] [--json]
    python scripts/md_to_docx.py docs/CAHIER-DE-RECETTE.md --meta docs/recette-meta.json --out docs/CAHIER-DE-RECETTE.docx
    python scripts/make_bugs_doc.py --meta docs/recette-meta.json --out docs/BUGS_ET_AMELIORATIONS.docx --rows 25

Ce que vérifie lint_cahier.py : placeholders non résolus, HTML brut, numérotation des tests,
priorités P1/P2/P3, étapes numérotées, cases [ ] OK / [ ] NA, tableau de validation en fin de
module, procédure de bug, URL locale, formules vagues (« fonctionne correctement »), scénarios sans
élément concret, résultats copiés-collés, modules sans cas d'échec. Il affiche aussi les chiffres
(modules, tests, P1) pour la matrice de couverture.

## Structure

    tchor-rectte-pr/
    ├── SKILL.md                      instructions principales (workflow)
    ├── README.md
    ├── references/
    │   ├── anti-generique.md         comment éviter le contenu générique
    │   ├── audit-checklist.md        où chercher, par stack et par type de projet
    │   ├── sector-profiles.md        connaissance métier par secteur
    │   ├── sector-signals.json       mots-clés de détection du secteur
    │   ├── test-design.md            écrire des scénarios, couverture, priorités
    │   └── cahier-format.md          format exact du cahier et du Word
    ├── assets/
    │   ├── cahier-template.md
    │   ├── audit-template.md
    │   └── recette-meta.example.json
    └── scripts/
        ├── scan_project.py  find_test_accounts.py  extract_brand.py
        ├── lint_cahier.py  md_to_docx.py  make_bugs_doc.py
        └── _mdparse.py  _docx_helpers.py   (modules partagés)

## Personnaliser

- **Ajouter ou affiner un secteur** : ajoute un bloc dans references/sector-signals.json (mots-clés
  de détection) et une section dans references/sector-profiles.md (fonctions, parcours, cas réels, conformité).
- **Changer les couleurs ou la police du Word** : NAVY, BORDER et FONT en haut de scripts/_docx_helpers.py.
  La couleur de marque se règle dans recette-meta.json.
- **Durcir ou assouplir le contrôle** : listes VAGUE, FILLER, FAILURE_WORDS dans scripts/lint_cahier.py.

## Dépannage

| Problème | Solution |
| :--- | :--- |
| ModuleNotFoundError: docx | pip install python-docx (ajouter --break-system-packages si l'environnement le demande) |
| Logo absent du Word | Word ne lit pas le SVG : convertir en PNG et mettre le chemin dans recette-meta.json |
| Étapes d'un scénario collées sur une ligne | Vérifier le format 1. ... 2. ... (numéro, point, espace) dans la cellule |
| Le lint signale « scénario sans élément concret » | Ajouter le libellé exact entre guillemets, l'URL ou la valeur saisie |
| Secteur mal détecté | Le script donne un indice : corriger en lisant les écrans, ajouter des mots-clés au JSON |
