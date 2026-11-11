/**
 * Déverrouillage quotidien (PIN & Biométrie) — GERETOU
 * Maquette Stitch « Déverrouillage Quotidien (PIN & Biométrie) ».
 * Saisie du PIN, biométrie native, blocage progressif et accès à la récupération.
 */

import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import {
  Wallet,
  Lock,
  ShieldCheck,
  UserRound,
  Fingerprint,
  ScanFace,
  ChevronRight,
  KeyRound,
  WifiOff,
  Timer,
} from 'lucide-react-native';
import { PinDots, PinPad } from '../../components/auth/PinPad';
import { OptionBResetModal } from '../../components/auth/OptionBResetModal';
import { BiometricSheet } from '../../components/auth/BiometricSheet';
import { AuthService } from '../../services/auth/authService';
import { PIN_LENGTH } from '../../services/auth/pinRules';
import { useAuthStore } from '../../store/useAuthStore';
import { greetingName, realEmail } from '../../services/auth/identity';
import { colors, spacing, typography, radii } from '../../theme/tokens';

export const LockScreen: React.FC = () => {
  const { currentUser, biometricAvailable, biometryType, lockedUntil, verifyPin, unlockWithBiometrics } = useAuthStore();

  const [pin, setPin] = useState('');
  const [checking, setChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [showRecovery, setShowRecovery] = useState(false);
  const [now, setNow] = useState<number>(Date.now());
  const [bioPending, setBioPending] = useState(false);

  const bioEnabled = biometricAvailable && currentUser?.biometric_enabled === 1;
  const BioIcon = biometryType === 'Face ID' ? ScanFace : Fingerprint;
  const lockSecondsLeft = Math.max(0, Math.ceil((lockedUntil - now) / 1000));
  const isBlocked = lockSecondsLeft > 0;
  const firstName = greetingName(currentUser?.display_name, currentUser?.email);

  const tryBiometrics = async () => {
    if (bioPending || isBlocked) return;
    setBioPending(true);
    await unlockWithBiometrics();
    setBioPending(false);
  };

  // Compte à rebours pendant un blocage temporaire
  useEffect(() => {
    if (lockedUntil <= Date.now()) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [lockedUntil]);

  useEffect(() => {
    if (!isBlocked) setErrorMessage((m) => (m?.startsWith('Trop de tentatives') ? null : m));
  }, [isBlocked]);

  // Biométrie activée : premier essai automatique à l'ouverture
  useEffect(() => {
    if (bioEnabled) tryBiometrics();
  }, [bioEnabled]);

  const onPinChange = async (next: string) => {
    setErrorMessage(null);
    setPin(next);
    if (next.length < PIN_LENGTH) return;

    setChecking(true);
    const result = await verifyPin(next);
    setChecking(false);
    if (result.success) return;

    setShakeKey((k) => k + 1);
    setTimeout(() => setPin(''), 350);
    if (result.lockedUntil && result.lockedUntil > Date.now()) {
      setErrorMessage('Trop de tentatives. Saisie bloquée temporairement.');
    } else {
      setErrorMessage(`Code PIN incorrect. ${result.remainingAttempts ?? 0} tentative(s) restante(s).`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <Wallet size={24} color={colors.primary.DEFAULT} />
          <Text style={styles.brandText}>GERETOU</Text>
        </View>
        <View style={styles.pill}>
          <Lock size={13} color={colors.primary.DEFAULT} />
          <Text style={styles.pillText}>Coffre local</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.greeting}>
          <View style={styles.avatar}>
            <UserRound size={24} color={colors.primary.DEFAULT} />
            <View style={styles.avatarDot} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingTitle} numberOfLines={1}>
              Bonjour{firstName ? ` ${firstName}` : ''}
            </Text>
            <Text style={styles.greetingText}>Déverrouillez votre coffre financier</Text>
          </View>
          <View style={styles.offlineBadge} accessibilityLabel="100 % hors-ligne">
            <WifiOff size={16} color={colors.primary.DEFAULT} />
          </View>
        </View>

        <View style={styles.center}>
          <View style={styles.lockCircle}>
            {isBlocked ? <Timer size={30} color={colors.accent.danger} /> : <Lock size={30} color={colors.primary.DEFAULT} />}
          </View>
          <Text style={styles.title}>Entrez votre code PIN</Text>
          <Text style={styles.subtitle}>Accès sécurisé à vos soldes Wave, MoMo et à votre grand-livre</Text>

          <PinDots value={pin} length={PIN_LENGTH} error={!!errorMessage || isBlocked} shakeKey={shakeKey} />

          <View style={styles.messageSlot}>
          {isBlocked ? (
            <Text style={styles.error}>Trop de tentatives. Réessayez dans {lockSecondsLeft} s.</Text>
          ) : errorMessage ? (
            <Text style={styles.error}>{errorMessage}</Text>
          ) : (
            <View style={styles.hint}>
              <ShieldCheck size={14} color={colors.text.secondary} />
              <Text style={styles.hintText}>{checking ? 'Vérification…' : 'Chiffres masqués pendant la saisie'}</Text>
            </View>
          )}
          </View>
        </View>

        {bioEnabled ? (
          <Pressable
            onPress={tryBiometrics}
            disabled={isBlocked}
            accessibilityRole="button"
            style={({ pressed }) => [styles.bioCard, (pressed || isBlocked) && { opacity: 0.85 }]}
          >
            <View style={styles.bioIcon}>
              <BioIcon size={26} color={colors.text.inverted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bioTitle}>{biometryType}</Text>
              <Text style={styles.bioText}>Déverrouiller sans taper le code</Text>
            </View>
            <ChevronRight size={20} color={colors.text.inverted} />
          </Pressable>
        ) : null}

        <View style={styles.padWrap}>
          <PinPad
            value={pin}
            length={PIN_LENGTH}
            onChange={onPinChange}
            disabled={isBlocked || checking}
            leftKey={
              bioEnabled
                ? {
                    label: 'Biométrie',
                    icon: <BioIcon size={22} color={colors.primary.DEFAULT} />,
                    onPress: tryBiometrics,
                    highlighted: true,
                  }
                : undefined
            }
          />
        </View>

        <Pressable
          onPress={() => setShowRecovery(true)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.forgot, pressed && { opacity: 0.6 }]}
        >
          <KeyRound size={18} color={colors.primary.DEFAULT} />
          <Text style={styles.forgotText}>Code PIN oublié ?</Text>
        </Pressable>
      </ScrollView>

      <BiometricSheet
        visible={bioPending}
        biometryType={biometryType}
        onUsePin={() => {
          AuthService.cancelBiometrics();
          setBioPending(false);
        }}
      />

      <OptionBResetModal visible={showRecovery} onClose={() => setShowRecovery(false)} defaultEmail={realEmail(currentUser?.email) ?? undefined} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.canvas },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandText: { fontSize: typography.sizes.title, fontWeight: typography.weights.extrabold, color: colors.primary.DEFAULT },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary.container,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  pillText: { fontSize: typography.sizes.caption, color: colors.primary.DEFAULT, fontWeight: typography.weights.semibold },
  content: { padding: spacing.base, paddingBottom: spacing.xl },
  greeting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface.card,
    borderRadius: radii.xl,
    padding: spacing.base,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary.DEFAULT,
    borderWidth: 2,
    borderColor: colors.surface.card,
  },
  greetingTitle: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text.primary },
  greetingText: { fontSize: typography.sizes.bodySm, color: colors.text.secondary },
  offlineBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brands.waveBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { alignItems: 'center', marginTop: spacing.lg },
  lockCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary.container,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { fontSize: typography.sizes.headline, fontWeight: typography.weights.bold, color: colors.text.primary },
  subtitle: { marginTop: spacing.xs, fontSize: typography.sizes.bodySm, color: colors.text.secondary, textAlign: 'center', paddingHorizontal: spacing.lg },
  messageSlot: { minHeight: 32, justifyContent: 'center' },
  error: { fontSize: typography.sizes.bodySm, color: colors.accent.danger, fontWeight: typography.weights.semibold, textAlign: 'center' },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface.muted,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  hintText: { fontSize: typography.sizes.caption, color: colors.text.secondary },
  bioCard: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: radii.xl,
    padding: spacing.base,
  },
  bioIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioTitle: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text.inverted },
  bioText: { fontSize: typography.sizes.bodySm, color: colors.primary.container },
  padWrap: { marginTop: spacing.lg },
  forgot: { marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  forgotText: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.primary.DEFAULT },
});
