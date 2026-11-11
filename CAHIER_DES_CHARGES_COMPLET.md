

# GERETOU (Gère-Tout) — Spécifications Complètes du Projet
**Application Mobile Native (Android & iOS) — Architecture Offline-First**

---

## 1. Vision et Objectif du Projet

**GERETOU** est une application mobile autonome pour Android et iOS destinée à la gestion financière personnelle et domestique quotidienne, au suivi des dépenses, des revenus, de l'épargne multi-comptes (notamment Mobile Money : Wave, MTN MoMo, Orange Money), des stocks et des projets futurs.

### Principes directeurs non négociables :
1. **100 % Mobile (Android & iOS)** : Développé en React Native (Expo).
2. **Offline-First strict** : Fonctionne à 100 % sans aucune connexion Internet (saisie immédiate, calculs en temps réel, notifications locales même si l'application est fermée).
3. **Synchronisation Cloud Neon (PostgreSQL)** : Sauvegarde et synchronisation automatique en arrière-plan dès le retour d'une connexion réseau.
4. **Rigueur comptable absolue** :
   - Un crédit/emprunt n'est PAS un revenu (c'est une dette comptabilisée à part).
   - Les budgets prévisionnels de projets ne réduisent pas le solde disponible (seul l'argent physiquement réservé/bloqué l'est).
   - Aucune suppression de transaction ne doit causer d'incohérence silencieuse entre soldes, stocks et budgets.
