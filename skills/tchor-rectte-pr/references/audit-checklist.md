# Checklist d'audit par type de projet

Objectif : retrouver rapidement, dans le code ou sur le site, ce qui nourrit le cahier. Commence
par python scripts/scan_project.py <projet>, puis complète en lisant.

## Sommaire
1. Où chercher selon la stack
2. Par type de projet
3. Comptes de test
4. URL des environnements
5. Messages et libellés exacts
6. Sans code source

## 1. Où chercher selon la stack

| Stack | Routes / écrans | Auth et rôles | Validation et messages |
| :--- | :--- | :--- | :--- |
| Next.js | app/**/page.tsx, app/api/**/route.ts, pages/** | middleware.ts, NextAuth/Clerk, getServerSession | schémas zod/yup, messages/*.json |
| React / Vue SPA | <Route path> ou router/index.ts | guards de routes, contexte d'auth | composants de formulaire, i18n |
| Express / Nest / Fastify | router.get(...), @Controller | middlewares auth, roles, guards | validators (Joi, class-validator) |
| Laravel | routes/web.php, routes/api.php | Gate, Policy, middleware role: | FormRequest, lang/*/validation.php |
| Django | urls.py | permissions, groups, décorateurs | forms.py, serializers |
| Rails | config/routes.rb | Devise, Pundit, CanCan | config/locales/*.yml, modèles |
| Mobile (Flutter, React Native) | navigateurs/écrans déclarés | stockage du token, écran de login | fichiers de textes, arb |
| API seule | OpenAPI/Swagger, contrôleurs | schémas de sécurité, scopes | codes HTTP et corps d'erreur |

Cherche aussi : webhook, cron, queue/job, upload/multer/presign, payment/checkout,
email/mail/notification, export/csv, role/permission/policy/guard.

## 2. Par type de projet

**Application web avec comptes** : inscription, confirmation e-mail, connexion, mot de passe oublié,
changement de mot de passe, profil, suppression de compte, déconnexion, expiration de session, rôles.

**E-commerce / marketplace** : catalogue, recherche, filtres, fiche produit, panier, code promo,
adresse, livraison, paiement, confirmation, suivi, retour/remboursement, avis, espace vendeur
(produits, stocks, commandes, versements), litiges, back-office.

**Plateforme à validation / modération** : soumission, états (brouillon, en attente, publié, refusé,
archivé), motifs de refus, notification, modification après publication, signalements.

**Fintech / paiement** : inscription et vérification d'identité, plafonds, dépôt, retrait, transfert,
historique, reçus, frais, double validation, litige, rapprochement, export.

**Application mobile** : installation, permissions demandées, hors-ligne, reprise après coupure, notifications push, rotation et tailles d'écran, versions d'OS.

**SaaS multi-organisation** : création d'organisation, invitation, rôles d'équipe, isolation des données
entre organisations, abonnement et facturation, changement de plan, export, API et clés, journaux.

**API / back-end seul** : authentification, codes de retour, validation, pagination, limites de débit,
idempotence, versionnement. Dans ce cas, les « testeurs non techniques » exécutent via une interface
d'administration ou un outil fourni (Swagger UI, Postman) : le cahier doit dire lequel.

**Site vitrine / contenu** : navigation, formulaire de contact, SEO de base, performance perçue,
mentions légales, cookies, multilingue, responsive.

## 3. Comptes de test

python scripts/find_test_accounts.py <projet> puis lecture du fichier source. Lieux habituels :
prisma/seed.ts, database/seeders/, db/seeds.rb, fixtures/, factories/, cypress/,
playwright/, README, docs/, .env.example, scripts SQL d'initialisation.

- Mot de passe haché ($2b$...) : inutilisable pour un testeur. Chercher le clair dans le seed ou
  la documentation. Sinon : « À FOURNIR ».
- Compte de seed destiné au développement local : ne pas supposer qu'il existe sur le staging.
  Le noter dans les hypothèses.
- Aucun compte : le dire dans le rapport d'audit et demander les comptes ou la permission d'en créer.

## 4. URL des environnements

Fichiers : vercel.json, .vercel/project.json, netlify.toml, CNAME, package.json (homepage),
.env.example (APP_URL, NEXT_PUBLIC_*_URL, BASE_URL), README, config CI (.github/workflows),
app.json (mobile). Un projet Vercel donne souvent https://<projectName>.vercel.app : à vérifier
avec l'utilisateur ou par une requête, pas à affirmer.

## 5. Messages et libellés exacts

Les testeurs comparent ce qu'ils voient à ce que tu écris. Récupère les textes à la source :
fichiers de traduction (locales, messages, lang), composants (libellés de boutons), schémas de
validation (messages d'erreur), modèles d'e-mails (objet et corps). Cite-les entre guillemets
dans le cahier.

## 6. Sans code source

Si l'utilisateur ne donne qu'une URL, des maquettes (Figma, captures) ou une description :
- Parcours le site (WebFetch ou navigation) et liste les pages, menus, formulaires, libellés visibles.
- Dis clairement ce que tu ne peux pas voir : règles côté serveur, rôles cachés, e-mails envoyés.
- Pour chaque zone d'ombre, ajoute la question à poser, et écris dans les hypothèses que l'audit
  est fondé sur l'interface seule.
- Les comptes de test doivent alors être fournis par l'utilisateur.
