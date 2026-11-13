# 🧠 MÉMOIRE DU PROJET — GERETOU

> Document de mémoire persistante du projet GERETOU. Permet de reprendre instantanément le contexte, les choix architecturaux et l'état d'avancement entre chaque session de développement.

---

## 📌 1. Vue d'ensemble & Philosophie
- **Projet** : GERETOU (Gestion d'Épargne, de Revenus et d'Entrées/Sorties pour Tous).
- **Philosophie** : **100 % Offline-First**. L'utilisateur reste propriétaire absolu de ses données financières, aucun serveur central requis pour le fonctionnement quotidien.
- **Plateformes cibles** : Android (APK/AAB via Expo EAS), iOS, et Web / PWA (installable sur mobile et bureau).
- **Stack** : 
  - React Native / Expo SDK 58
  - `expo-sqlite` (Android/iOS) & `wa-sqlite` WASM (Web)
  - `zustand` pour la gestion d'état réactive
  - `lucide-react-native` pour l'iconographie épurée

---

## ⚙️ 2. Architecture & Choix Techniques Clés

### A. Sécurité & Stockage (Trousseau vs Web)
- **Isolation plateforme** : Pour éviter les erreurs de compilation Metro sur Web avec `expo-secure-store`, l'architecture utilise des extensions de fichiers dédiées :
  - `src/services/storage/secureStore.ts` : Trousseau matériel natif (Android Keystore / iOS Keychain).
  - `src/services/storage/secureStore.web.ts` : `localStorage` du navigateur dans l'environnement Web sécurisé.
- **Sécurité des codes PIN** : Hachage PBKDF2 avec sel unique par utilisateur, poivre matériel (`pepper`) et protection progressive contre le brute-force.

### B. Interface Utilisateur & Ergonomie Mobile
- **Barre d'état Android (Notch & Poinçon)** : Marge haute sécurisée calculée dynamiquement via `Math.max(StatusBar.currentHeight ?? 0, 44)` dans `App.tsx` pour empêcher tout chevauchement des titres d'écrans avec la caméra ou les icônes système (horloge, 4G, WiFi, batterie).
- **Gestion du Clavier (Modaux & Code PIN)** : Hook `useKeyboardHeight` écoutant les événements clavier natifs pour surélever automatiquement les modaux (`ChangePinModal`, `MoneyActionModal`, `TransferModal`, etc.) lorsque le pavé numérique ou le clavier virtuel s'affiche.

### C. Système d'Alertes & Coach Financier Ivoirien
- **Ton & Personnalité** : Alertes au style direct, bienveillant et en nouchi / français ivoirien (*« Tu as eu un djai, tu veux pas garder un peu ? »*, *« Champion, tu as trop bouffé là... »*).
- **Déclencheurs gérés** :
  - Dépassement de seuil budgétaire (80% et 100%).
  - Entrées d'argent avec projets d'épargne en attente.
  - Projets d'épargne stagnants (pas d'avancement depuis plus de 15 jours).
  - Échéances de dettes ou factures à régler.

---

## 📅 3. Historique Récent des Modifications (13 Novembre 2026)

| Commit | Description |
|---|---|
| `6f15bef` | **Web / PWA** : Isolation d'`expo-secure-store` via `secureStore.web.ts` pour corriger les erreurs de bundling Metro. |
| `1c37589` | **UI Mobile** : Rehaussement dynamique au clavier pour le modal de PIN et insets de sécurité barre d'état Android. |
| `83d0e73` | **Expo Doctor & Notifications** : Alignement des dépendances SDK 58 et intégration du coach ivoirien. |
| `ca8d044` | **UI** : Nettoyage et simplification de l'écran d'historique des alertes (style éditorial épuré). |
| `87bb3fa` | **Déploiement Web** : Configuration PWA standalone et règles de réécriture `vercel.json`. |

---

## ✅ 4. État de Santé du Projet
- **Tests unitaires & métier** : `135/135 tests réussis` (`node --test tests/*.test.mjs`).
- **Typage TypeScript** : `0 erreur` (`npx tsc --noEmit`).
- **Export Web** : `dist` généré sans accroc (`npx expo export -p web`).
- **Dépôt Git** : Synchronisé avec `origin/main` (`https://github.com/krsidoine7-svg/getou.git`).
