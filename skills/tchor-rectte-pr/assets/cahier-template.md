# Cahier de Recette : À RENSEIGNER (nom de la plateforme)

## 1. Informations générales et Contexte Métier

| Élément | Valeur |
| :--- | :--- |
| Plateforme | À RENSEIGNER |
| Entreprise / Organisation | À RENSEIGNER |
| Secteur d'activité | À RENSEIGNER |
| Environnement | À RENSEIGNER (Production ou Staging) |
| URL | À RENSEIGNER (URL réelle, pas localhost) |
| Version testée | À RENSEIGNER |
| Périmètre | À RENSEIGNER |

### Résumé exécutif du projet
À RENSEIGNER (Synthèse de la plateforme, public cible, cas d'usage principaux et proposition de valeur).

## 2. Consignes aux testeurs

- Suivre les étapes dans l'ordre, sans en sauter. Cocher [ ] OK si le résultat observé correspond au résultat attendu, [ ] NA si le test ne s'applique pas ou ne peut pas être exécuté.
- Légende des priorités : **P1** critique (bloque la mise en service), **P2** important, **P3** mineur.
- Les tests marqués « À EXÉCUTER UNIQUEMENT EN STAGING » ont un effet réel (paiement, envoi, suppression) : ne pas les lancer en production.

**Procédure obligatoire en cas de bug :**

> Si une étape échoue ou présente une anomalie :
> 1. Faire une capture d'écran nette de l'écran ou de l'erreur.
> 2. Noter la référence exacte du test (ex. : Module 1 - Test 1.2).
> 3. Consigner l'incident dans le document de suivi BUGS_ET_AMELIORATIONS avec la capture.

## 3. Répertoire des comptes de test et Matrice d'habilitations

| Profil / Rôle | Identifiants de connexion | Droits et Actions autorisées (Ce que ce profil peut faire) |
| :--- | :--- | :--- |
| **Administrateur Général** - Rôle : admin - Niveau 7 | Nom : À RENSEIGNER - E-mail : À RENSEIGNER - Pass : À RENSEIGNER - Tél : À RENSEIGNER | - Créer, modifier, archiver et supprimer les produits ou biens - Consulter et modérer toutes les publications - Gérer les comptes utilisateurs et attribuer les rôles - Accéder au journal d'audit de sécurité - Configurer les paramètres généraux et passerelles de paiement - Restrictions : pas de suppression définitive de la base sans accord Super Admin. |
| **Gestionnaire / Opérateur** - Rôle : agent - Niveau 4 | Nom : À RENSEIGNER - E-mail : À RENSEIGNER - Pass : À RENSEIGNER - Tél : À RENSEIGNER | - Consulter le catalogue des articles ou dossiers attribués - Traiter les commandes, leads et dossiers clients - Planifier et réaliser les rendez-vous ou visites sur site - Mettre à jour les statuts d'avancement - Restrictions : pas de modération globale, pas d'accès aux réglages système ni aux rôles. |
| **Client / Utilisateur** - Rôle : client - Niveau 2 | Nom : À RENSEIGNER - E-mail : À RENSEIGNER - Pass : À RENSEIGNER - Tél : À RENSEIGNER | - Consulter le catalogue public et effectuer des recherches - Gérer son profil personnel et ses favoris - Créer une commande ou réservation avec paiement sécurisé - Déposer un avis vérifié et signaler un dysfonctionnement - Restrictions : refus d'accès absolu à toute interface d'administration. |

## Module 1 : Authentification et Sécurité d'Accès

Pré-requis du module : Disposer d'un navigateur web à jour et des identifiants répertoriés ci-dessus.

| N° | Priorité | Intitulé du Test | Scénario pas-à-pas | Résultat attendu | Validation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1.1 | P1 | Connexion réussie profil autorisé | 1. Aller sur À RENSEIGNER (/login) 2. Saisir l'adresse e-mail autorisée 3. Saisir le mot de passe associé 4. Cliquer sur « Se connecter » | Connexion immédiate et redirection automatique vers le tableau de bord autorisé du rôle. | [ ] OK [ ] NA |
| 1.2 | P1 | Rejet de connexion compte inexistant en base | 1. Aller sur À RENSEIGNER (/login) 2. Saisir une adresse e-mail non inscrite en base (ex. toto@fika.com ou test.inconnu@domaine.ci) 3. Saisir un mot de passe quelconque 4. Valider | Rejet immédiat par le serveur avec affichage du message « Identifiants invalides » ou « Adresse e-mail ou mot de passe incorrect », aucune session ouverte, traçabilité dans l'audit. | [ ] OK [ ] NA |
| 1.3 | P1 | Échec avec mot de passe erroné sur compte existant | 1. Aller sur À RENSEIGNER (/login) 2. Saisir un e-mail existant 3. Saisir un mot de passe erroné 4. Valider | Rejet strict avec message d'erreur neutre sans révéler l'existence du compte. | [ ] OK [ ] NA |

| Nom du Testeur | Date | Commentaires & Remarques |
| :--- | :--- | :--- |
| | | |
| **Décision finale :** | [ ] **Conforme** | [ ] **Non Conforme** |

## Matrice de couverture

| Module | Tests | dont P1 | Fonctionnalités couvertes |
| :--- | :--- | :--- | :--- |
| Module 1 : Authentification | À RENSEIGNER | À RENSEIGNER | À RENSEIGNER |

## Annexe : Écarts et recommandations sectorielles

- À RENSEIGNER : fonctionnalité habituelle du secteur absente du projet, pourquoi le secteur l'attend, risque de son absence.
