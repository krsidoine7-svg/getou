# Format du cahier de recette

Le Markdown suit une structure stricte : scripts/lint_cahier.py la vérifie et
scripts/md_to_docx.py la convertit. S'écarter du format = lint en erreur ou Word cassé.
Point de départ : assets/cahier-template.md.

## Structure du fichier docs/CAHIER-DE-RECETTE.md

    # Cahier de Recette : <Nom de la plateforme>        (ignoré dans Word : la page de garde le remplace)

    ## 1. Informations générales et Contexte Métier
    ## 2. Consignes aux testeurs
    ## 3. Répertoire des comptes de test et Matrice d'habilitations
    ## Module 1 : Authentification et Sécurité d'Accès
    ## Module 2 : <Nom>
    ...
    ## Matrice de couverture
    ## Annexe : Écarts et recommandations sectorielles

Les titres des modules respectent ## Module N : Titre (N entier, séquentiel). Chaque module
démarre sur une nouvelle page dans le Word.

## 1. Informations générales et Contexte Métier

- Tableau d'identité : Plateforme, Entreprise / Promoteur, Secteur d'activité détecté, Environnement (Production / Staging), URL réelle, Version, Date, Périmètre.
- Résumé exécutif du projet : Un court résumé (1 à 2 paragraphes) expliquant la nature de la plateforme, son positionnement, son public cible et sa proposition de valeur sur son marché.

## 2. Consignes aux testeurs (texte à reprendre tel quel, en adaptant les exemples)

- Cocher [ ] OK si le résultat observé correspond au résultat attendu, [ ] NA si le test ne
  s'applique pas ou ne peut pas être exécuté.
- Procédure obligatoire en cas de bug :

> Si une étape échoue ou présente une anomalie :
> 1. Faire une capture d'écran nette de l'écran ou de l'erreur.
> 2. Noter la référence exacte du test (ex. : Module 1 - Test 1.2).
> 3. Consigner l'incident dans le document de suivi BUGS_ET_AMELIORATIONS avec la capture.

- Légende des priorités : P1 critique (bloque la mise en service), P2 important, P3 mineur.
- Un test à effet réel (paiement, envoi) est signalé « À EXÉCUTER UNIQUEMENT EN STAGING ».

## 3. Répertoire des comptes de test et Matrice d'habilitations

Le skill fusionne le répertoire des comptes et la matrice des droits dans un grand tableau d'habilitation exhaustif pour offrir une visibilité immédiate aux testeurs et auditeurs :

| Profil / Rôle | Identifiants de connexion | Droits et Actions autorisées (Ce que ce profil peut faire) |
| :--- | :--- | :--- |
| **Super Administrateur** - Rôle : super_admin - Niveau 8 | Nom : Jean Dupont - E-mail : admin@exemple.com - Pass : AdminSecur123! - Tél : +225 0701020304 | - Créer, modifier, archiver et supprimer tous les biens ou entités - Modérer l'ensemble des annonces et contenus du site - Gérer l'annuaire complet des utilisateurs et attribuer les rôles (/admin/roles) - Consulter le journal d'audit de sécurité immuable (/admin/audit) - Certifier les factures normalisées et reçus - Configurer les passerelles et clés marchandes de paiement - Supprimer définitivement des comptes selon les normes RGPD/APDP - Gérer les sauvegardes et la maintenance de la base de données |
| **Commercial / Agent** - Rôle : agent - Niveau 4 | Nom : Marie Martin - E-mail : agent@exemple.com - Pass : AgentPass2026! - Tél : +225 0501020304 | - Consulter le catalogue des biens attribués et vérifier les disponibilités - Planifier, confirmer et réaliser les visites sur site avec les clients - Gérer et qualifier son portefeuille de prospects et leads commerciaux - Traiter les dossiers administratifs et suivre les réservations d'acomptes - Gérer son agenda de disponibilité et exporter son flux iCal - Restrictions : accès strictement refusé aux fonctions d'administration, pas de modération ni de suppression |
| **Client / Particulier** - Rôle : client - Niveau 2 | Nom : Alain Traoré - E-mail : client@exemple.com - Pass : ClientPass2026! - Tél : +225 0101020304 | - Consulter librement l'ensemble du catalogue des annonces publiques - Utiliser les filtres avancés (recherche, commune, budget) - Enregistrer ses annonces favorites dans son espace personnel - Initier la réservation d'un bien avec règlement sécurisé de l'acompte - Télécharger ses factures et reçus normalisés avec QR code - Demander un créneau de visite sur site - Déposer un avis certifié après visite et signaler des abus - Restrictions : refus d'accès absolu à toutes les sections administratives |

