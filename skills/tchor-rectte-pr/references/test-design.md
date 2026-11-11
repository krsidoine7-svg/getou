# Concevoir les tests

Public visé : des testeurs non techniques qui suivent le scénario à la lettre. Si une étape
demande de l'interprétation, le test est mal écrit.

## Sommaire
1. Écrire un scénario
2. Écrire un résultat attendu
3. Couverture par fonctionnalité
4. Tests de sécurité à la portée d'un non-technicien
5. Parcours de bout en bout
6. Priorités P1 / P2 / P3
7. Données de test et ordre d'exécution
8. Tests dangereux

## 1. Écrire un scénario

- Une action par étape. Verbe d'action au début : Aller, Saisir, Cliquer, Choisir, Téléverser, Se déconnecter.
- Nomme l'élément exactement comme à l'écran : « Cliquer sur le bouton « Publier l'annonce » ».
- Donne la valeur à saisir : « Saisir awa.kone@exemple.ci dans le champ « E-mail » ».
- Commence par un contexte si besoin : « Pré-requis : être connecté en tant que Vendeur (compte 2 du répertoire). »
- Numérote : 1. ... 2. ... 3. ... dans la même cellule. Le convertisseur Word les met une par ligne.
- Entre 3 et 8 étapes. Au-delà, coupe en deux tests.

Mauvais : « Tester l'inscription avec un e-mail déjà utilisé. »
Bon : « 1. Aller sur /register. 2. Saisir vendeur1@exemple.ci dans « E-mail » (déjà inscrit). 3. Remplir les autres champs avec des valeurs valides. 4. Cliquer sur « Créer mon compte ». »

## 2. Écrire un résultat attendu

Un résultat attendu est vrai ou faux, jamais « à peu près ». Choisis dans cette liste ce qui est
observable :
- le texte exact d'un message (succès ou erreur) ;
- l'URL ou la page affichée ;
- un élément qui apparaît, disparaît, devient grisé ;
- un statut (« En attente », « Payée », « Refusée ») ;
- une donnée visible ailleurs (la ligne apparaît dans la liste, le solde passe de 10 000 à 7 500 FCFA) ;
- un e-mail ou SMS reçu, avec son objet.

Pour un cas d'échec, ajoute ce qui ne doit PAS arriver : « aucune annonce créée », « pas de
redirection », « le mot de passe n'est pas révélé dans le message ».

## 3. Couverture par fonctionnalité

Pour chaque fonctionnalité réellement présente, passe cette grille et écris les tests qui s'appliquent :

| Famille | Questions à se poser | Exemple |
| :--- | :--- | :--- |
| Nominal | Le chemin heureux marche-t-il de bout en bout ? | Créer une annonce valide |
| Échec de saisie | Champs vides, format invalide, doublon, trop long, caractères spéciaux | Téléphone vide, e-mail sans « @ » |
| Limites | Valeur minimum / maximum, taille de fichier, nombre maximum, liste vide, très gros volume | Photo de 6 Mo si la limite est 5 Mo |
| États et transitions | Chaque statut, chaque passage de l'un à l'autre, les transitions interdites | Modifier une commande déjà expédiée |
| Droits | Chaque rôle voit et fait uniquement ce qu'il doit | Client qui ouvre /admin |
| Session | Expiration, déconnexion, retour arrière, deux onglets | Retour arrière après déconnexion |
| Notifications | E-mail, SMS, push : déclenchement, contenu, destinataire | E-mail de confirmation, lien valide |
| Interface | Mobile et desktop, chargement, message vide, message d'erreur lisible | Liste sans résultat : message dédié |
| Accessibilité de base | Navigation au clavier, contraste, libellés des champs | Tab parcourt le formulaire dans l'ordre |
| Conformité | Consentement, suppression/export de données, mentions légales, traçabilité | Case de consentement non précochée |

Un module qui n'a que des cas nominaux est incomplet. Le lint avertit s'il n'y a aucun cas d'échec.

## 4. Tests de sécurité à la portée d'un non-technicien

Pas besoin d'outils : seulement un navigateur.
- Accéder à une URL privée sans être connecté, puis avec le mauvais rôle.
- Changer un identifiant dans l'URL (/commandes/1042 en /commandes/1043) et vérifier qu'on ne voit pas la commande d'un autre.
- Saisir <b>test</b> ou ' OR '1'='1 dans un champ texte : le texte doit s'afficher tel quel ou être refusé, jamais interprété.
- Téléverser un fichier au mauvais format (.exe renommé en .jpg) : refus attendu.
- Se tromper de mot de passe plusieurs fois : le comportement de verrouillage ou de ralentissement attendu.
- Tentative de connexion avec un compte non inscrit ou inexistant en base de données (ex: toto@fika.com ou inconnu@domaine.ci) : rejet strict attendu avec message d'erreur neutre (« Identifiants invalides » ou « Adresse e-mail ou mot de passe incorrect »), aucune session ouverte et enregistrement dans les logs de sécurité. Ce test prouve qu'aucun accès n'est possible sans création préalable en base.
- Après déconnexion, bouton « Précédent » du navigateur : aucune page privée ne se réaffiche.
- Messages d'erreur : ils ne révèlent ni chemin de fichier, ni requête SQL, ni si l'e-mail existe (si le projet le prévoit).

## 5. Parcours de bout en bout

Un parcours traverse plusieurs modules et plusieurs rôles : il attrape les ruptures entre modules,
que les tests isolés ne voient pas. Il vient du Profil Sectoriel (Phase 1B), adapté à ce que le
projet permet réellement. Format : un module dédié « Parcours de bout en bout », chaque test
indique le rôle de chaque étape (« Étape jouée par le Vendeur », « par l'Admin »). Prévois 3 à 6 parcours,
tous en P1.

## 6. Priorités

| Priorité | Critère | Exemples |
| :--- | :--- | :--- |
| P1 | Si ça casse, le produit est inutilisable, de l'argent ou des données sensibles sont en jeu, ou une obligation légale est violée | Connexion, paiement, droits d'accès, consentement, parcours principal |
| P2 | Fonction importante mais contournable | Filtres, édition de profil, notifications secondaires |
| P3 | Confort, cosmétique, cas rares | Tri secondaire, message d'état vide |

Compte indicatif : 25 à 40 % de P1. Si tout est P1, rien ne l'est.

## 7. Données de test et ordre d'exécution

- Données fictives mais réalistes : montants plausibles pour le marché, noms locaux, formats de
  téléphone du pays, produits ou dossiers vraisemblables.
- Ordre naturel dans un module : créer, lire, modifier, supprimer. Chaque test déclare sa précondition.
- Place Authentification en premier : sans connexion, rien d'autre n'est testable.
- Termine par les tests destructifs (suppression, désactivation de compte) pour ne pas bloquer les suivants.

## 8. Tests dangereux

Paiement réel, envoi d'e-mails ou SMS à de vraies personnes, suppression irréversible, import de
masse, tâches planifiées : si l'environnement est la production, écris en tête du test
« À EXÉCUTER UNIQUEMENT EN STAGING » ou donne une alternative sûre (mode sandbox de la passerelle,
adresse e-mail jetable, jeu de données dédié). Si seul le staging existe, ce n'est pas nécessaire.
