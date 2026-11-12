# Plan d'intégration des écrans Stitch — GERETOU

Source : projet Stitch « GERETOU - Gestion Financière & Domestique » (`3428900423629395909`), 33 écrans.

**Règle :** une micro-tâche = un livrable qui fonctionne (bouton relié à une vraie action, données en SQLite), vérifié par `pnpm typecheck` + `pnpm test` avant de passer à la suivante. Une case cochée = faite et vérifiée.

Légende : ✅ fait · 🟡 existe partiellement · ⬜ à faire

---

## Étape 0 — Socle de navigation
- [x] 0.1 Store de navigation (`useNavStore` : écran courant + pile retour) qui remplace le `useState` de `App.tsx`
- [x] 0.2 Barre d'onglets basse (Accueil · Portefeuilles · Budgets · Stocks · Plus) reliée au store
- [x] 0.3 Écran « Plus » listant les modules secondaires (Dettes, Projets, Agenda, Analyses, Notifications, Réglages, Corbeille)

## Sécurité (corrigé)
- [x] S.1 Hachage du PIN : PBKDF2-SHA256 + sel aléatoire par utilisateur + secret dans le SecureStore (`src/services/auth/pinSecurity.ts`)
- [x] S.2 Migration automatique des anciens PIN au premier déverrouillage réussi
- [x] S.3 Blocage progressif (30 s → 1 h) au lieu d'un blocage définitif, avec compte à rebours sur `LockScreen`
- [x] S.4 Identifiants et secrets générés par un générateur aléatoire cryptographique (`expo-crypto`)

## Étape 1 — Démarrage (3 écrans)
| # | Écran Stitch | État |
|---|---|---|
| 1 | Écran de Démarrage (Splash Screen) | ✅ `SplashScreen` |
| 2 | Découverte & Premier Lancement | ✅ `OnboardingScreen` |
| 3 | Bienvenue & Inscription | ➡️ déplacé en étape 2.1 (c'est le formulaire d'inscription) |

- [x] 1.1 `SplashScreen` au design Stitch, progression réelle de l'initialisation + message d'erreur si la base ne s'ouvre pas
- [x] 1.2 `OnboardingScreen` : 3 pages (glisser / pagination / « Suivant »), bouton « Passer »
- [x] 1.3 Drapeau `onboarding_done` persistant → l'onboarding ne s'affiche qu'une fois
- [x] 1.4 Bouton « J'ai déjà un coffre / Connexion » sur l'onboarding → page de connexion (3.6)

> Textes Stitch non repris car faux à ce jour : « base chiffrée AES-256 », « SecurEngine™ », « Conforme UEMOA & CEMAC », statistiques fictives (« 18 denrées », « 3 cercles »).

## Étape 2 — Inscription & PIN (6 écrans)
| # | Écran Stitch | État |
|---|---|---|
| 4 | Inscription & Création de Compte | ✅ `RegisterScreen` (+ « Bienvenue & Inscription ») |
| 5 | Inscription [Dark Mode] | ⬜ → étape 3.4 (thème sombre) |
| 10 | Définition du Code PIN Sécurisé | ✅ `PinSetupScreen` (état « définir ») |
| 11 | Confirmation du Code PIN | ✅ `PinSetupScreen` (état « confirmer ») |
| 12 | Erreur Code PIN Non Concordant | ✅ `PinSetupScreen` (état « erreur ») |
| 15 | Reconnaissance Biométrique en Cours | ✅ `BiometricSheet` (inscription + déverrouillage) |

- [x] 2.1 `RegisterScreen` : nom/pseudo (colonne `display_name` + migration), e-mail, soldes de départ, devise FCFA, case d'acceptation, validations
- [x] 2.2 Définition du PIN : pavé Stitch, aperçu 1 s, refus des codes faibles (`pinRules.ts`, testé)
- [x] 2.3 Confirmation du PIN
- [x] 2.4 Erreur non concordante : secousse + haptique, 3 essais puis retour à « définir »
- [x] 2.5 Biométrie : interrupteur + vérification réelle avant activation, panneau `BiometricSheet` — empreinte digitale **validée par l'utilisateur sur téléphone (11/11)**
- [x] 2.6 Création du compte en fin de parcours, nom affiché sur l'accueil, l'écran de verrouillage et « Plus »

