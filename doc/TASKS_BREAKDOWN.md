# Découpage Chirurgical des Tâches et Micro-Tâches — GERETOU
**Structure de Réalisation par Module, Tâche et Micro-Tâche Unitaire avec Critères d'Acceptation**

---

## Règle de Développement Antigravity Non Négociable :
> **Chaque micro-tâche doit être complète, autonome et testable**.
> * Il est formellement interdit de livrer un composant avec des boutons inactifs ou un code fantôme (`TODO`).
> * Tout bouton créé doit posséder son style (*Forest Ledger*), ses états tactiles (`pressed`, `disabled`), son libellé et l'action réelle associée connectée à l'état ou à la base de données locale.

---

## MODULE 0 : Socle Technique, Sécurité & Design System

### Tâche 0.1 : Initialisation & Configuration de l'Application
* **Micro-tâche 0.1.1** : Initialisation du squelette Expo avec TypeScript strict (`expo init / create-expo-app`) et configuration de `tsconfig.json` avec alias de chemins (`@/components`, `@/services`, `@/hooks`, `@/types`).
* **Micro-tâche 0.1.2** : Configuration de Tailwind CSS / NativeWind avec les tokens *Forest Ledger* (Vert Forêt `#0B4F3A`, Jaune Ambre `#F59E0B`, Ardoise `#0F172A`, Blanc pur `#FFFFFF`).
* **Micro-tâche 0.1.3** : Importation de la typographie *Plus Jakarta Sans* et configuration des variantes de graisse (400, 500, 600, 700, 800) et des chiffres tabulaires (`tabular-nums`).

### Tâche 0.2 : Base de Données Embarquée SQLite & SecureStore
* **Micro-tâche 0.2.1** : Initialisation du driver `expo-sqlite` avec singleton de connexion et gestion des migrations de schéma automatiques.
* **Micro-tâche 0.2.2** : Création du script d'initialisation DDL créant l'ensemble des 12 tables relationnelles avec contraintes d'intégrité et clés étrangères.
* **Micro-tâche 0.2.3** : Configuration de `expo-secure-store` pour le stockage chiffré des clés de chiffrement de la base et du sel bcrypt.

