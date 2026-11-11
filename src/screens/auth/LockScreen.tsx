/**
 * Écran de Verrouillage de Session (LockScreen) — GERETOU
 * Pavé numérique tactile, biométrie native, limitation de tentatives et Option B.
 */

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { PinKeypad } from '../../components/auth/PinKeypad';
import { OptionBResetModal } from '../../components/auth/OptionBResetModal';
import { useAuthStore } from '../../store/useAuthStore';
import { colors, spacing, typography, radii } from '../../theme/tokens';

export const LockScreen: React.FC = () => {
  const {
    currentUser,
    biometricAvailable,
    biometryType,
    remainingAttempts,
    verifyPin,
    unlockWithBiometrics,
  } = useAuthStore();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showOptionB, setShowOptionB] = useState<boolean>(false);

  useEffect(() => {
    // Si la biométrie est activée, tenter un premier déverrouillage automatique
    if (currentUser?.biometric_enabled === 1 && biometricAvailable) {
      unlockWithBiometrics();
    }
  }, [currentUser, biometricAvailable]);

  const handlePinComplete = async (enteredPin: string) => {
    setErrorMessage(null);
    const success = await verifyPin(enteredPin);
    if (!success) {
      if (remainingAttempts <= 1) {
        setErrorMessage('Compte temporairement bloqué suite à 5 échecs consécutifs.');
      } else {
        setErrorMessage(`Code PIN incorrect. ${remainingAttempts - 1} tentative(s) restante(s).`);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* En-tête de sécurité */}
        <View style={styles.header}>
          <View style={styles.badgeShield}>
            <Text style={styles.shieldIcon}>🛡️</Text>
          </View>
          <Text style={styles.appName}>GERETOU</Text>
          <Text style={styles.userEmail}>{currentUser?.email || 'Session Sécurisée'}</Text>
        </View>

        {/* Pavé numérique */}
        <PinKeypad
          onComplete={handlePinComplete}
          onBiometricPress={unlockWithBiometrics}
          biometricAvailable={biometricAvailable && currentUser?.biometric_enabled === 1}
          biometryType={biometryType}
          errorMessage={errorMessage}
        />

        {/* Option B de récupération */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowOptionB(true)}
          style={styles.forgotBtn}
        >
          <Text style={styles.forgotText}>
            Code PIN oublié ? (Option B : Récupération par E-mail)
          </Text>
        </TouchableOpacity>
      </View>

      <OptionBResetModal
        visible={showOptionB}
        onClose={() => setShowOptionB(false)}
        defaultEmail={currentUser?.email}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface.canvas,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  badgeShield: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary.subtle,
    borderWidth: 1,
    borderColor: colors.primary.container,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  shieldIcon: {
    fontSize: 28,
  },
  appName: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.extrabold,
    color: colors.primary.DEFAULT,
    letterSpacing: 1,
  },
  userEmail: {
    fontSize: typography.sizes.bodySm,
    color: colors.text.secondary,
    marginTop: 4,
  },
  forgotBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: radii.md,
  },
  forgotText: {
    fontSize: typography.sizes.bodySm,
    color: colors.primary.DEFAULT,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