> Non repris de Stitch : téléphone, « mot de passe maître » (l'app fonctionne au PIN), PIN 6 chiffres, « phrase de récupération 12 mots », « Continuer sans compte », mentions AES-256 / UEMOA.

## Étape 3 — Verrouillage, connexion Google & sauvegarde Drive
Décisions (11/11/2026) : l'app s'utilise entièrement sans compte ; Google n'est demandé qu'au moment de synchroniser ; sauvegarde dans Google Drive avec un bouton « Synchroniser » ;
sur un nouveau téléphone, se connecter avec le même compte restaure tout ; PIN oublié = se reconnecter avec le même Gmail
puis redéfinir le PIN. Mode sombre : reporté.

| # | Écran Stitch | État |
|---|---|---|
| 13 | Déverrouillage Quotidien (PIN & Biométrie) | ✅ `LockScreen` au design Stitch |
| 6 | Connexion au Compte | ✅ `LoginScreen` (3.6) |
| 8 | Connexion & Synchronisation Google | ✅ `LoginScreen` (3.6) |
| 32 | Synchronisation & Sauvegarde Google Drive | ✅ `BackupScreen` (3.5) |
| 9 | Récupération de Compte & Mot de Passe Oublié | ⬜ → reconnexion Google (3.8) |
| 5, 7, 14 | Écrans [Dark Mode] | ⏸ reporté |

- [x] 3.1 `LockScreen` au design Stitch : salutation, bouton biométrie, pavé avec touche Biométrie, compte à rebours de blocage
- [x] 3.2 Format de sauvegarde : export / import de toute la base, sans le hash du PIN (`backupFormat.ts`, 5 tests)
- [x] 3.3 Client Google Drive `appDataFolder` : rechercher / envoyer / remplacer / télécharger (`driveClient.ts`, 5 tests)
- [x] 3.4 Connexion Google (OAuth web, scope `drive.appdata`, `useGoogleSignIn`) — identifiant Web configuré dans `.env.local` ; la page Google s'ouvre sans erreur. Connexion réelle **validée par l'utilisateur (11/11)**. Android / iOS : identifiants à créer avec la version de développement
- [x] 3.5 Écran « Sauvegarde & Synchronisation » (`BackupScreen`, menu Plus) : connexion, « Synchroniser maintenant », dernière synchro, restauration sur le même téléphone, déconnexion — envoi réel vers Drive **validé par l'utilisateur (11/11)**
- [x] 3.6 Page de connexion (`LoginScreen`) : depuis l'onboarding (« J'ai déjà un coffre ») et l'inscription (« Déjà un compte ? Se connecter ») ; « Créer un coffre » pré-remplit l'e-mail Google si aucune sauvegarde
- [x] 3.7 Restauration sur un nouveau téléphone (`LoginFlow`) : sauvegarde trouvée → résumé → nouveau PIN → restauration en une transaction → accueil — **à tester par l'utilisateur avec son compte**
- [x] 3.10 Utilisation sans compte : inscription réduite à nom + soldes facultatifs, profil invité interne (`identity.ts`, testé) ; le compte Google est rattaché au profil à la première connexion depuis « Sauvegarde »
- [ ] 3.11 Modifier son nom et ses soldes de départ après coup (Réglages / Portefeuilles)
- [ ] 3.8 « Code PIN oublié » : reconnexion avec le même compte Google → redéfinir le PIN
- [ ] 3.9 Synchronisation automatique (après chaque modification, si connecté et en ligne)

> Limite connue v1 : une seule sauvegarde, la plus récente remplace la précédente (pas de fusion si deux téléphones modifient en même temps).

## Étape 4 — Cœur financier (3 écrans)
| # | Écran Stitch | État |
|---|---|---|
| 17 | Accueil & Tableau de Bord | ✅ `DashboardScreen` (au design Stitch) |
| 18 | Nouvelle Dépense (Saisie Rapide) | ✅ `NouvelleDepenseScreen` (au design Stitch) |
| 19 | Nouveau Revenu / Gain | ✅ `NouveauRevenuScreen` (au design Stitch) |

