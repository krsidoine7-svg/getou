/**
 * Zustand Store d'Authentification & Sécurité — GERETOU
 * Gère l'état d'enregistrement, le verrouillage de session et le timeout de 3 minutes.
 */

import { create } from 'zustand';
import { AuthService } from '../services/auth/authService';
import { User } from '../types/database';

interface AuthState {
  hasUser: boolean;
  isLocked: boolean;
  isAuthenticated: boolean;
  currentUser: User | null;
  biometricAvailable: boolean;
  biometryType: string;
  remainingAttempts: number;
  lastActiveTimestamp: number;
  isLoading: boolean;

  // Actions
  initAuth: () => Promise<void>;
  register: (
    email: string,
    pin: string,
    enableBiometrics: boolean,
    initialWave: number,
    initialCash: number
  ) => Promise<boolean>;
  verifyPin: (pin: string) => Promise<boolean>;
  unlockWithBiometrics: () => Promise<boolean>;
  lockSession: () => void;
  recordActivity: () => void;
  checkTimeout: () => boolean; // Verrouille si inactif depuis > 3 minutes (180 000 ms)
}

const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

export const useAuthStore = create<AuthState>((set, get) => ({
  hasUser: false,
  isLocked: true,
  isAuthenticated: false,
  currentUser: null,
  biometricAvailable: false,
  biometryType: 'Biométrie',
  remainingAttempts: 5,
  lastActiveTimestamp: Date.now(),
  isLoading: true,

  initAuth: async () => {
    try {
      set({ isLoading: true });
      const hasUser = await AuthService.hasRegisteredUser();
      let currentUser: User | null = null;

      if (hasUser) {
        currentUser = await AuthService.getActiveUser();
      }

      const bio = await AuthService.checkBiometricsAvailable();

      set({
        hasUser,
        currentUser,
        isLocked: hasUser, // Verrouillé par défaut si un utilisateur existe
        isAuthenticated: false,
        biometricAvailable: bio.hasHardware && bio.isEnrolled,
        biometryType: bio.biometryType,
        isLoading: false,
        lastActiveTimestamp: Date.now(),
      });
    } catch (error) {
      console.error('Erreur initAuth:', error);
      set({ isLoading: false });
    }
  },

  register: async (email, pin, enableBiometrics, initialWave, initialCash) => {
    try {
      set({ isLoading: true });
      const user = await AuthService.registerUser(
        email,
        pin,
        enableBiometrics,
        initialWave,
        initialCash
      );

      set({
        hasUser: true,
        currentUser: user,
        isLocked: false,
        isAuthenticated: true,
        isLoading: false,
        lastActiveTimestamp: Date.now(),
      });
      return true;
    } catch (error) {
      console.error('Erreur inscription:', error);
      set({ isLoading: false });
      return false;
    }
  },

  verifyPin: async (pin: string) => {
    const result = await AuthService.verifyPin(pin);
    if (result.success) {
      set({
        isLocked: false,
        isAuthenticated: true,
        remainingAttempts: 5,
        lastActiveTimestamp: Date.now(),
      });
      return true;
    } else {
      set({
        remainingAttempts: result.remainingAttempts ?? 0,
      });
      return false;
    }
  },

  unlockWithBiometrics: async () => {
    const success = await AuthService.authenticateBiometrics();
    if (success) {
      set({
        isLocked: false,
        isAuthenticated: true,
        remainingAttempts: 5,
        lastActiveTimestamp: Date.now(),
      });
      return true;
    }
    return false;
  },

  lockSession: () => {
    set({
      isLocked: true,
      isAuthenticated: false,
    });
  },

  recordActivity: () => {
    set({ lastActiveTimestamp: Date.now() });
  },

  checkTimeout: () => {
    const { isAuthenticated, lastActiveTimestamp } = get();
    if (isAuthenticated) {
      const elapsed = Date.now() - lastActiveTimestamp;
      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        set({ isLocked: true, isAuthenticated: false });
        return true; // Session expirée et reverrouillée
      }
    }
    return false;
  },
}));
