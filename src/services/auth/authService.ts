/**
 * Service d'Authentification & Sécurité — GERETOU
 * Chiffrement local, hachage salé, SecureStore, Biométrie et Récupération Option B.
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';
import {
  hashPinSecure,
  verifyPinSecure,
  isSecureHash,
  legacyHashPin,
  constantTimeEqual,
  parseLockout,
  registerFailure,
  remainingFreeAttempts,
} from './pinSecurity';
import { makeGuestEmail } from './identity';
import { getDatabase, withTransaction } from '../db/database';
import { User, Account } from '../../types/database';

const MASTER_SALT_KEY = 'geretou_master_salt';
const ACTIVE_USER_ID_KEY = 'geretou_active_user_id';
const PIN_PEPPER_KEY = 'geretou_pin_pepper';
const FAILED_ATTEMPTS_KEY = 'geretou_failed_pin_attempts';

export interface PinVerificationResult {
  success: boolean;
  remainingAttempts?: number;
  /** Timestamp (ms) jusqu'auquel la saisie est bloquée, 0 si aucun blocage. */
  lockedUntil?: number;
}

// Gestionnaire de stockage sécurisé avec compatibilité Web
async function secureStorageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  }
  return await SecureStore.getItemAsync(key);
}

async function secureStorageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function secureStorageDelete(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

function randomHex(byteCount: number): string {
  return Array.from(Crypto.getRandomBytes(byteCount), (b) => b.toString(16).padStart(2, '0')).join('');
}

export class AuthService {
  /**
   * Récupère ou génère le sel maître stocké dans le SecureStore matériel (iOS Keychain / Android Keystore)
   */
  private static async getLegacyMasterSalt(): Promise<string | null> {
    return await secureStorageGet(MASTER_SALT_KEY);
  }

  /**
   * Secret (« pepper ») conservé uniquement dans le SecureStore matériel.
   * Sans lui, les empreintes stockées en base sont inexploitables.
   */
  private static async getPepper(): Promise<string> {
    let pepper = await secureStorageGet(PIN_PEPPER_KEY);
    if (!pepper) {
      pepper = randomHex(32);
      await secureStorageSet(PIN_PEPPER_KEY, pepper);
    }
    return pepper;
  }

  private static async createPinHash(pin: string): Promise<string> {
    const pepper = await this.getPepper();
    return hashPinSecure(pin, Crypto.getRandomBytes(16), pepper);
  }

  /**
   * Rattache le compte Google au profil local (le profil invité devient un compte).
   * L'e-mail Google sert ensuite à reconnaître la sauvegarde et à récupérer l'accès.
   */
  public static async linkGoogleAccount(email: string): Promise<User | null> {
    const user = await this.getActiveUser();
    if (!user) return null;
    const normalized = email.trim().toLowerCase();
    if (user.email !== normalized) {
      const db = await getDatabase();
      await db.runAsync('UPDATE users SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;', [normalized, user.id]);
    }
    return { ...user, email: normalized };
  }

  /** Empreinte d'un nouveau PIN pour cet appareil (restauration d'une sauvegarde). */
  public static async hashNewPin(pin: string): Promise<string> {
    return this.createPinHash(pin);
  }

  /**
   * Finalise une restauration : désigne l'utilisateur restauré comme actif,
   * applique le choix biométrique fait sur cet appareil et remet le compteur d'échecs à zéro.
   */
  public static async finalizeRestoredUser(enableBiometrics: boolean): Promise<User> {
    const db = await getDatabase();
    const user = await db.getFirstAsync<User>('SELECT * FROM users LIMIT 1;');
    if (!user) throw new Error('La sauvegarde ne contient aucun utilisateur.');
    await db.runAsync('UPDATE users SET biometric_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;', [
      enableBiometrics ? 1 : 0,
      user.id,
    ]);
    await secureStorageSet(ACTIVE_USER_ID_KEY, user.id);
    await secureStorageDelete(FAILED_ATTEMPTS_KEY);
    return { ...user, biometric_enabled: enableBiometrics ? 1 : 0 };
  }

  /**
   * Vérifie si un utilisateur est déjà enregistré localement
   */
  public static async hasRegisteredUser(): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.getAllAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM users;'
    );
    return (result && result[0]?.count > 0) || false;
  }

  /**
   * Récupère l'utilisateur actif
   */
  public static async getActiveUser(): Promise<User | null> {
    const db = await getDatabase();
    const activeUserId = await secureStorageGet(ACTIVE_USER_ID_KEY);
    
    if (activeUserId) {
      const user = await db.getFirstAsync<User>(
        'SELECT * FROM users WHERE id = ?;',
        [activeUserId]
      );
      if (user) return user;
    }

    // Fallback: premier utilisateur
    return await db.getFirstAsync<User>('SELECT * FROM users LIMIT 1;');
  }

  /**
   * Enregistrement complet d'un nouvel utilisateur avec création de son portefeuille de départ
   */
  /**
   * @param email adresse Google si connue ; null = profil invité (aucun compte requis).
   */
  public static async registerUser(
    email: string | null,
    pin: string,
    enableBiometrics: boolean = false,
    initialWaveBalance: number = 0,
    initialCashBalance: number = 0,
    displayName: string | null = null
  ): Promise<User> {
    const db = await getDatabase();
    const pinHash = await this.createPinHash(pin);
    const uuid = Crypto.randomUUID();
    const userId = `usr_${uuid}`;
    const userEmail = email?.trim().toLowerCase() || makeGuestEmail(uuid);

    return await withTransaction(async (txDb) => {
      // 1. Insertion de l'utilisateur
      await txDb.runAsync(
        `INSERT INTO users (id, email, display_name, pin_hash, biometric_enabled)
         VALUES (?, ?, ?, ?, ?);`,
        [userId, userEmail, displayName?.trim() || null, pinHash, enableBiometrics ? 1 : 0]
      );

      // 2. Création des comptes de départ (Wave, Cash, MoMo)
      const now = new Date().toISOString();
      await txDb.runAsync(
        `INSERT INTO accounts (id, user_id, name, type, sub_type, balance, currency, is_archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?);`,
        [`acc_wave_${Date.now()}`, userId, 'Wave Principal', 'WAVE', 'MAIN', initialWaveBalance, 'FCFA', now, now]
      );

      await txDb.runAsync(
        `INSERT INTO accounts (id, user_id, name, type, sub_type, balance, currency, is_archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?);`,
        [`acc_cash_${Date.now()}`, userId, 'Espèces (Cash)', 'CASH', 'MAIN', initialCashBalance, 'FCFA', now, now]
      );

      await txDb.runAsync(
        `INSERT INTO accounts (id, user_id, name, type, sub_type, balance, currency, is_archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?);`,
        [`acc_momo_${Date.now()}`, userId, 'MTN MoMo', 'MOMO', 'MAIN', 0, 'FCFA', now, now]
      );

      // 3. Mémoriser l'utilisateur actif
      await secureStorageSet(ACTIVE_USER_ID_KEY, userId);

      const user = await txDb.getFirstAsync<User>(
        'SELECT * FROM users WHERE id = ?;',
        [userId]
      );

      if (!user) throw new Error("Échec de création du compte utilisateur");
      return user;
    });
  }

  /**
   * État courant du blocage (pour afficher un compte à rebours sans saisir de PIN).
   */
  public static async getLockoutStatus(): Promise<{ remainingAttempts: number; lockedUntil: number }> {
    const state = parseLockout(await secureStorageGet(FAILED_ATTEMPTS_KEY));
    return { remainingAttempts: remainingFreeAttempts(state), lockedUntil: state.lockedUntil };
  }

  /**
   * Vérification du code PIN à la connexion.
   * Blocage progressif (30 s, 1 min, 2 min… jusqu'à 1 h) au-delà de 5 échecs.
   * Les anciens PIN (format « sha256_ ») sont migrés vers PBKDF2 au premier succès.
   */
  public static async verifyPin(pin: string): Promise<PinVerificationResult> {
    const user = await this.getActiveUser();
    if (!user) return { success: false };

    const now = Date.now();
    const lockout = parseLockout(await secureStorageGet(FAILED_ATTEMPTS_KEY));
    if (lockout.lockedUntil > now) {
      return { success: false, remainingAttempts: 0, lockedUntil: lockout.lockedUntil };
    }

    let valid = false;
    if (isSecureHash(user.pin_hash)) {
      valid = await verifyPinSecure(pin, user.pin_hash, await this.getPepper());
    } else {
      const legacySalt = await this.getLegacyMasterSalt();
      valid = legacySalt !== null && constantTimeEqual(legacyHashPin(pin, legacySalt), user.pin_hash);
      if (valid) {
        const db = await getDatabase();
        await db.runAsync(
          'UPDATE users SET pin_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;',
          [await this.createPinHash(pin), user.id]
        );
      }
    }

    if (valid) {
      await secureStorageDelete(FAILED_ATTEMPTS_KEY);
      return { success: true };
    }

    const next = registerFailure(lockout, now);
    await secureStorageSet(FAILED_ATTEMPTS_KEY, JSON.stringify(next));
    return { success: false, remainingAttempts: remainingFreeAttempts(next), lockedUntil: next.lockedUntil };
  }

  /**
   * Vérification de la disponibilité du matériel biométrique
   */
  public static async checkBiometricsAvailable(): Promise<{
    hasHardware: boolean;
    isEnrolled: boolean;
    biometryType: string;
  }> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    let biometryType = 'Biométrie';
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometryType = 'Face ID';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometryType = 'Empreinte Digitale';
    }

    return { hasHardware, isEnrolled, biometryType };
  }

  /**
   * Demande une vérification biométrique, sans condition sur l'utilisateur
   * (utilisée à l'inscription pour vérifier que la biométrie fonctionne avant de l'activer).
   */
  public static async promptBiometrics(promptMessage: string): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Utiliser le code PIN',
        disableDeviceFallback: true,
      });
      return result.success;
    } catch {
      return false;
    }
  }

  /** Annule une demande biométrique en cours (effectif sur Android, sans effet ailleurs). */
  public static async cancelBiometrics(): Promise<void> {
    try {
      await LocalAuthentication.cancelAuthenticate();
    } catch {
      // Non supporté sur cette plateforme
    }
  }

  /**
   * Déverrouillage biométrique natif
   */
  public static async authenticateBiometrics(): Promise<boolean> {
    const user = await this.getActiveUser();
    if (!user || user.biometric_enabled !== 1) return false;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Déverrouillez GERETOU',
      cancelLabel: 'Utiliser le Code PIN',
      fallbackLabel: 'Entrer le Code PIN',
      disableDeviceFallback: false,
    });

    return result.success;
  }

  /**
   * Option B : Demande de réinitialisation du code PIN par e-mail
   * Prévue pour fonctionner même hors-ligne avec enregistrement dans sync_queue
   */
  public static async requestPasswordResetOptionB(email: string): Promise<{ success: boolean; message: string }> {
    const user = await this.getActiveUser();
    if (!user) {
      return { success: false, message: "Aucun utilisateur trouvé sur cet appareil." };
    }

    if (user.email.toLowerCase() !== email.trim().toLowerCase()) {
      return { success: false, message: "L'adresse e-mail ne correspond pas au compte enregistré." };
    }

    const db = await getDatabase();
    const payload = JSON.stringify({
      email: user.email,
      requested_at: new Date().toISOString(),
      action: 'PIN_RESET_REQUEST_OPTION_B'
    });

    // Enregistrement dans la file d'attente de synchronisation locale
    await db.runAsync(
      `INSERT INTO sync_queue (mutation_id, table_name, operation, record_id, payload, timestamp, status)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        `reset_${Date.now()}`,
        'users',
        'UPDATE',
        user.id,
        payload,
        Date.now(),
        'PENDING'
      ]
    );

    return {
      success: true,
      message: `Un lien de réinitialisation sécurisé sera envoyé à ${user.email} dès que l'accès internet est rétabli.`
    };
  }
}