- [x] 4.1a Accueil au design Stitch (`DashboardScreen`) : solde disponible + actions, carte Sauvegarde Drive (Sync réel), comptes en cartes (coffres regroupés), créances / dettes réelles, dernières opérations (compte + date relative), FAB — calculs dans `dashboardData.ts` (testé). Non repris : « +12 % ce mois ». Suivi budgétaire ajouté avec l'étape 6. Bouton Transfert ajouté avec l'étape 5
- [x] 4.1b Nouvelle Dépense au design Stitch : montant saisissable + raccourcis (`AmountCard`), motif, compte source (`AccountSelector`), catégories avec précision + création (`CategoryGrid`), typologie (régulière / imprévue / remboursable) et importance enregistrées en base. Non repris : tags, reconnaissance vocale, reçu photo
- [x] 4.1c Nouveau Revenu au design Stitch : montant, origine & motif, provenance (emprunt = dette), note comptable, compte de destination. Non repris : date d'encaissement modifiable, affectation à un projet d'épargne (étape 9)
- [x] 4.2 Historique : afficher le nom de la catégorie / provenance au lieu de « Dépense courante » et du code brut « LOAN »
- [x] 4.3 Bandeau emprunt : `**Dette à rembourser**` s'affiche avec les astérisques (le Markdown n'est pas interprété)
- [x] 4.4 Messages de validation (montant nul, catégorie manquante) via `Alert.alert` : invisibles sur le web → erreurs dans l'écran + bandeau de confirmation (`ToastHost`)

> Corrigé en passant : catégories jamais chargées (`"BOTH"` entre guillemets doubles refusé par SQLite) ; retour à l'accueil après enregistrement bloqué sur le web.

## Étape 5 — Portefeuilles (1 écran)
| 20 | Portefeuilles & Mobile Money | ✅ `WalletsScreen` |
- [x] 5.1 Liste des comptes (`WalletsScreen`, onglet Portefeuilles) : coffres / épargnes rattachés à leur compte principal (`groupAccountsWithChildren`, testé)
- [x] 5.2 Totaux : patrimoine, immédiat, réservé / épargne
- [x] 5.3 Ajouter un compte (`AddAccountModal`) : opérateur, courant / coffre / épargne, nom proposé, solde de départ
- [x] 5.4 Virement interne neutre (`TransferModal` + `transferCore.ts`, 6 tests) : atomique, hors statistiques, frais en dépense « Frais & commissions », refus si solde insuffisant ; accessible aussi depuis l'accueil (bouton Transfert)
- [x] 5.5 Clôturer un compte : transfert du solde puis archivage, historique conservé (alertes remplacées par messages + bandeau)

> Non repris : numéros de téléphone, historique par compte, dépôt / retrait, « Wave vers MoMo direct ».

## Étape 6 — Budgets (1 écran)
| 21 | Budgets & Plafonds en direct | ✅ `BudgetsScreen` |
- [x] 6.1 Moteur de calcul (`budgetCalc.ts`, 6 tests) : périodes jour / mois en heure locale, dépensé / reste / %, statut sain → seuil → imminent (95 %) → dépassé, montant conseillé par jour ; lecture des dépenses réelles (`budgetRepo.ts`, 5 tests sur SQLite : virements et revenus exclus)
- [x] 6.2 Écran `BudgetsScreen` au design Stitch : bandeau du plafond le plus critique (« Ajuster le plafond »), budget mensuel global, plafond journalier, plafonds par catégorie avec jauges vert / ambre / orange / rouge
- [x] 6.3 Créer / modifier / supprimer un plafond (`BudgetEditorModal`) : global ou catégorie, jour ou mois, seuil 80 / 85 / 90 % ; un seul plafond par couple catégorie / période
- [x] 6.4 Carte « Suivi budgétaire en direct » sur l'accueil (ou invitation à fixer un budget)

> Notifications de dépassement : ajoutées avec l'étape 8.

