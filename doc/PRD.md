# Product Requirement Document (PRD) — GERETOU (Gère-Tout)
**Application Mobile de Gestion Financière & Domestique Quotidienne**
*Architecture Offline-First Native pour Android & iOS*

---

## 1. Vision et Objectifs Stratégiques

### 1.1 Contexte & Problématique
Dans les contextes d'Afrique de l'Ouest et Centrale (et plus largement les pays émergents), la majorité des ménages et micro-entrepreneurs gèrent leurs flux financiers à travers une combinaison complexe :
* De multiples portefeuilles de **Mobile Money** (Wave avec ses Coffres, MTN MoMo avec son compte Épargne, Orange Money).
* Des paiements et réserves en **Espèces (Cash physique)**.
* Des comptes bancaires traditionnels.
* Des flux domestiques imbriqués : approvisionnement du foyer (riz, huile, savon), factures récurrentes (électricité, eau, internet), prêts informels (créances accordées aux proches, dettes contractées) et cagnottes de projets.

Les applications actuelles de gestion de budget souffrent de trois défauts majeurs :
1. **Dépendance réseau fatale** : Elles imposent une connexion Internet permanente, rendant la saisie impossible sur les marchés ou en zone blanche.
2. **Inadéquation aux flux réels** : Elles ignorent les subtilités du Mobile Money (les coffres Wave, l'épargne MoMo, les virements internes qui ne sont ni des dépenses ni des revenus).
3. **Faiblesses comptables** : Elles confondent emprunt et revenu, ou déduisent des budgets prévisionnels de projets de l'argent non encore bloqué.

### 1.2 La Vision GERETOU
**GERETOU** est une application **100 % Mobile Native (Android & iOS)**, autonome, rigoureuse et ultra-rapide. Le site web SaaS est formellement exclu du périmètre pour concentrer tous les efforts sur une expérience mobile native irréprochable.
Elle est conçue pour :
* Offrir une latence de 0 ms pour la saisie quotidienne (en 3 clics).
* Fonctionner à 100 % sans Internet avec synchronisation Cloud Neon (PostgreSQL) différée et transparente.
* Gérer le foyer de façon intégrée : finances, stocks consommables, liste de courses et engagements réciproques.

---

## 2. Personas Cibles

### Persona 1 : Alex, Cadre / Freelance dynamique (Abidjan)
* **Profil** : Reçoit son salaire ou ses factures freelance sur Wave et son compte bancaire. Doit ventiler son argent entre son loyer, l'aide à la famille, son épargne pour acheter un ordinateur et les dépenses courantes.
* **Besoin clé** : Savoir en direct combien il peut dépenser aujourd'hui sans mettre en danger son loyer de fin de mois.

### Persona 2 : Aminata, Gestionnaire du foyer & Commerçante
* **Profil** : Gère les dépenses d'alimentation de la maison, les réserves de riz et d'huile, les tontines et les avances faites aux voisins.
* **Besoin clé** : Ne jamais tomber en rupture de provisions au foyer et avoir une liste de courses automatique, tout en sachant exactement qui lui doit de l'argent.

---

## 3. Exigences Fonctionnelles Détaillées

### Module 1 : Saisie & Suivi des Dépenses (Fast 3-Click Entry)
* **REQ-1.1** : Saisie en 3 clics maximum : Montant $\rightarrow$ Catégorie $\rightarrow$ Validation.
* **REQ-1.2** : Pavé numérique tactile à grand affichage avec puces raccourcis (`+1 000`, `+5 000`, `+10 000`, `+25 000 FCFA`).
* **REQ-1.3** : Typologie stricte :
  * *Régulière* : Loyer, Internet, abonnements.
  * *Imprévue* : Panne, urgence santé, dépannage.
  * *Remboursable* : Avance pour un collègue ou un proche (crée automatiquement un suivi de créance).
* **REQ-1.4** : Horodatage précis (date et heure exacte) et capture de reçus / tickets de caisse photo.

### Module 2 : Entrées d'Argent & Règles Comptables
* **REQ-2.1** : Choix obligatoire de la provenance :
  * *Salaire / Prestation / Don / Vente* $\rightarrow$ Crédite le Revenu Net Réel.
  * *Crédit / Emprunt* $\rightarrow$ **RÈGLE STRICTE** : Est automatiquement imputé dans le module des Dettes à rembourser, n'augmente jamais le revenu d'exploitation.
* **REQ-2.2** : Allocation optionnelle automatique vers un projet d'épargne (ex: 15 % du gain vers le Coffre Wave).

### Module 3 : Multi-Comptes & Mobile Money Spécifique
* **REQ-3.1** : Prise en charge native des comptes : Wave, MTN MoMo, Orange Money, Banques, Espèces.
* **REQ-3.2** : Prise en charge des **Coffres Wave** (sous-comptes verrouillés).
* **REQ-3.3** : Prise en charge des comptes **MoMo Épargne** et des transferts programmés.
* **REQ-3.4** : **Virement Interne Neutre** : Permet de transférer des fonds d'un compte à l'autre sans fausser les agrégats de dépenses ou de recettes.
* **REQ-3.5** : Consolidation : Trésorerie immédiatement disponible vs Argent réservé / épargné.
* **REQ-3.6** : **Règle de Suppression de Compte** :
  * Si `solde > 0` : **Blocage strict et obligatoire**. L'application refuse la suppression et exige un virement préalable de tout le solde vers un autre compte.
  * Si `solde == 0` : **Soft Delete** (`is_archived: 1`). Le compte disparaît de la vue active mais toutes les transactions passées restent historisées sans risque d'incohérence.

### Module 4 : Budgets & Alertes en Temps Réel
* **REQ-4.1** : Définition de plafonds mensuels et journaliers (globaux et par catégorie).
* **REQ-4.2** : Calcul en temps réel : dépenses du jour, dépenses du mois, restant disponible, % de consommation.
* **REQ-4.3** : Alertes locales : Alerte de seuil (80 % ou 85 %) et alerte de dépassement immédiat, fonctionnant application fermée et téléphone hors-ligne.

### Module 5 : Stocks Domestiques & Liste de Courses
* **REQ-5.1** : Fiche produit : nom, catégorie, quantité restante, unité (kg, L, pièce), seuil d'alerte.
* **REQ-5.2** : Statuts automatiques : `OK` (> seuil), `Stock bas` ($\le$ seuil), `Rupture` (0).
* **REQ-5.3** : Génération en un clic de la liste de courses valorisée avec les articles en rupture ou stock bas.

### Module 6 : Dettes, Créances & Remboursements
* **REQ-6.1** : Créances (ce qu'on vous doit) avec historique des remboursements partiels et échéance promise.
* **REQ-6.2** : Dettes (ce que vous devez) avec échéancier de remboursement.
* **REQ-6.3** : **Bouton de Relance WhatsApp Direct** : Un simple clic ouvre l'application WhatsApp native avec un message pré-rempli personnalisé (*« Bonjour [Nom], petit rappel concernant notre solde de [Montant] FCFA... »*) via deep link `wa.me`, sans coût d'API.

### Module 7 : Projets d'Achat & Épargne Dédiée
* **REQ-7.1** : Création d'objectifs avec montant cible et date souhaitée.
* **REQ-7.2** : **Règle d'intégrité** : Le montant prévisionnel ne réduit PAS le solde courant ; seul l'argent physiquement bloqué dans un coffre dédié est déduit du disponible.

### Module 8 : Analyses, Rapports & Exports
* **REQ-8.1** : Graphiques financiers (évolution 7j, 30j, répartition circulaire par catégorie).
* **REQ-8.2** : Bilan mensuel automatique de diagnostic financier.
* **REQ-8.3** : Export complet des données au format PDF, Excel (.xlsx) et CSV.

---

## 4. Exigences Non-Fonctionnelles

| Critère | Exigence | Mesure de vérification |
|:---|:---|:---|
| **Performance** | Latence de saisie et de consultation < 50 ms en local | Profiler React Native / SQLite |
| **Disponibilité** | Fonctionnement hors-ligne à 100 % | Test en mode avion |
| **Sécurité** | Protection par code PIN / biométrie, hachage bcrypt, données sensibles chiffrées | Audit de sécurité local |
| **Intégrité comptable** | Zéro incohérence lors de la suppression ou modification d'une transaction | Audit log & transactions ACID SQLite |
| **Ergonomie** | Thème *Forest Ledger* professionnel, bords nets (8px), contraste élevé WCAG AA | Audit UI / Lighthouse |