Règles de la matrice d'habilitations :
- Valeurs réelles issues de l'audit du code et de la base de données.
- Liste explicite pour chaque profil : ce qu'il peut lire, écrire, modifier, supprimer ou administrer.
- Mention claire des restrictions (ce à quoi il n'a PAS accès).
- Mot de passe écrit en texte simple sans accents graves. Compte manquant : écrire À FOURNIR.

## Règle de test obligatoire : Le test de compte inexistant (Module 1)

Dans chaque cahier de recette, le Module 1 (Authentification) doit IMPÉRATIVEMENT comporter un test de sécurité vérifiant le rejet d'un compte non créé en base de données :
- Scénario : Saisir une adresse e-mail plausible mais absente de la base (ex: toto@fika.com ou inconnu@domaine.ci) et un mot de passe valide en forme.
- Résultat attendu : Rejet strict et immédiat par le serveur avec le message d'erreur officiel (ex: « Identifiants invalides » ou « Adresse e-mail ou mot de passe incorrect »), aucune session ouverte et traçabilité de l'échec dans le journal de sécurité. Prouve que l'authentification est fermée et sécurisée.

## Un module

    ## Module 3 : Publication d'une annonce

    Pré-requis du module : être connecté en tant que Vendeur (compte 2).

    | N° | Priorité | Intitulé du Test | Scénario pas-à-pas | Résultat attendu | Validation |
    | :--- | :--- | :--- | :--- | :--- | :--- |
    | 3.1 | P1 | ... | 1. ... 2. ... 3. ... | ... | [ ] OK [ ] NA |

    | Nom du Testeur | Date | Commentaires & Remarques |
    | :--- | :--- | :--- |
    | | | |
    | **Décision finale :** | [ ] **Conforme** | [ ] **Non Conforme** |

Règles :
- Colonnes exactement dans cet ordre et avec ces intitulés (le lint accepte les variantes qui commencent par le même mot).
- Étapes numérotées dans la même cellule, séparées par un espace : 1. Aller sur... 2. Saisir...
  (le convertisseur coupe avant chaque « N. » suivi d'une majuscule ou d'un mot).
- Pas de saut de ligne dans une cellule, pas de <br>, pas de HTML.
- Le caractère | dans une cellule s'écrit \|.
- Validation toujours [ ] OK [ ] NA.
- N° : module.séquence, sans trou : 3.1, 3.2, 3.3.
- Tableau de validation de fin de module : obligatoire, sans exception, avec sa ligne vide (hauteur
  d'écriture ajoutée automatiquement dans Word) et la ligne « Décision finale ».

## Matrice de couverture

| Module | Tests | dont P1 | Fonctionnalités couvertes |
| :--- | :--- | :--- | :--- |

Les nombres sont ceux donnés par lint_cahier.py. Une matrice fausse est pire qu'une absente.

## Annexe : Écarts et recommandations sectorielles

Texte et puces uniquement, sans cases à cocher : fonctionnalités habituelles du secteur absentes du
projet, risques réglementaires repérés, améliorations conseillées. Chaque point nomme la fonctionnalité,
pourquoi le secteur l'attend, et le risque de son absence.

## Typographie et style

- Aucun HTML brut (&nbsp;, <br>, balises), aucun emoji, aucun accent grave (backtick) dans tout le document.
- En-têtes de tableau #1E293B avec texte blanc, bordures fines #CBD5E1. Pas d'autres fonds de couleur.
- La couleur de marque ne sert que pour les titres et le filet de la page de garde.
- Pas de procès-verbal ni de formulaire administratif en fin de document.
- Français simple, phrases courtes, termes du métier.

## Fichier de métadonnées docs/recette-meta.json

    {
      "title": "Cahier de Recette",
      "platform": "Nom officiel de la plateforme",
      "environment": "Staging",
      "url": "https://...",
      "version": "1.0",
      "date": "25/10/2026",
      "author": "Nom du rédacteur",
      "logo": "chemin/vers/logo.png",
      "primary_color": "#1E293B",
      "accent_color": "#1E293B"
    }

logo : PNG ou JPG (Word ne lit pas le SVG). primary_color : couleur de marque extraite par
extract_brand.py, utilisée pour les titres.

## Sortie Word

- Paysage A4, marges 1,5 cm, Calibri 10.
- Page de garde (logo, titre, plateforme, environnement, URL, version, date).
- En-tête (plateforme, version) et pied de page (environnement, URL, page X / Y).
- Lignes de tableau insécables, en-tête de tableau répété à chaque page.
- Cases à cocher ☐ lisibles à l'impression.

## Document BUGS_ET_AMELIORATIONS.docx

Généré par scripts/make_bugs_doc.py : titre, consigne de remplissage, légende des sévérités,
tableau de lignes vierges (N°, Réf. du test, Module, Description, Étapes pour reproduire,
Attendu / Obtenu, Type et sévérité à cocher, Capture d'écran en grande cellule, Statut).

## Rapport d'audit docs/AUDIT-RECETTE.md

Utiliser assets/audit-template.md. C'est le document de la Phase 2 : il garde la trace des
sources qui justifient le cahier. Il n'est pas converti en Word sauf demande.
