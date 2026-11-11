# Profils sectoriels

Connaissance de métier à mobiliser **après** avoir identifié le secteur et audité le projet.
Pour chaque secteur : ce qu'un produit sérieux propose, les parcours de bout en bout, les cas
réels qui cassent les produits, la conformité et les risques prioritaires.

Rappel : ces listes servent à **mieux tester ce qui existe** et à **signaler ce qui manque**
(annexe d'écarts). Une fonctionnalité absente du projet ne devient jamais un test.
Vérifie les textes de loi en vigueur (recherche web) avant de les citer ; ce qui suit est un
guide, pas une source juridique.

## Sommaire
- Contexte régional (Afrique de l'Ouest francophone) et conformité transversale
- E-commerce
- Marketplace / petites annonces
- Fintech / paiement / crédit
- Santé
- Éducation
- Immobilier
- Transport / livraison
- Réservation / tourisme
- Administration / services publics
- SaaS B2B
- RH / recrutement
- Restauration / livraison de repas
- Média / contenu
- ONG / dons
- Agriculture
- Secteur non listé

## Contexte régional et conformité transversale

- **Données personnelles** : RGPD si des résidents de l'UE sont concernés. En Côte d'Ivoire : loi
  n° 2013-450 relative à la protection des données à caractère personnel, autorité ARTCI
  (déclaration ou autorisation de certains traitements). Autres pays : autorité nationale équivalente.
  Tests typiques : information et consentement à l'inscription, droit d'accès/rectification/suppression,
  durée de conservation, cookies.
- **Paiement par carte** : PCI-DSS (les numéros de carte ne doivent jamais transiter ni être stockés
  hors passerelle certifiée).
- **Mobile money et monnaie** : Orange Money, MTN MoMo, Moov Money, Wave dans l'espace UEMOA,
  FCFA sans décimales en pratique. Tester : paiement abandonné, délai de confirmation, notification
  de callback reçue deux fois, montant arrondi, numéro d'un autre opérateur.
- **Contexte d'usage** : connexions mobiles instables, téléphones d'entrée de gamme, coupures en cours
  de paiement, formats de numéro +225 07 XX XX XX XX, accents et noms à particules.
- **Accessibilité** : WCAG 2.1 AA comme référence raisonnable ; tests de base au clavier et contraste.

## E-commerce

- **Fonctions attendues** : catalogue et recherche, variantes (taille, couleur), stock en temps réel,
  panier persistant, codes promo, calcul des frais de livraison, plusieurs moyens de paiement,
  facture, suivi de commande, retours et remboursements, compte client, e-mails transactionnels.
- **Parcours** : visiteur → recherche → fiche produit → panier → compte → paiement → confirmation →
  suivi → retour. Gestionnaire : ajout produit → stock → commande reçue → expédition.
- **Cas réels** : dernier article acheté par deux clients en même temps ; promo expirée dans le
  panier ; prix modifié entre panier et paiement ; paiement débité sans confirmation ; adresse hors
  zone ; panier d'un visiteur fusionné à la connexion ; commande annulée après expédition.
- **Risques P1** : paiement, stock, prix et totaux, données de livraison, accès aux commandes d'autrui.

## Marketplace / petites annonces

- **Fonctions attendues** : inscription vendeur/acheteur, publication avec photos, modération avant
  publication, signalement d'annonce, messagerie ou contact, favoris, recherche géolocalisée ou par
  catégorie, boosts ou abonnements payants, avis, commissions, versement au vendeur, litiges.
- **Parcours** : vendeur publie → modérateur valide → acheteur contacte/achète → paiement → livraison →
  avis → versement ; ou : annonce signalée → modérateur retire → vendeur notifié.
- **Cas réels** : annonce refusée puis modifiée et soumise de nouveau ; vendeur suspendu avec annonces en
  ligne ; doublon d'annonce ; photos trop lourdes ; coordonnées échangées pour contourner la plateforme ;
  acheteur qui conteste ; remboursement partiel.
- **Risques P1** : fraude, usurpation de vendeur, contournement de modération, séquestre et versements.

## Fintech / paiement / crédit

- **Fonctions attendues** : inscription et KYC (pièce, selfie, justificatif), plafonds par niveau,
  dépôt, retrait, transfert, historique, reçus, frais affichés avant validation, code PIN ou OTP,
  gel de compte, simulation de prêt, échéancier, remboursements, relances, export.
- **Parcours** : inscription → KYC validé → dépôt → transfert → retrait ; demande de prêt → étude →
  accord → décaissement → remboursements → clôture.
- **Cas réels** : double clic sur « Valider » ; coupure réseau pendant le transfert ; OTP expiré ;
  plafond atteint ; montant 0 ou négatif ; frais mal arrondis ; remboursement en retard ; solde
  insuffisant pendant un prélèvement ; document KYC illisible.
- **Risques P1** : montants, idempotence des transactions, plafonds, KYC, traçabilité, accès aux
  comptes d'autrui. Conformité financière locale (BCEAO / autorité de régulation) : à vérifier.

## Santé

- **Fonctions attendues** : comptes patient / praticien / administrateur, prise de rendez-vous,
  dossier patient, consultation, ordonnance, résultats, rappels, paiement, téléconsultation,
  consentement, journal d'accès.
- **Parcours** : patient prend rendez-vous → rappel → consultation → ordonnance → paiement →
  accès au dossier ; praticien consulte uniquement ses patients.
- **Cas réels** : rendez-vous sur un créneau pris en même temps ; annulation tardive ; patient
  homonyme ; changement de praticien ; accès d'un praticien à un dossier non attribué ; document
  médical téléversé au mauvais format.
- **Risques P1** : confidentialité des données de santé, cloisonnement par rôle, traçabilité des
  accès, exactitude des ordonnances et des dosages.

## Éducation

- **Fonctions attendues** : inscription, classes/cours, enseignants, notes, moyennes, bulletins,
  emploi du temps, présences, paiement de scolarité, messagerie parents, contenus pédagogiques, quiz.
- **Parcours** : inscription → affectation en classe → saisie des notes → calcul des moyennes → bulletin
  → consultation par le parent ; paiement des frais → reçu.
- **Cas réels** : coefficients différents par matière ; note absente vs note zéro ; élève qui change de
  classe en cours d'année ; période verrouillée ; parent avec plusieurs enfants ; arrondi des moyennes.
- **Risques P1** : exactitude des calculs, droits élève/parent/enseignant, données de mineurs.

## Immobilier

- **Fonctions attendues** : annonces de biens (vente, location), photos, localisation, filtres (prix,
  surface, chambres), demande de visite, favoris et alertes, espace agence ou propriétaire, gestion des
  loyers et quittances si gestion locative.
- **Parcours** : agence publie un bien → modération → visiteur filtre et contacte → visite programmée ;
  locataire paie son loyer → quittance.
- **Cas réels** : bien vendu mais toujours affiché ; prix modifié ; photos trop lourdes ; adresse
  masquée ; loyer partiel ; changement de propriétaire.
- **Risques P1** : fausses annonces, paiements, exposition de données de propriétaires.

## Transport / livraison

- **Fonctions attendues** : commande de course ou de livraison, estimation du tarif, affectation du
  chauffeur, suivi sur carte, statuts, preuve de livraison, paiement, évaluation, historique,
  espace chauffeur (disponibilité, gains), back-office.
- **Parcours** : client commande → affectation → prise en charge → livraison → preuve → paiement →
  note ; chauffeur : connexion → disponibilité → course → gains.
- **Cas réels** : annulation après prise en charge ; chauffeur qui n'accepte pas ; adresse imprécise ;
  perte de réseau ; tarif de nuit ou en cas de forte demande ; colis refusé ; paiement à la livraison.
- **Risques P1** : tarification, géolocalisation, affectation, paiement et reversements.

## Réservation / tourisme

- **Fonctions attendues** : disponibilités en temps réel, tarifs par période, panier de réservation,
  acompte, politique d'annulation, confirmation, voucher/billet, espace prestataire, avis.
- **Cas réels** : double réservation du même créneau ; fuseaux horaires ; annulation dans le délai
  gratuit vs hors délai ; changement de dates ; surbooking ; paiement partiel.
- **Risques P1** : disponibilité, paiement, remboursements, exactitude des dates.

## Administration / services publics

- **Fonctions attendues** : dépôt de demande, téléversement de pièces, suivi de dossier, circuit de
  validation par étapes, notifications, délais légaux, documents délivrés (attestation, acte), signature,
  archivage, accès par agent selon son service.
- **Cas réels** : pièce manquante ou illisible ; dossier renvoyé pour complément ; dossier clos hors
  délai ; agent absent ; homonymes ; demande en double.
- **Risques P1** : traçabilité, droits des agents, authenticité des documents délivrés, accessibilité.

## SaaS B2B

- **Fonctions attendues** : création d'organisation, invitation de membres, rôles d'équipe, abonnement et
  plans, facturation, quotas, import/export, clés d'API, webhooks, journaux d'audit, SSO éventuel.
- **Cas réels** : membre retiré qui garde une session ; utilisateur dans deux organisations ; changement
  de plan en cours de période ; quota dépassé ; export de grosses données.
- **Risques P1** : isolation des données entre organisations (un client ne voit jamais les données d'un
  autre), droits par rôle, facturation exacte.

## RH / recrutement

- **Fonctions attendues** : offres, candidatures, CV, présélection, entretiens, dossiers employés, congés,
  paie et bulletins, contrats.
- **Cas réels** : candidature en double ; CV volumineux ; congé chevauchant un jour férié ; solde négatif ;
  accès d'un manager aux données d'un autre service.
- **Risques P1** : confidentialité (salaires, évaluations), calculs de paie et de congés.

## Restauration / livraison de repas

- **Fonctions attendues** : menu et disponibilités, personnalisation d'un plat, commande, paiement,
  suivi, horaires d'ouverture, zones de livraison, espace restaurateur.
- **Cas réels** : plat épuisé après commande ; restaurant fermé ; allergènes ; commande hors zone ;
  pourboire ; annulation après préparation.
- **Risques P1** : commande transmise à la cuisine, paiement, information sur les allergènes.

## Média / contenu

- **Fonctions attendues** : publication éditoriale, catégories et tags, recherche, commentaires et
  modération, abonnements ou paywall, newsletter, SEO, partage.
- **Cas réels** : article programmé ; contenu supprimé encore accessible par son lien ; commentaire
  signalé ; abonnement expiré ; images lourdes.
- **Risques P1** : accès au contenu payant, modération, droits d'auteur.

## ONG / dons

- **Fonctions attendues** : campagnes de collecte, dons uniques ou récurrents, reçus, adhésions,
  bénévoles, rapports d'impact, transparence des fonds.
- **Cas réels** : don récurrent échoué ; reçu fiscal ; don anonyme ; objectif atteint ou dépassé ;
  remboursement d'un don.
- **Risques P1** : exactitude des montants et des reçus, protection des données des donateurs.

## Agriculture

- **Fonctions attendues** : fiches parcelles et cultures, suivi de campagne, intrants, ventes et prix,
  coopératives, traçabilité, météo, conseils, paiement des producteurs.
- **Cas réels** : connexion faible en zone rurale ; saisie hors ligne puis synchronisation ; unités
  différentes (kg, sacs, tonnes) ; campagne chevauchant deux années ; paiement groupé d'une coopérative.
- **Risques P1** : exactitude des quantités et paiements, fonctionnement hors ligne, simplicité d'usage.

## Secteur non listé

Raisonne par questions et note les réponses dans le profil sectoriel :
1. Qui sont les utilisateurs et que veulent-ils accomplir en moins de cinq minutes ?
2. Où circule l'argent, ou l'information sensible ?
3. Quelles sont les 3 erreurs qui coûteraient le plus cher (financièrement, légalement, en confiance) ?
4. Quels états un objet métier traverse-t-il (demande, validation, livraison, clôture...) ?
5. Quelle loi ou norme s'applique à ce métier dans ce pays ?
6. Quels cas « tordus » les vrais utilisateurs rencontrent-ils (annulation, doublon, erreur de saisie, coupure) ?
Transforme chaque réponse en tests ancrés dans une fonctionnalité réelle du projet.
