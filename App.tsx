/**
 * Point d'Entrée Principal de l'Application — GERETOU
 * Orchestration SQLite, Authentification, Verrouillage automatique et Navigation Fluide.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  StatusBar,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  AppState,
  AppStateStatus,
} from 'react-native';
import { initDatabase } from './src/services/db/database';
import { useAuthStore } from './src/store/useAuthStore';
import { RegisterScreen } from './src/screens/auth/RegisterScreen';
import { LockScreen } from './src/screens/auth/LockScreen';
import { DashboardScreen } from './src/screens/dashboard/DashboardScreen';
import { NouvelleDepenseScreen } from './src/screens/transaction/NouvelleDepenseScreen';
import { NouveauRevenuScreen } from './src/screens/transaction/NouveauRevenuScreen';
import { colors, typography, spacing } from './src/theme/tokens';

type ActiveView = 'DASHBOARD' | 'NEW_EXPENSE' | 'NEW_INCOME';

export default function App() {
  const {
    hasUser,
    isLocked,
    isLoading,
    initAuth,
    checkTimeout,
    recordActivity,
    lockSession,
  } = useAuthStore();

  const [currentView, setCurrentView] = useState<ActiveView>('DASHBOARD');
  const appState = useRef<AppStateStatus>((AppState.currentState ?? 'active') as AppStateStatus);

  // 1. Initialisation SQLite et Auth au démarrage
  useEffect(() => {
    async function setup() {
      try {
        await initDatabase();
        await initAuth();
      } catch (e) {
        console.error('Erreur démarrage GERETOU:', e);
      }
    }
    setup();
  }, []);

  // 2. Gestion de l'inactivité (Timeout 3 minutes)
  useEffect(() => {
    const timer = setInterval(() => {
      checkTimeout();
    }, 15000);

    return () => clearInterval(timer);
  }, []);

  // 3. Gestion du passage en arrière-plan (AppState)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        checkTimeout();
      } else if (nextAppState.match(/inactive|background/)) {
        recordActivity();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Écran de chargement / Splash
  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.splashLogo}>GERETOU</Text>
        <Text style={styles.splashTagline}>Gestion Financière & Domestique</Text>
        <ActivityIndicator size="large" color={colors.primary.container} style={{ marginTop: spacing.xl }} />
      </View>
    );
  }

  // Écran 1 : Nouvel utilisateur => Inscription / Onboarding
  if (!hasUser) {
    return (
      <>
        <StatusBar barStyle="dark-content" />
        <RegisterScreen />
      </>
    );
  }

  // Écran 2 : Utilisateur existant mais session verrouillée => Écran PIN / Biométrie
  if (isLocked) {
    return (
      <>
        <StatusBar barStyle="dark-content" />
        <LockScreen />
      </>
    );
  }

  // Écran 3 : Modal / Vue de Saisie de Dépense Express (MVP 1)
  if (currentView === 'NEW_EXPENSE') {
    return (
      <>
        <StatusBar barStyle="dark-content" />
        <NouvelleDepenseScreen
          onClose={() => setCurrentView('DASHBOARD')}
          onSwitchToIncome={() => setCurrentView('NEW_INCOME')}
          onSuccess={() => setCurrentView('DASHBOARD')}
        />
      </>
    );
  }

  // Écran 4 : Modal / Vue de Saisie de Revenu & Règle Comptable (MVP 1)
  if (currentView === 'NEW_INCOME') {
    return (
      <>
        <StatusBar barStyle="dark-content" />
        <NouveauRevenuScreen
          onClose={() => setCurrentView('DASHBOARD')}
          onSwitchToExpense={() => setCurrentView('NEW_EXPENSE')}
          onSuccess={() => setCurrentView('DASHBOARD')}
        />
      </>
    );
  }

  // Écran 5 : Session active => Tableau de bord principal avec FAB
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <DashboardScreen
        onOpenNewExpense={() => setCurrentView('NEW_EXPENSE')}
        onOpenNewIncome={() => setCurrentView('NEW_INCOME')}
      />
    </>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  splashLogo: {
    fontSize: typography.sizes.hero,
    fontWeight: typography.weights.extrabold,
    color: colors.text.inverted,
    letterSpacing: 3,
  },
  splashTagline: {
    fontSize: typography.sizes.bodySm,
    color: colors.primary.container,
    marginTop: spacing.xs,
  },
});