5. **Design System & Identité Visuelle** :
   - Couleurs primaires fortes : **Vert forêt, Jaune or/ambre, Blanc pur**.
   - Style pro, épuré, premium : bords nets (pas d'arrondis excessifs), zéro dégradé flou/kitsch, aucun contenu générique d'IA.

---

## 2. Synthèse Détaillée des Fonctionnalités par Module

### Module 1 : Saisie et Suivi des Dépenses
* Saisie ultra-rapide (en 3 clics).
* Montant et horodatage automatique précis (date et heure exacte de la transaction).
* "À quoi ça a servi" : description claire et détaillée.
* Catégorisation & Tags :
  * Catégories paramétrables (Alimentation, Transport, Santé, Logement, Factures, etc.).
  * Tags dynamiques : possibilité de réutiliser un tag existant ou d'en créer un nouveau à la volée.
* Niveau d'urgence : Faible, Normal, Important, Urgent.
* Typologie de la dépense :
  * **Régulière / Récurrente** : Loyer, Internet, forfaits, abonnements.
  * **Imprévue** : Dépense non planifiée (santé, réparation, urgence).
  * **Remboursable** : Argent avancé pour un proche ou pour une activité professionnelle (suivi des remboursements reçus).
* Compte ou moyen de paiement source (Espèces, Wave, Orange Money, MoMo, Banque...).
* Pièces jointes : capture ou ajout de photos de reçus, tickets de caisse, justificatifs.
* Modification, annulation ou suppression sécurisée avec journal d'audit (historique des modifications).
* Règle d'intégrité : toute modification/suppression met à jour les soldes, budgets et stocks liés sans incohérence.

### Module 2 : Entrées d'Argent et Gains
* Saisie rapide du montant et de la date.
* Demande obligatoire de la provenance de l'argent :
  * Salaire
  * Prestation / Freelance / Travail
  * Don / Cadeau
  * Vente d'un bien
  * Crédit / Emprunt
  * Autre
* **RÈGLE COMPTABLE** : Le crédit/emprunt est automatiquement enregistré dans le module des **Dettes** à rembourser et n'augmente pas artificiellement les statistiques de revenus réels.
* Sélection du compte/coffre récepteur.

### Module 3 : Multi-Comptes, Mobile Money & Épargne
* Création illimitée de comptes personnalisés avec nom, type et photo/logo personnalisé (Wave, Orange Money, MTN MoMo, Espèces, Comptes bancaires, Coffre physique).
* Solde initial paramétrable et solde actuel recalculé en temps réel à chaque transaction.
* Historique complet des mouvements pour chaque compte.
* Archivage d'un compte sans perdre l'historique des opérations passées.
* Transferts internes entre comptes (virement d'un compte à un autre sans fausser les dépenses ni les revenus).
* **Gestion spécifique Wave** :
  * Prise en charge des **Coffres Wave** (sous-comptes internes).
  * Possibilité de choisir si une dépense ou un gain s'effectue sur le compte principal Wave ou sur un coffre dédié.
* **Gestion spécifique MTN MoMo** :
  * Gestion du compte principal MoMo vs compte épargne MoMo.
  * Configuration de transferts automatiques programmés (versements réguliers vers le compte épargne).
* Vue consolidée : Argent immédiatement disponible vs Argent réservé / épargné.

### Module 4 : Dettes, Créances et Avances
* **Créances (Sommes qu'on vous doit)** :
  * Personne concernée, montant prêté, date, échéance promise, remboursements partiels reçus, statut (en cours, solde).
* **Dettes (Sommes que vous devez rembourser)** :
  * Créancier, montant emprunté, échéancier de remboursement, solde restant à payer.
* **Dépenses remboursables** :
  * Suivi des avances faites pour des tiers jusqu'à remboursement effectif.

### Module 5 : Budgets & Calculs en Temps Réel
* Définition d'un budget global mensuel et d'un budget journalier.
* Définition de budgets par catégorie (ex: Alimentation 50 000 F, Transport 20 000 F, Internet 15 000 F, etc.).
* Recalcul automatique et immédiat à chaque nouvelle dépense :
  * Dépenses totales du jour en direct.
  * Dépenses totales du mois en cours.
  * Budget restant disponible.
  * Taux de consommation du budget (%).
* Alertes automatiques de seuil :
  * Proche de la limite (alerte dès 80 % atteint par défaut).
  * Dépassement immédiat du budget journalier ou mensuel.

### Module 6 : Gestion des Stocks Domestiques & Liste de Courses
* Suivi des produits consommables du foyer (Alimentation, Hygiène, Entretien, Boissons...).
* Fiche produit : Nom, catégorie/tags, quantité actuelle, unité (kg, litre, pièce, paquet), seuil d'alerte minimum.
* Calcul automatique du statut :
  * **OK** : Stock suffisant (> seuil minimum).
  * **Stock bas** : Quantité ≤ seuil d'alerte.
  * **Rupture** : Quantité = 0.
* Génération automatique de la liste de courses ("À acheter") listant immédiatement les produits en rupture ou stock bas.
* Liaison avec les dépenses : réapprovisionnement lors d'un achat.

### Module 7 : Projets d'Achat & Épargne Dédiée
* Fiche projet complète :
  * Titre du projet.
  * Description et détails.
  * Montant estimé nécessaire.
  * Date cible / souhaitée.
  * Niveau de priorité.
  * Tags / Catégories.
  * Montant déjà économisé / réservé.
  * Compte ou coffre assigné à la réserve.
  * Statut : Idée, Planifié, En cours, Réalisé, Abandonné.
* **RÈGLE STRICTE** : Le montant projeté ne réduit PAS le solde courant ; seul l'argent physiquement réservé/bloqué est déduit des disponibilités.
* Notifications et alertes de suivi à l'approche de la date d'échéance ou lors de l'atteinte de l'objectif.

### Module 8 : Alertes & Notifications Locales (Hors-ligne et appli fermée)
* Moteur de notifications push locales déclenchées directement par le téléphone, **sans besoin d'Internet** :
  * Notification en cas de dépassement du budget du jour ou du mois.
  * Notification d'avertissement de budget presque atteint.
  * Notification de stock bas ou rupture.
  * Notification d'échéance de facture ou de dépense récurrente à venir.
  * Notification d'objectif d'épargne atteint.
  * Notification d'échéance d'un projet.
* Rappels personnels programmables manuellement :
  * Rappel de payer Internet / Eau / Électricité.
  * Rappel d'acheter du riz / savon / courses.
  * Rappel de mettre de l'argent de côté (ex: 20 000 FCFA).
  * Rappel de vérifier les dépenses de la semaine.

### Module 9 : Moteur Offline-First & Synchronisation Cloud
* Base de données embarquée SQLite dans l'application :
  * Latence 0 ms.
  * Aucune interruption en cas d'absence de réseau ou de connexion instable.
  * Les calculs de solde, de budget et les alertes se font localement.
* Synchronisation bidirectionnelle avec Neon (PostgreSQL) :
  * File d'attente locale (`sync_queue`).
  * Détection automatique du retour du réseau pour envoi et récupération des données.
  * Indicateur visuel clair de l'état de synchronisation (En ligne, Hors-ligne, Synchronisé, En attente).

### Module 10 : Dashboard, Visualisations & Rapports
* Vue d'ensemble en temps réel (KPIs) :
  * Solde total disponible.
  * Répartition des soldes par compte.
  * Dépenses du jour et dépenses du mois.
  * Budget restant disponible.
  * Total de l'argent réservé / épargné.
  * Total des dettes et des créances.
* Graphiques financiers complets :
  * Évolution des dépenses sur 7 jours, 30 jours, 3 mois et 12 mois.
  * Comparaison revenus vs dépenses.
  * Répartition des dépenses par catégorie (graphique circulaire).
  * Répartition des soldes par compte.
  * Évolution de l'épargne dans le temps.
  * Comparatif inter-mensuel des dépenses.
* Calendrier financier : visualisation des entrées et sorties planifiées.
* Bilan automatique de fin de mois pour analyser son comportement financier.

### Module 11 : Recherche Globale, Filtres & Tris
* Moteur de recherche globale instantanée dans tout l'historique.
* Filtres combinés :
  * Période (Aujourd'hui, 7 jours, ce mois, plage de dates).
  * Compte source (Wave, Orange, MoMo, Espèces...).
  * Catégorie et tags.
  * Niveau d'urgence.
  * Nature (Prévue, Imprévue, Remboursable, Récurrente).
* Tris par date, montant, urgence ou alphabétique.

### Module 12 : Sécurité, Sauvegarde & Exports
* Authentification sécurisée sur l'application (code PIN / biométrie empreinte / mot de passe).
* Hachage fort des mots de passe (bcrypt).
* Chiffrement des données sensibles stockées en local.
* Exports des données :
  * Format PDF (bilan propre et imprimable).
  * Format Excel (.xlsx).
  * Format CSV.
* Sauvegarde et Restauration :
  * Sauvegarde automatique dans le Cloud Neon.
  * Export manuel complet (fichier de sauvegarde JSON).
  * Restauration intégrale depuis une sauvegarde.

---

## 3. Charte Graphique & UI (Design System Mobile)

* **Couleurs primaires et fortes** :
  * **Vert Forêt / Émeraude** (`#0B4F3A` / `#007A55`) : Couleur d'ancrage, stabilité, solde positif, actions principales.
  * **Jaune Ambré / Or** (`#F59E0B` / `#D97706`) : Alertes budget, épargne, projets, indicateurs d'attention.
  * **Blanc Pur & Gris Ardoise** (`#FFFFFF` / `#0F172A` / `#F8FAFC`) : Clarté, contraste élevé, fond net et lisible.
* **Directives d'Ergonomie** :
  * Rayons de courbure maîtrisés (`rounded-md`, 6 à 8px) : look moderne et professionnel, sans effet "bulle de savon" trop arrondi.
  * Bordures fines et nettes (1px) pour délimiter les cartes et listes.
  * Aucune ombre floue démesurée, aucun dégradé kitsch.
  * Contenu textuel soigné, concis et professionnel (zéro texte générique d'IA).

---

## 4. Outils de Test et Simulation

1. **Test direct sur Smartphone** : Application gratuite **Expo Go** (Android Play Store / iOS App Store) via scan de QR code avec mise à jour en direct (Hot Reload).
2. **Simulation sur PC** : Visualisation responsive dans le navigateur Chrome/Edge via touche `F12` (émulation écran tactile smartphone).
3. **Émulateur Android virtuel** : Via Android Studio (AVD) si besoin d'une émulation complète sur PC Windows.

