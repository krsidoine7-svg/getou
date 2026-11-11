# Éviter le contenu générique

Un cahier de recette générique est pire qu'inutile : il donne une impression de couverture
sans rien vérifier. Un testeur qui lit « Vérifier que la page s'affiche correctement » ne sait
ni où aller, ni quoi regarder, ni quand dire KO. Ce fichier décrit comment reconnaître et
éliminer ce contenu, dans le cahier comme dans tes messages à l'utilisateur.

## Le test du caviardage

Pour chaque test, remplace mentalement le nom du projet par celui d'un autre. Si le test reste
valable mot pour mot, il est générique : réécris-le avec ce que seul CE projet contient.

| Générique (à bannir) | Spécifique (attendu) |
| :--- | :--- |
| Se connecter avec un compte valide. Le tableau de bord s'affiche correctement. | 1. Aller sur /login. 2. Saisir vendeur1@exemple.ci et le mot de passe du répertoire. 3. Cliquer sur « Se connecter ». Résultat : redirection vers /vendeur/tableau-de-bord, le menu affiche « Mes annonces », « Mes ventes », « Mon solde ». |
| Tester la création d'un produit. | Créer l'annonce « Samsung A15 128 Go » à 95 000 FCFA avec 3 photos JPG. Résultat : statut « En attente de modération » visible dans « Mes annonces », e-mail « Votre annonce est en cours de vérification » reçu. |
| Vérifier la gestion des erreurs. | Laisser le champ « Téléphone » vide et cliquer sur « Publier ». Résultat : le message « Le numéro de téléphone est obligatoire » apparaît sous le champ, l'annonce n'est pas créée. |
| Vérifier la sécurité des accès. | Connecté en tant que vendeur, coller l'URL /admin/utilisateurs. Résultat : redirection vers /403 ou message « Accès refusé », aucune donnée d'utilisateur visible. |

(Exemples d'un projet fictif, pour illustrer le niveau de précision. Les valeurs réelles viennent toujours de l'audit.)

## Les cinq exigences

1. **Chaque scénario contient au moins un élément propre au projet** : libellé exact d'un bouton ou
   d'un champ, URL réelle, valeur de test, nom d'un compte. Le lint le vérifie (scénarios sans
   guillemets, chemin, e-mail ou valeur = avertissement).
2. **Chaque résultat attendu est observable.** Il dit ce que l'œil voit : texte exact d'un message,
   URL après redirection, élément qui apparaît ou disparaît, statut affiché, e-mail reçu avec son objet.
   Cherche le texte exact dans le code (fichiers de traduction, composants, validations). Si le message
   n'existe pas dans le code, écris-le tel que l'utilisateur doit le voir et ajoute-le aux
   « zones d'ombre » plutôt que de l'inventer silencieusement.
3. **Chaque test se rattache à une source.** Dans docs/AUDIT-RECETTE.md, un tableau relie chaque
   module à ses fichiers, routes ou écrans. Un test sans source est suspect : soit il est générique,
   soit il teste quelque chose qui n'existe pas.
4. **Le savoir sectoriel est relié à une fonctionnalité réelle.** « Respecter la réglementation du
   secteur » ne veut rien dire. « Vérifier que la case de consentement n'est pas précochée à
   l'inscription (/register) » veut dire quelque chose. Une exigence du secteur qui n'a aucun
   point d'ancrage dans le projet va dans l'annexe « Écarts », pas dans les tests.
5. **Aucun copier-coller entre modules.** Si deux modules ont le même test avec les mêmes mots,
   l'un des deux n'a pas été pensé. Un test d'accès refusé pour le vendeur n'est pas celui du
   modérateur : les pages, les messages et les données diffèrent.

## Formules interdites (le lint les repère)

- « fonctionne correctement », « s'affiche correctement », « comme prévu », « comme attendu »,
  « sans problème », « de manière appropriée », « bon fonctionnement », « etc. »
- « Vérifier que tout fonctionne », « Tester la fonctionnalité X » sans dire comment.
- Toute étape qui dit quoi vérifier sans dire où cliquer et quoi saisir.

Remplace par : le message exact, l'URL exacte, le statut exact, le montant exact, le nombre exact.

## Dans tes messages à l'utilisateur

- Pas d'introduction qui reformule la demande, pas de conclusion qui récapitule ce qui vient d'être dit.
- Pas d'adjectifs de vente (« complet », « robuste », « professionnel ») : montre les chiffres
  (« 6 modules, 74 tests dont 21 P1, 3 comptes manquants »).
- Les zones d'ombre sont dites franchement, avec la question précise à poser.
- Un point bloquant est un point bloquant, pas une « opportunité d'amélioration ».

## Quand l'information manque

Trois réponses honnêtes, jamais une quatrième :
1. Tu la trouves en lisant mieux le code.
2. Tu la demandes (groupée avec les autres questions, avec des choix proposés).
3. Tu écris « NON TROUVÉ » ou « À FOURNIR » et tu continues le reste. Le lint remontera ces mentions
   comme points bloquants.

Ne comble jamais un trou avec une valeur plausible : un faux mot de passe ou un faux message
d'erreur fait perdre du temps à des testeurs qui n'ont aucun moyen de savoir que c'est inventé.
