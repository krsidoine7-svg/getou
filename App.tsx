/**
 * Point d'Entrée Principal de l'Application — GERETOU
 * Orchestration SQLite, Authentification, Verrouillage automatique et Navigation Fluide.
 */

import React, { useEffect, useRef, useState } from 'react';
import { StatusBar, View, StyleSheet, AppState, AppStateStatus, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { initDatabase } from './src/services/db/database';
import { useAuthStore } from './src/store/useAuthStore';
import { useNavStore, isTabScreen, ScreenName, TabScreen } from './src/store/useNavStore';
import { TabBar } from './src/components/navigation/TabBar';
import { MoreScreen, MODULES } from './src/screens/more/MoreScreen';
import { UpcomingScreen } from './src/screens/more/UpcomingScreen';
import { BackupScreen } from './src/screens/settings/BackupScreen';
import { SettingsScreen } from './src/screens/settings/SettingsScreen';
import { TrashScreen } from './src/screens/trash/TrashScreen';
import { WalletsScreen } from './src/screens/wallets/WalletsScreen';
import { BudgetsScreen } from './src/screens/budgets/BudgetsScreen';
import { StocksScreen } from './src/screens/stocks/StocksScreen';
import { AnalyticsScreen } from './src/screens/analytics/AnalyticsScreen';
import { AgendaScreen } from './src/screens/agenda/AgendaScreen';
import { DeadlineAlertScreen } from './src/screens/agenda/DeadlineAlertScreen';
import { useAgendaStore } from './src/store/useAgendaStore';
import { NotificationsScreen } from './src/screens/notifications/NotificationsScreen';
import { DebtsScreen } from './src/screens/debts/DebtsScreen';
import { ProjectsScreen } from './src/screens/projects/ProjectsScreen';
import { NotificationSettingsScreen } from './src/screens/notifications/NotificationSettingsScreen';
import { initDeadlineNotifications, listenDeadlineTaps } from './src/services/agenda/deadlineNotifications';
import { ToastHost } from './src/components/common/ToastHost';
import { SplashScreen } from './src/screens/onboarding/SplashScreen';
import { OnboardingScreen } from './src/screens/onboarding/OnboardingScreen';
import { isOnboardingDone, markOnboardingDone } from './src/services/storage/prefs';
import { RegistrationFlow } from './src/screens/auth/RegistrationFlow';
import { LoginFlow } from './src/screens/auth/LoginFlow';
import { LockScreen } from './src/screens/auth/LockScreen';
import { DashboardScreen } from './src/screens/dashboard/DashboardScreen';
import { NouvelleDepenseScreen } from './src/screens/transaction/NouvelleDepenseScreen';
import { NouveauRevenuScreen } from './src/screens/transaction/NouveauRevenuScreen';
import { colors } from './src/theme/tokens';

// Web : la fenêtre de connexion Google revient sur l'app ; ceci la referme et transmet le résultat.
// Dans cette fenêtre, l'app ne doit rien démarrer (la base est déjà ouverte par l'onglet principal).
const IS_AUTH_POPUP = WebBrowser.maybeCompleteAuthSession().type === 'success';

/**
 * Hauteur de la barre d'état Android pour éviter que le haut des écrans et les
 * notifications ne soient tronqués derrière la caméra ou les icônes système (WiFi, horloge).
 * Utilise Math.max avec 44 dp pour couvrir les caméras en poinçon et encoches modernes.
 */
const ANDROID_STATUS_BAR = Platform.OS === 'android' ? Math.max(StatusBar.currentHeight ?? 0, 44) : 0;

/** Durée minimale d'affichage du splash, pour éviter un simple flash à l'écran. */
const MIN_SPLASH_MS = 900;

/** Écrans pas encore intégrés (tous les écrans principaux et secondaires sont désormais intégrés). */
const UPCOMING: Partial<Record<ScreenName, { title: string; planStep: string }>> = {};

/** Onglet surligné pour un écran donné (les modules « Plus » restent sous l'onglet Plus). */
function tabFor(screen: ScreenName): TabScreen | null {
  if (isTabScreen(screen)) return screen;
  if (MODULES.some((m) => m.key === screen)) return 'MORE';
  return null;
}

export default function App() {
  const {
    hasUser,
    isLocked,
    initAuth,
    checkTimeout,
    recordActivity,
  } = useAuthStore();

  const [boot, setBoot] = useState<{ progress: number; status: string; error: string | null; done: boolean }>({
    progress: 0,
    status: 'Démarrage…',
    error: null,
    done: false,
  });
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [authMode, setAuthMode] = useState<{ mode: 'register' | 'login'; email?: string }>({ mode: 'register' });

  const { current: currentView, navigate, replace, reset } = useNavStore();
  const appState = useRef<AppStateStatus>((AppState.currentState ?? 'active') as AppStateStatus);

  // 1. Initialisation SQLite et Auth au démarrage
  useEffect(() => {
    if (IS_AUTH_POPUP) return;
    async function setup() {
      const startedAt = Date.now();
      try {
        setBoot((b) => ({ ...b, progress: 0.15, status: 'Ouverture de la base locale…' }));
        await initDatabase();
        setBoot((b) => ({ ...b, progress: 0.6, status: 'Vérification de la sécurité…' }));
        await initAuth();
        setOnboardingDone(await isOnboardingDone());
        setBoot((b) => ({ ...b, progress: 1, status: 'Prêt' }));
        const wait = MIN_SPLASH_MS - (Date.now() - startedAt);
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        setBoot((b) => ({ ...b, done: true }));
      } catch (e) {
        console.error('Erreur démarrage GERETOU:', e);
        setBoot((b) => ({
          ...b,
          error: "Impossible d'ouvrir la base de données locale. Fermez puis relancez l'application.",
        }));
      }
    }
    setup();
  }, []);

  // 1 bis. Rappels d'échéances : toucher une notification ouvre l'écran de règlement
  useEffect(() => {
    if (IS_AUTH_POPUP) return;
    initDeadlineNotifications().catch(() => {});
    return listenDeadlineTaps((deadlineId) => {
      useAgendaStore.getState().setFocus(deadlineId);
      useNavStore.getState().navigate('DEADLINE_ALERT');
    });
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

  // Fenêtre de retour Google (web) : elle se ferme d'elle-même.
  if (IS_AUTH_POPUP) return null;

  // Écran de démarrage : progression réelle de l'initialisation
  if (!boot.done) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.screenContainer}>
          <SplashScreen progress={boot.progress} status={boot.status} error={boot.error} />
        </View>
      </View>
    );
  }

  // Écran 1a : premier lancement => découverte (une seule fois)
  if (!hasUser && !onboardingDone) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.screenContainer}>
          <OnboardingScreen
            onFinish={() => {
              setAuthMode({ mode: 'register' });
              setOnboardingDone(true);
              markOnboardingDone();
            }}
            onLogin={() => {
              setAuthMode({ mode: 'login' });
              setOnboardingDone(true);
              markOnboardingDone();
            }}
          />
        </View>
      </View>
    );
  }

  // Écran 1b : « J'ai déjà un coffre » => connexion Google + restauration
  if (!hasUser && authMode.mode === 'login') {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.screenContainer}>
          <LoginFlow
            onBack={() => setOnboardingDone(false)}
            onCreateAccount={(email) => setAuthMode({ mode: 'register', email })}
          />
        </View>
        <ToastHost />
      </View>
    );
  }

  // Écran 1c : nouvel utilisateur => inscription
  if (!hasUser) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.screenContainer}>
          <RegistrationFlow
            key={authMode.email ?? 'register'}
            prefillEmail={authMode.email}
            onBackToOnboarding={() => setOnboardingDone(false)}
            onLogin={() => setAuthMode({ mode: 'login' })}
          />
        </View>
        <ToastHost />
      </View>
    );
  }

  // Écran 2 : Utilisateur existant mais session verrouillée => Écran PIN / Biométrie
  if (isLocked) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.screenContainer}>
          <LockScreen />
        </View>
        <ToastHost />
      </View>
    );
  }

  // Écran 3 : Modal / Vue de Saisie de Dépense Express (MVP 1)
  if (currentView === 'NEW_EXPENSE') {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.screenContainer}>
          <NouvelleDepenseScreen
            onClose={reset}
            onSwitchToIncome={() => replace('NEW_INCOME')}
            onSuccess={reset}
          />
        </View>
        <ToastHost />
      </View>
    );
  }

  // Écran 4 : Modal / Vue de Saisie de Revenu & Règle Comptable (MVP 1)
  if (currentView === 'NEW_INCOME') {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.screenContainer}>
          <NouveauRevenuScreen
            onClose={reset}
            onSwitchToExpense={() => replace('NEW_EXPENSE')}
            onSuccess={reset}
          />
        </View>
        <ToastHost />
      </View>
    );
  }

  // Écran 5 : Session active => écran courant + barre d'onglets
  const activeTab = tabFor(currentView);
  const upcoming = UPCOMING[currentView];

  let screen: React.ReactNode;
  if (currentView === 'DASHBOARD') {
    screen = (
      <DashboardScreen
        onOpenNewExpense={() => navigate('NEW_EXPENSE')}
        onOpenNewIncome={() => navigate('NEW_INCOME')}
      />
    );
  } else if (currentView === 'MORE') {
    screen = <MoreScreen />;
  } else if (currentView === 'DEBTS') {
    screen = <DebtsScreen />;
  } else if (currentView === 'PROJECTS') {
    screen = <ProjectsScreen />;
  } else if (currentView === 'NOTIFICATIONS') {
    screen = <NotificationsScreen />;
  } else if (currentView === 'NOTIF_SETTINGS') {
    screen = <NotificationSettingsScreen />;
  } else if (currentView === 'AGENDA') {
    screen = <AgendaScreen />;
  } else if (currentView === 'ANALYTICS') {
    screen = <AnalyticsScreen />;
  } else if (currentView === 'DEADLINE_ALERT') {
    screen = <DeadlineAlertScreen />;
  } else if (currentView === 'BUDGETS') {
    screen = <BudgetsScreen />;
  } else if (currentView === 'STOCKS') {
    screen = <StocksScreen />;
  } else if (currentView === 'WALLETS') {
    screen = <WalletsScreen />;
  } else if (currentView === 'BACKUP') {
    screen = <BackupScreen />;
  } else if (currentView === 'SETTINGS') {
    screen = <SettingsScreen />;
  } else if (currentView === 'TRASH') {
    screen = <TrashScreen />;
  } else if (upcoming) {
    screen = <UpcomingScreen {...upcoming} showBack={!isTabScreen(currentView)} />;
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.screenContainer}>{screen}</View>
      {activeTab ? <TabBar activeTab={activeTab} /> : null}
      <ToastHost />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface.canvas,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: colors.surface.canvas,
    paddingTop: ANDROID_STATUS_BAR,
  },
});