## Étape 7 — Agenda & échéances (3 écrans)
| 26 | Agenda & Échéancier Financier | ✅ `AgendaScreen` |
| 27 | Nouvelle Deadline & Récurrence | ✅ `DeadlineEditorModal` |
| 28 | Alerte Échéance (24h avant) | ✅ `DeadlineAlertScreen` |
- [x] 7.1 Table `deadlines` (type, date, heure, récurrence, jour d'ancrage, compte prévu, importance, rappel) (la tontine a été retirée ensuite à la demande du client) ; incluse dans la sauvegarde Drive (sans l'id de notification)
- [x] 7.2 `DeadlineEditorModal` : montant, intitulé, type, raccourcis de date (Demain, Dans 3 j, Fin de mois, Le 5 prochain), heure, rappel (jour J / veille / 3 j avant), récurrence avec règle lisible, compte prévu, importance
- [x] 7.3 `AgendaScreen` : semaine avec points, total sous 7 jours, filtres par type, sections En retard / Urgent (48 h) / À venir
- [x] 7.4 Rappel local programmé (`expo-notifications`), annulé / reprogrammé à chaque modification, règlement ou report — **à tester sur téléphone** (non disponible dans le navigateur)
- [x] 7.5 `DeadlineAlertScreen` (ouvert depuis l'agenda ou en touchant le rappel) : compte à rebours, comptes avec « manque X F », Régler (dépense + débit + occurrence suivante), Déjà réglé, Repousser 24 h
- Calculs : `deadlineCore.ts` (7 tests) et `deadlineRepo.ts` (7 tests sur SQLite)

> Non repris : provision automatique en coffre, rappels de stocks (étape 10), solde prévisionnel, échéances de prêt (étape 9), compteur / n° de facture.
> À faire : reprogrammer les rappels après une restauration de sauvegarde sur un nouveau téléphone.

## Étape 8 — Notifications (2 écrans)
| 29 | Notifications Push & Centre d'Alertes | ✅ `NotificationSettingsScreen` |
| 30 | Historique des Alertes & Notifications | ✅ `NotificationsScreen` |
- [x] 8.1 Table `alerts` (clé anti-doublon, lu / résolu, purge à 90 jours, incluse dans la sauvegarde) ; alertes émises : plafond franchi puis dépassé (une fois par période), échéance dont l'heure de rappel est passée (résolue au paiement), sauvegarde Drive réussie — `alertCore.ts` (7 tests) et `alertRepo.ts` (4 tests sur SQLite)
- [x] 8.2 `NotificationsScreen` (cloche de l'accueil, avec nombre de non lues) : sections Aujourd'hui / Cette semaine / Plus ancien, actions Régler, Ajuster le plafond, Ignorer, tout marquer lu
- [x] 8.3 Filtres par type (Échéances, Budgets, Sauvegardes) et par état (Non lues, Action requise, Résolues)
- [x] 8.4 `NotificationSettingsScreen` : autorisation, choix par type, masquer les montants, aperçu écran verrouillé, notification de test ; notification immédiate au franchissement d'un plafond — **notifications à tester sur téléphone**

> Non repris : modes sonores (discret / vibreur), bilan quotidien à 20 h, alertes de stocks (étape 10).

## Étape 9 — Dettes & Projets (3 écrans)
| 23 | Dettes, Créances & Engagements | ✅ `DebtsScreen` |
| 24 | Projets & Épargne Dédiée | ✅ `ProjectsScreen` |
| 25 | Projets d'Achat & Épargne Dédiée | ✅ fusionné avec 24 |
- [x] 9.1 `DebtsScreen` : solde net, créances / dettes / soldées, progression, échéance (urgent ≤ 5 j, en retard)
- [x] 9.2 Nouvel engagement (`DebtEditorModal`) : créance ou dette, téléphone, motif, échéance, compte de sortie / d'arrivée ou « déjà existant »
- [x] 9.3 Encaissement / versement partiel (`MoneyActionModal`), dépassement du reste dû refusé, « sans compte suivi » possible
- [x] 9.4 Relance WhatsApp / SMS avec message prérempli (numéro ivoirien normalisé)
- [x] 9.5 `ProjectsScreen` (les 2 maquettes projets réunies) : épargne dédiée totale, onglets, progression, coffre, date cible
- [x] 9.6 Créer un projet (`ProjectEditorModal`) avec coffre dédié ou existant ; alimenter / retirer = virements neutres ; objectif atteint automatique ; abandon
- [x] 9.7 Conseil d'épargne (montant par semaine / par mois) + « Verser maintenant »
- Règle comptable : prêter, emprunter, rembourser ou épargner n'est ni une dépense ni un revenu (transactions TRANSFER, provenance DEBT_IN / DEBT_OUT). Tests : `debtCore` + `projectCore` (6), `debtRepo` + `projectRepo` sur SQLite (5)

> Non repris : onglet « Avances », historique de cercle, prélèvement automatique, rappel hebdo d'épargne.

## Étape 10 — Stocks (1 écran)
| 31 | Stocks Domestiques & Courses | ✅ `StocksScreen` |
- [x] 10.1 Liste des stocks + statut OK / bas / rupture (`stockCore.ts`, jauges de niveau, filtres par statut et catégorie)
- [x] 10.2 Stepper − / + persistant (`adjustQuantity`, pas adapté par unité : 0,5 pour kg/L, 1 pour morceaux/boîtes)
- [x] 10.3 Ajouter et modifier un produit (`StockEditorModal`, seuil d'alerte, cible, prix habituel)
- [x] 10.4 Onglet liste de courses auto + total estimé (`shoppingList`, `basketTotal`, badge du nombre de produits à acheter)
- [x] 10.5 Réapprovisionner → dépense + remise en stock (`RestockModal`, `restockBasket`, débit de compte, répartition comptable exacte Alimentation/Maison dans `transactions`)
- Tests : `stockCore.test.mjs` (8 tests) et `stockRepo.test.mjs` (4 tests sur SQLite)

## Étape 11 — Analyses (1 écran)
| 22 | Analyses & Graphiques Financiers | ✅ `AnalyticsScreen` |
- [x] 11.1 Agrégats 7 j / 30 j / 3 mois / année (`analyticsCore.ts`, calculs purs, exclusion des virements neutres, timeline journalière et mensuelle)
- [x] 11.2 Graphique barres (`BarChart.tsx`, react-native-svg, repère de moyenne journalière, détection des pics de dépenses)
- [x] 11.3 Donut par catégorie (`DonutChart.tsx`, react-native-svg, tranches chromatiques, montant central et liste détaillée avec pourcentages)
- [x] 11.4 Diagnostic textuel du mois (`generateFinancialDiagnostic`, IA locale SQLite évaluant l'épargne nette, les plafonds de budget et les conseils d'action)
- Tests : `analyticsCore.test.mjs` (3 tests) et `analyticsRepo.test.mjs` (1 test d'intégration sur SQLite)

## Étape 12 — Réglages, données & corbeille (4 écrans)
| 16 | Réglages Sécurité & Biométrie | ✅ `SettingsScreen` |
| 8 | Connexion & Synchronisation Google | ✅ `LoginScreen` (étape 3) |
| 32 | Synchronisation & Sauvegarde Google Drive | ✅ `BackupScreen` (étape 3) |
| 33 | Corbeille & Restauration | ✅ `TrashScreen` |
- [x] 12.1 Réglages sécurité : changer PIN (`ChangePinModal`), biométrie on/off avec test capteur, modification nom/pseudo, verrouillage immédiat
- [x] 12.2 Suppression douce (`deleted_at`, `is_deleted = 1`) des transactions avec réajustement inverse du solde
- [x] 12.3 Corbeille : lister, restaurer (redébit/recrédit fidèle avec contrôle de solde), suppression définitive et vider la corbeille
- [x] 12.4 Sauvegarde locale : export JSON de la base dans `backupFormat.ts` et `BackupScreen`
- [x] 12.5 Google (connexion + Drive) : OAuth Google Drive `appDataFolder` fonctionnel et testé
- Tests : `trashRepo.test.mjs` (4 tests d'intégration SQLite) et suite complète de 129 tests passants