### Tâche 0.3 : Module d'Authentification (PIN & Biométrie)
* **Micro-tâche 0.3.1** : Créer le composant `PinKeypad` avec touches tactiles réactives (retour haptique, sans persistance visuelle) et affichage des pastilles masquées.
* **Micro-tâche 0.3.2** : Créer le service `AuthService` avec fonction de hachage fort (bcrypt) pour stocker et vérifier le code PIN.
* **Micro-tâche 0.3.3** : Intégrer l'authentification biométrique (`expo-local-authentication`) avec bascule automatique vers le PIN en cas d'échec.
* **Micro-tâche 0.3.4** : Implémenter le minuteur de temporisation de session (verrouillage automatique après 3 minutes d'inactivité en arrière-plan).

---

## MODULE 1 : Cœur Financier (Saisie des Dépenses & Recettes)

### Tâche 1.1 : Composant Saisie Montant Hero (HeroAmountKeypad)
* **Micro-tâche 1.1.1** : Développer le composant d'affichage `AmountDisplay` formaté automatiquement en FCFA (`font-extrabold`, format monétaire espace insécable `15 000 FCFA`).
* **Micro-tâche 1.1.2** : Développer la rangée de puces raccourcis tactiles (`+1 000`, `+5 000`, `+10 000`, `+25 000 FCFA`) qui incrémentent instantanément le montant actif.
* **Micro-tâche 1.1.3** : Développer le bouton d'effacement / correction avec confirmation d'effacement total sur appui long.

### Tâche 1.2 : Sélecteur de Portefeuille Source (AccountSelector)
* **Micro-tâche 1.2.1** : Développer la carte `AccountPill` avec logo du service (Wave, MoMo, Orange Money, Cash), libellé et solde en direct.
* **Micro-tâche 1.2.2** : Gérer la sélection unique avec contour vert forêt actif (2px) et coche d'état.

### Tâche 1.3 : Grille des Catégories & Tags
* **Micro-tâche 1.3.1** : Créer le composant `CategoryGrid` en 2 colonnes avec tuiles iconiques pour les catégories principales (*Alimentation*, *Transport*, *Logement*, *Factures*, *Santé*, *Loisirs*, *Imprévus*).
* **Micro-tâche 1.3.2** : Développer la tuile `+ Nouvelle Catégorie` avec modale de création immédiate (nom, icône, couleur) enregistrée en SQLite.
* **Micro-tâche 1.3.3** : Développer la barre de tags dynamiques avec suggestions existantes et création à la volée.

### Tâche 1.4 : Enregistrement des Dépenses & Intégrité Locale
* **Micro-tâche 1.4.1** : Développer le bouton sticky `SubmitExpenseButton` calculant et affichant le total dynamique.
* **Micro-tâche 1.4.2** : Développer le service de mutation SQLite sous transaction :
  * Insertion dans `transactions`.
  * Décrémentation du solde du compte sélectionné.
  * Recalcul des cumuls budgétaires du jour et du mois.
  * Ajout de l'événement dans `sync_queue`.
* **Micro-tâche 1.4.3** : Ajouter le feedback visuel (Toast de confirmation) et redirection vers le Tableau de Bord.

### Tâche 1.5 : Formulaire d'Entrée d'Argent & Règle Comptable
* **Micro-tâche 1.5.1** : Développer l'écran `NouveauRevenuScreen` avec commutateur segmenté *Dépense / Revenu*.
* **Micro-tâche 1.5.2** : Développer la grille de sélection obligatoire de provenance (*Salaire*, *Freelance*, *Don*, *Vente*, *Crédit/Emprunt*).
* **Micro-tâche 1.5.3** : Implémenter la règle comptable stricte :
  * Si *Crédit/Emprunt* est sélectionné $\rightarrow$ affichage du bandeau ambre explicatif et routage de la somme vers la table `debts_credits` (Dette).
  * Si revenu d'activité $\rightarrow$ alimentation du revenu net disponible.
* **Micro-tâche 1.5.4** : Ajouter l'option d'affectation automatique d'épargne vers un projet (ex: 15 % vers le coffre Wave).

---

## MODULE 2 : Multi-Comptes & Mobile Money Spécifique

### Tâche 2.1 : Gestion des Comptes et Sous-Comptes
* **Micro-tâche 2.1.1** : Développer la vue consolidée affichant le patrimoine total liquide, l'argent immédiatement disponible et l'argent verrouillé/épargné.
* **Micro-tâche 2.1.2** : Développer le composant de carte Wave avec prise en charge du **Coffre Wave** (sous-compte avec icône de cadenas).
* **Micro-tâche 2.1.3** : Développer le composant de carte MTN MoMo avec prise en charge du sous-compte **MoMo Épargne**.
* **Micro-tâche 2.1.4** : Permettre l'archivage sécurisé d'un compte sans supprimer son historique de transactions passées.

### Tâche 2.2 : Virement Interne Neutre (InternalTransferModal)
* **Micro-tâche 2.2.1** : Développer la modale de transfert interne avec sélecteur de compte débité et compte crédité.
* **Micro-tâche 2.2.2** : Implémenter la logique de transaction neutre : débit du compte A et crédit du compte B sans création de transaction de type Dépense ou Revenu dans les statistiques budgétaires.
* **Micro-tâche 2.2.3** : Prise en charge des frais de transfert éventuels imputés séparément en catégorie *Frais & commissions*.

---

## MODULE 3 : Budgets & Alertes Hors-Ligne

### Tâche 3.1 : Moteur de Calcul Budgétaire en Temps Réel
* **Micro-tâche 3.1.1** : Développer le service de calcul `BudgetCalculationService` qui évalue à chaque dépense : total dépensé aujourd'hui, total dépensé ce mois, budget restant et pourcentage de consommation.
* **Micro-tâche 3.1.2** : Développer le composant de jauge visuelle animée avec transitions chromatiques : vert (< 80 %), jaune ambre (80 % - 99 %), rouge ($\ge$ 100 %).

### Tâche 3.2 : Notifications Push Locales Hors-Ligne
* **Micro-tâche 3.2.1** : Configurer `expo-notifications` avec permissions locales sans dépendance à un serveur push distant.
* **Micro-tâche 3.2.2** : Déclencher les alertes locales push en arrière-plan dès le franchissement du seuil de 80 % ou de 100 %.
* **Micro-tâche 3.2.3** : Gérer le clic sur la notification pour ouvrir directement l'écran de détails du budget concerné.

---

## MODULE 4 : Stocks Domestiques & Courses

### Tâche 4.1 : Gestion des Consommables
* **Micro-tâche 4.1.1** : Créer l'écran `StocksScreen` avec liste des produits, quantités, unités de mesure (kg, L, paquet, morceau) et seuil d'alerte critique.
* **Micro-tâche 4.1.2** : Développer le calcul automatique de statut : `OK` (vert), `Stock bas` (ambre), `Rupture` (rouge).
* **Micro-tâche 4.1.3** : Développer le stepper de modification rapide `[-]` `[+]` de quantité avec mise à jour SQLite instantanée.

### Tâche 4.2 : Liste de Courses Automatique & Réapprovisionnement
* **Micro-tâche 4.2.1** : Développer l'algorithme d'extraction automatique des articles en rupture ou stock bas dans l'onglet `Liste de Courses`.
* **Micro-tâche 4.2.2** : Développer l'estimation budgétaire totale du panier de courses en FCFA.
* **Micro-tâche 4.2.3** : Développer l'action de réapprovisionnement en un clic (articles cochés $\rightarrow$ génération de la dépense globale dans le compte choisi + réincrémentation des stocks).

---

## MODULE 5 : Dettes, Créances & Projets d'Épargne

### Tâche 5.1 : Créances & Dettes
* **Micro-tâche 5.1.1** : Créer l'écran `DettesCreancesScreen` avec double onglet *Créances (on vous doit)* et *Dettes (vous devez)* et balance nette.
* **Micro-tâche 5.1.2** : Développer le modal d'encaissement d'un remboursement partiel avec mise à jour du reste dû.
* **Micro-tâche 5.1.3** : Développer le bouton d'action rapide pour relancer par message WhatsApp / SMS pré-rempli.

### Tâche 5.2 : Projets d'Achat & Cagnottes Dédiées
* **Micro-tâche 5.2.1** : Créer l'écran `ProjetsEpargneScreen` avec cartes d'objectifs (montant cible, date cible, montant déjà réservé dans un coffre).
* **Micro-tâche 5.2.2** : Règle comptable : s'assurer que seul l'argent physiquement bloqué dans le coffre réduit le solde disponible affiché sur le tableau de bord.
* **Micro-tâche 5.2.3** : Calculer et afficher la recommandation de versement périodique (ex: *"Mettez de côté 25 000 FCFA/semaine pour finaliser avant le 30 Juin"*).

---

## MODULE 6 : Analyses, Exports & Synchronisation Cloud Neon

### Tâche 6.1 : Analyses Financières & Diagnostics
* **Micro-tâche 6.1.1** : Intégrer les graphiques de tendances de dépenses sur 7 jours et 30 jours (courbe ou barres sans surcharge visuelle).
* **Micro-tâche 6.1.2** : Intégrer le Donut chart de répartition des dépenses par catégorie.
* **Micro-tâche 6.1.3** : Développer le générateur de bilan automatique de fin de mois avec diagnostic textuel de santé financière.

### Tâche 6.2 : Moteur d'Export de Données
* **Micro-tâche 6.2.1** : Développer le générateur de rapport PDF imprimable avec mise en page sobre et en-tête officiel.
* **Micro-tâche 6.2.2** : Développer l'export Excel (.xlsx) et CSV via `expo-file-system` et `expo-sharing`.

### Tâche 6.3 : Moteur de Synchronisation Cloud Neon (PostgreSQL)
* **Micro-tâche 6.3.1** : Développer la file d'attente locale `sync_queue` enregistrant chaque mutation (INSERT, UPDATE, DELETE).
* **Micro-tâche 6.3.2** : Développer le service de détection réseau (`@react-native-community/netinfo`) déclenchant la réplication en arrière-plan.
* **Micro-tâche 6.3.3** : Implémenter l'algorithme de résolution de conflits (Last-Write-Wins avec horodatage logique vectoriel).
