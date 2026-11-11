# Documentation Officielle du Projet — GERETOU (Gère-Tout)
**Application Mobile Native (Android & iOS) de Gestion Financière & Domestique Quotidienne**
*Architecture Offline-First Strict avec Base Locale SQLite & Synchronisation Cloud Neon PostgreSQL*

---

## Table des Matières de la Documentation

Bienvenue dans la documentation officielle et exhaustive du projet **GERETOU**. Ce dossier regroupe l'ensemble des spécifications techniques, fonctionnelles, ergonomiques et opérationnelles nécessaires au développement étape par étape avec **Antigravity**.

| N° | Fichier | Description | Public Cible |
|:---|:---|:---|:---|
| **01** | [`PRD.md`](./PRD.md) | **Product Requirement Document** : Vision, personas, contexte Ouest-Africain, exigences fonctionnelles détaillées par module. | Product, Dev, Métier |
| **02** | [`ROADMAP_MVP.md`](./ROADMAP_MVP.md) | **Feuille de Route des MVPs** : Découpage chronologique du MVP 0 au MVP 6 avec critères d'acceptation stricts. | Tous |
| **03** | [`USER_FLOWS.md`](./USER_FLOWS.md) | **Flux Utilisateurs Détaillés** : Parcours chronologiques action par action, transitions et diagrammes Mermaid. | UI/UX, Dev Frontend |
| **04** | [`TASKS_BREAKDOWN.md`](./TASKS_BREAKDOWN.md) | **Découpage Chirurgical des Tâches** : Modules $\rightarrow$ Tâches $\rightarrow$ Micro-Tâches unitaires robustes. | Dev, Antigravity |
| **05** | [`API.md`](./API.md) | **Spécifications de l'API & Sync** : Endpoints REST/tRPC, contrat de synchronisation Cloud Neon (`/push`, `/pull`), tokens JWT. | Dev Backend, Sync |
| **06** | [`ARCHITECTURE.md`](./ARCHITECTURE.md) | **Architecture Système & Offline-First** : Flux de données unidirectionnel, Zustand, cycle de vie hors-ligne en 0 ms. | Architecte, Dev |
| **07** | [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) | **Schéma Relationnel DDL** : Définition des 12 tables SQLite & PostgreSQL Neon, index et contraintes ACID. | Dev Backend & Mobile |
| **08** | [`SECURITE.md`](./SECURITE.md) | **Modèle de Sécurité** : Chiffrement local, PIN maître avec hachage bcrypt, biométrie, protection IDOR et session lock. | Sécurité, Dev |
| **09** | [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) | **Charte Graphique Forest Ledger** : Règle anti-surcharge, palette de couleurs, typographie en FCFA, composants. | UI/UX, Dev Frontend |
| **10** | [`TESTS_STRATEGY.md`](./TESTS_STRATEGY.md) | **Stratégie de Tests & QA** : Tests unitaires comptables, intégrité SQLite, tests hors-ligne en mode avion. | QA, Dev |
| **11** | [`DEPLOYMENT_DEVOPS.md`](./DEPLOYMENT_DEVOPS.md) | **Déploiement & CI/CD** : Configuration EAS Build pour générer les APK/iOS, variables d'environnement et branches Neon. | DevOps, SysAdmin |
| **12** | [`GITHUB.md`](./GITHUB.md) | **Conventions Git & Contribution** : Structure de branches Git Flow, format des commits conventionnels. | Tous les contributeurs |
| **13** | [`SKILLS_GUIDE.md`](./SKILLS_GUIDE.md) | **Guide des Skills Antigravity** : Mode d'emploi des compétences du projet (`brandkit`, `ui-ux-pro-max`, `neon`, etc.). | Antigravity, Dev |

---

## Principes Directeurs Inviolables du Projet :
1. **100 % Mobile (Android & iOS)** : Développé en React Native (Expo) avec code typé strict TypeScript.
2. **Offline-First strict** : Fonctionne à 100 % sans Internet. La source de vérité immédiate est la base SQLite locale de l'appareil.
3. **Rigueur comptable absolue** :
   * Un crédit/emprunt n'est PAS un revenu (il est imputé aux dettes).
   * Les cagnottes de projets ne réduisent pas les liquidités disponibles sauf si les fonds sont physiquement verrouillés dans un coffre.
   * Aucune opération ne cause d'incohérence silencieuse entre soldes, stocks et budgets.
4. **Design Sobre & Professionnel** : Charte *Forest Ledger* (Vert Forêt `#0B4F3A`, Jaune Ambre `#F59E0B`, Ardoise `#0F172A`, Blanc pur `#FFFFFF`), rayons de 8px, zéro dégradé kitsch.
