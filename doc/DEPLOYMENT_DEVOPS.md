# Déploiement & DevOps (CI/CD) — GERETOU
**Pipeline de Build Mobile (EAS Build), Configuration Cloud Neon et Déploiement**

---

## 1. Vue d'Ensemble du Pipeline

```mermaid
flowchart LR
    DEV["Développeur / Antigravity\n(Code TypeScript + SQLite)"] --> GIT["Dépôt GitHub / GitLab\n(Branches feature/* -> main)"]
    
    subgraph Mobile_Build ["EAS Build (Expo Application Services)"]
        EAS_ANDROID["Build Android\n- APK de test (Preview)\n- AAB Google Play Store"]
        EAS_IOS["Build iOS\n- IPA TestFlight\n- App Store Production"]
    end

    subgraph Backend_Infra ["Infrastructure Cloud Neon & Sync"]
        NEON["Neon Serverless PostgreSQL\n- Branches dev / staging / prod\n- Point-in-Time Recovery (PITR)"]
        EDGE["Edge Workers / Vercel API\n- Microservice de Sync REST"]
    end

    GIT -->|CI Webhook| EAS_ANDROID
    GIT -->|CI Webhook| EAS_IOS
    GIT -->|Deploy Hook| EDGE
    EDGE --> NEON
```

---

## 2. Configuration d'EAS Build (`eas.json`)

Le fichier `eas.json` orchestre la génération des binaires mobiles autonomes :

```json
{
  "cli": {
    "version": ">= 10.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "enterpriseProvisioning": false
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Profils de Build :
* **`preview` (Recommandé pour les tests sur téléphone)** : Génère un fichier `.apk` directement téléchargeable et installable sur n'importe quel smartphone Android sans passer par le Play Store.
* **`production`** : Génère le bundle optimisé `.aab` pour le Google Play Store et l'archive `.ipa` pour TestFlight / App Store.

---

## 3. Configuration de la Base Cloud Neon (PostgreSQL)

### 3.1 Stratégie de Branches Neon
* **`main` (Production)** : Base officielle contenant les données sauvegardées des utilisateurs réels. Sauvegardes automatiques en continu (PITR).
* **`staging` (Pré-production)** : Branche clonée depuis `main` sans impacter les utilisateurs pour tester les migrations de schéma lourdes.
* **`dev` (Développement local)** : Branche éphémère isolée pour les tests d'intégration automatisés.

### 3.2 Variables d'Environnement Requises (`.env`)
```bash
# Configuration Mobile (Injectée dans l'App)
EXPO_PUBLIC_APP_ENV="production"
EXPO_PUBLIC_API_BASE_URL="https://sync.geretou.app/api/v1"
EXPO_PUBLIC_ENABLE_OFFLINE_LOGS="false"

# Configuration Backend / Sync Worker (Secrets Vercel / Cloudflare)
NEON_DATABASE_URL="postgresql://user:password@ep-xyz.eu-central-1.aws.neon.tech/geretou_prod?sslmode=require"
JWT_SECRET="CLE_SECRETE_FORTE_256_BITS"
ENCRYPTION_PEPPER="CLE_HEXADECIMALE_PEPPER"
```

---

## 4. Commandes Clés de Déploiement

```bash
# 1. Tester en direct sur son téléphone avec Expo Go
npx expo start

# 2. Générer un APK Android de test complet
eas build --profile preview --platform android

# 3. Lancer les migrations sur la base Cloud Neon
npx drizzle-kit push:pg # ou prisma migrate deploy

# 4. Déployer l'API de synchronisation sur Vercel
vercel --prod
```
