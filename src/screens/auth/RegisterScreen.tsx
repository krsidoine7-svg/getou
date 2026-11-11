/**
 * Écran d'Inscription & Onboarding Initial (RegisterScreen) — GERETOU
 * Enregistrement sécurisé local, configuration du premier solde et code PIN.
 */

import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useAuthStore } from '../../store/useAuthStore';
import { colors, radii, spacing, typography } from '../../theme/tokens';

export const RegisterScreen: React.FC = () => {
  const { register, biometricAvailable, biometryType, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [initialWave, setInitialWave] = useState('25000');
  const [initialCash, setInitialCash] = useState('10000');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [enableBiometrics, setEnableBiometrics] = useState(true);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = (): boolean => {
    const errs: { [key: string]: string } = {};

    if (!email.trim() || !email.includes('@')) {
      errs.email = 'Veuillez saisir une adresse e-mail valide.';
    }

    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      errs.pin = 'Le code PIN doit comporter exactement 4 chiffres.';
    }

    if (pin !== confirmPin) {
      errs.confirmPin = 'La confirmation ne correspond pas au code PIN.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    const waveAmount = parseFloat(initialWave) || 0;
    const cashAmount = parseFloat(initialCash) || 0;

    const success = await register(
      email.trim(),
      pin,
      enableBiometrics && biometricAvailable,
      waveAmount,
      cashAmount
    );

    if (!success) {
      Alert.alert('Erreur', "Impossible de créer votre espace sécurisé.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>GERETOU</Text>
          <Text style={styles.title}>Bienvenue dans votre coffre financier</Text>
          <Text style={styles.subtitle}>
            Toutes vos finances privées, 100 % hors-ligne sur votre téléphone avec sauvegarde chiffrée.
          </Text>
        </View>

        {/* Formulaire */}
        <Card style={styles.formCard}>
          <Input
            label="Votre adresse e-mail (Récupération)"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (errors.email) setErrors({ ...errors, email: '' });
            }}
            placeholder="amadou@example.com"
            keyboardType="email-address"
            error={errors.email}
            helperText="Nécessaire uniquement pour la réinitialisation par e-mail (Option B)."
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Input
                label="Solde Wave initial"
                value={initialWave}
                onChangeText={setInitialWave}
                placeholder="25 000"
                keyboardType="numeric"
                helperText="En FCFA"
              />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Input
                label="Espèces initiales"
                value={initialCash}
                onChangeText={setInitialCash}
                placeholder="10 000"
                keyboardType="numeric"
                helperText="En FCFA"
              />
            </View>
          </View>

          <Input
            label="Définir un Code PIN (4 chiffres)"
            value={pin}
            onChangeText={(t) => {
              setPin(t);
              if (errors.pin) setErrors({ ...errors, pin: '' });
            }}
            placeholder="••••"
            keyboardType="numeric"
            secureTextEntry
            error={errors.pin}
          />

          <Input
            label="Confirmer le Code PIN"
            value={confirmPin}
            onChangeText={(t) => {
              setConfirmPin(t);
              if (errors.confirmPin) setErrors({ ...errors, confirmPin: '' });
            }}
            placeholder="••••"
            keyboardType="numeric"
            secureTextEntry
            error={errors.confirmPin}
          />

          {biometricAvailable ? (
            <View style={styles.biometricToggle}>
              <View style={{ flex: 1 }}>
                <Text style={styles.biometricLabel}>Activer {biometryType}</Text>
                <Text style={styles.biometricDesc}>Déverrouillez instantanément sans taper votre PIN</Text>
              </View>
              <Switch
                value={enableBiometrics}
                onValueChange={setEnableBiometrics}
                trackColor={{ false: colors.surface.border, true: colors.primary.DEFAULT }}
              />
            </View>
          ) : null}

          <Button
            title="Créer mon coffre et commencer"
            onPress={handleRegister}
            loading={isLoading}
            variant="primary"
            style={{ marginTop: spacing.base }}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface.canvas,
  },
  scrollContainer: {
    padding: spacing.screenPadding,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  logo: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.extrabold,
    color: colors.primary.DEFAULT,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: typography.sizes.headline,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.base,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: colors.surface.card,
  },
  row: {
    flexDirection: 'row',
  },
  biometricToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderColor: colors.surface.border,
    marginTop: spacing.sm,
  },
  biometricLabel: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  biometricDesc: {
    fontSize: typography.sizes.caption,
    color: colors.text.secondary,
  },
});
