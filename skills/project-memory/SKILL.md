---
name: project-memory
description: Protocole de gestion de la double mémoire ARTISA (Raw Inbox vs Structured Brain). Utilisez ce skill pour capturer toutes les interactions brutes et distiller la connaissance dans la mémoire structurée.
---

# 🧠 Skill de Gestion de la Double Mémoire ARTISA

Ce skill définit la procédure standard pour capitaliser la mémoire du projet ARTISA sans jamais perdre aucune interaction.

## 1. Structure de la Mémoire
- `MEMORY/01_RAW_INBOX/` : Mémoire brute ("poubelle d'entrée sans filtre"). Tout ce que dit l'utilisateur, les vocaux transcrits et les prompts y sont consignés.
- `MEMORY/02_STRUCTURED_BRAIN/` : Mémoire structurée (Wiki indexé). Connaissances organisées, architecture, schémas SQL, spécifications de fonctionnalités, design system et playbooks.

## 2. Règles Opératoires pour l'Agent
1. **À chaque nouveau brief vocal ou prompt complexe :**
   - Transcrire et ajouter l'entrée dans `MEMORY/01_RAW_INBOX/audio_transcripts/` ou `raw_prompts/`.
2. **À chaque tâche terminée :**
   - Rédiger la fiche de synthèse dans le sous-dossier approprié de `02_STRUCTURED_BRAIN/`.
   - Mettre à jour la table des matières dans `MEMORY/02_STRUCTURED_BRAIN/INDEX.md`.
3. **Maintien de la Source Unique :**
   - Synchroniser le journal des décisions dans `FICHIER_PROJET.md`.
