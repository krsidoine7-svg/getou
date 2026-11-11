/**
 * Définition du Code PIN — GERETOU (étape 2 sur 2)
 * Maquettes Stitch « Définition du Code PIN Sécurisé », « Confirmation du Code PIN »
 * et « Erreur Code PIN Non Concordant », réunies en un écran à 3 états.
 */

import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, Pressable, Switch, StyleSheet, ActivityIndicator } from 'react-native';
import {
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  CircleAlert,
  Eye,
  CircleCheck,
  Shield,
  TriangleAlert,
  Fingerprint,
  Lock,
  RefreshCw,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { PinDots, PinPad } from '../../components/auth/PinPad';
import { BiometricSheet } from '../../components/auth/BiometricSheet';
import { AuthService } from '../../services/auth/authService';
import { PIN_LENGTH, pinWeakness } from '../../services/auth/pinRules';
import { colors, radii, spacing, typography } from '../../theme/tokens';

type Phase = 'define' | 'confirm' | 'mismatch';

/** Nombre de confirmations ratées avant de devoir redéfinir le code. */
export const MAX_CONFIRM_ATTEMPTS = 3;

interface PinSetupScreenProps {
  biometricAvailable: boolean;
  biometryType: string;
  /** Création du compte en cours (désactive les actions). */
  submitting: boolean;
  /** Erreur de création du compte à afficher. */
  submitError?: string | null;
  onBack: () => void;
  onComplete: (pin: string, enableBiometrics: boolean) => void;
}

export const PinSetupScreen: React.FC<PinSetupScreenProps> = ({
  biometricAvailable,
  biometryType,
  submitting,
  submitError,
  onBack,
  onComplete,
}) => {
  const [phase, setPhase] = useState<Phase>('define');
  const [firstPin, setFirstPin] = useState('');
  const [entry, setEntry] = useState('');
  const [reveal, setReveal] = useState(false);
  const [defineError, setDefineError] = useState<string | null>(null);
  const [mismatchCount, setMismatchCount] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [enableBio, setEnableBio] = useState(biometricAvailable);
  const [bioPending, setBioPending] = useState(false);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (revealTimer.current) clearTimeout(revealTimer.current); }, []);

  const fail = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    setShakeKey((k) => k + 1);
  };

  const peek = () => {
    setReveal(true);
    if (revealTimer.current) clearTimeout(revealTimer.current);
    revealTimer.current = setTimeout(() => setReveal(false), 1000);
  };

  // Étape « définir » : validation automatique dès le 4e chiffre
  const onDefineChange = (next: string) => {
    setDefineError(null);
    setEntry(next);
    if (next.length < PIN_LENGTH) return;
    const weakness = pinWeakness(next);
    if (weakness) {
      setDefineError(weakness);
      fail();
      setTimeout(() => setEntry(''), 350);
      return;
    }
    setTimeout(() => {
      setFirstPin(next);
      setEntry('');
      setReveal(false);
      setPhase('confirm');
    }, 150);
  };

  const restart = () => {
    setPhase('define');
    setFirstPin('');
    setEntry('');
    setMismatchCount(0);
    setDefineError(null);
  };

  const confirm = async () => {
    if (entry.length < PIN_LENGTH || submitting || bioPending) return;
    if (entry !== firstPin) {
      const count = mismatchCount + 1;
      setMismatchCount(count);
      fail();
      if (count >= MAX_CONFIRM_ATTEMPTS) {
        restart();
        setDefineError('Trop de confirmations différentes : choisissez à nouveau votre code.');
      } else {
        setPhase('mismatch');
      }
      return;
    }

    let bioOk = false;
    if (biometricAvailable && enableBio) {
      setBioPending(true);
      bioOk = await AuthService.promptBiometrics('Activez le déverrouillage GERETOU');
      setBioPending(false);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onComplete(firstPin, bioOk);
  };

  const usePinInstead = () => {
    AuthService.cancelBiometrics();
    setBioPending(false);
  };

  const retryConfirm = () => {
    setEntry('');
    setPhase('confirm');
  };

  const stepNumber = phase === 'define' ? 1 : 2;
  const busy = submitting || bioPending;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          onPress={phase === 'define' ? onBack : restart}
          disabled={busy}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <ArrowLeft size={22} color={colors.text.primary} />
        </Pressable>
        <View style={styles.stepper}>
          <Text style={styles.stepperText}>ÉTAPE {stepNumber} SUR 2</Text>
          <View style={styles.stepperBars}>
            <View style={[styles.bar, styles.barOn]} />
            <View style={[styles.bar, stepNumber === 2 && styles.barOn]} />
          </View>
        </View>
        <View style={styles.localPill}>
          <Lock size={12} color={colors.primary.DEFAULT} />
          <Text style={styles.localPillText}>Local</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {phase === 'mismatch' ? (
          <View style={[styles.card, styles.cardError]}>
            <View style={[styles.iconCircle, { backgroundColor: colors.accent.dangerBg }]}>
              <CircleAlert size={30} color={colors.accent.danger} />
            </View>
            <Text style={[styles.title, { color: colors.accent.danger }]}>Les codes PIN ne correspondent pas</Text>
            <Text style={styles.subtitle}>
              Le second code saisi diffère de votre code initial. Recommencez la confirmation ou redéfinissez votre code.
            </Text>
            <PinDots value={'0'.repeat(PIN_LENGTH)} length={PIN_LENGTH} error shakeKey={shakeKey} />
            <View style={styles.warnPill}>
              <TriangleAlert size={16} color={colors.accent.warning} />
              <Text style={styles.warnText}>
                {MAX_CONFIRM_ATTEMPTS - mismatchCount} essai(s) restant(s) avant de devoir redéfinir le code
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              {phase === 'define' ? (
                <KeyRound size={28} color={colors.primary.DEFAULT} />
              ) : (
                <ShieldCheck size={28} color={colors.primary.DEFAULT} />
              )}
            </View>
            <Text style={styles.title}>{phase === 'define' ? 'Code PIN de sécurité' : 'Confirmez votre code PIN'}</Text>
            <Text style={styles.subtitle}>
              {phase === 'define'
                ? "Ce code protège l'accès à votre coffre. Il reste sur ce téléphone et n'est envoyé nulle part."
                : `Ressaisissez le code à ${PIN_LENGTH} chiffres défini à l'étape précédente.`}
            </Text>

            <PinDots value={entry} length={PIN_LENGTH} reveal={reveal} error={!!defineError} shakeKey={shakeKey} />

            {defineError ? (
              <Text style={styles.errorText}>{defineError}</Text>
            ) : (
              <View style={styles.dotsFooter}>
                <Text style={styles.counter}>
                  {entry.length} / {PIN_LENGTH} chiffres saisis
                </Text>
                <Pressable
                  onPress={peek}
                  disabled={entry.length === 0}
                  accessibilityRole="button"
                  hitSlop={8}
                  style={({ pressed }) => [styles.peekBtn, (pressed || entry.length === 0) && { opacity: 0.5 }]}
                >
                  <Eye size={16} color={colors.primary.DEFAULT} />
                  <Text style={styles.peekText}>Afficher (1 s)</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {phase === 'confirm' && biometricAvailable ? (
          <View style={styles.bioCard}>
            <View style={styles.bioIcon}>
              <Fingerprint size={22} color={colors.primary.DEFAULT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bioTitle}>Activer {biometryType}</Text>
              <Text style={styles.bioText}>Déverrouillage rapide sans taper le code</Text>
            </View>
            <Switch
              value={enableBio}
              onValueChange={setEnableBio}
              trackColor={{ false: colors.surface.border, true: colors.primary.DEFAULT }}
              accessibilityLabel={`Activer ${biometryType}`}
            />
          </View>
        ) : null}

        {phase !== 'mismatch' ? (
          <View style={styles.padWrap}>
            <PinPad
              value={entry}
              length={PIN_LENGTH}
              onChange={phase === 'define' ? onDefineChange : (v) => setEntry(v)}
              disabled={busy}
            />
          </View>
        ) : null}

        {phase === 'define' ? (
          <View style={styles.rules}>
            <View style={styles.rulesHeader}>
              <Shield size={18} color={colors.primary.DEFAULT} />
              <Text style={styles.rulesTitle}>Règles de protection</Text>
            </View>
            {[
              'Le code verrouille l’accès à vos comptes Wave, MoMo et espèces sur ce téléphone.',
              'Les suites (1234) et chiffres identiques (0000) sont refusés.',
              'Notez-le en lieu sûr : il protège l’accès à toutes vos données.',
            ].map((rule) => (
              <View key={rule} style={styles.ruleRow}>
                <CircleCheck size={16} color={colors.primary.DEFAULT} />
                <Text style={styles.ruleText}>{rule}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {submitError ? <Text style={[styles.errorText, { marginTop: spacing.base }]}>{submitError}</Text> : null}

        {phase === 'confirm' ? (
          <Pressable
            onPress={confirm}
            disabled={entry.length < PIN_LENGTH || busy}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.cta,
              (entry.length < PIN_LENGTH || busy) && styles.ctaDisabled,
              pressed && styles.ctaPressed,
            ]}
          >
            {busy ? <ActivityIndicator color={colors.text.inverted} /> : <Lock size={20} color={colors.text.inverted} />}
            <Text style={styles.ctaText}>Confirmer et activer la protection</Text>
          </Pressable>
        ) : null}

        {phase === 'mismatch' ? (
          <>
            <Pressable onPress={retryConfirm} accessibilityRole="button" style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
              <RefreshCw size={20} color={colors.text.inverted} />
              <Text style={styles.ctaText}>Réessayer la confirmation</Text>
            </Pressable>
            <Pressable onPress={restart} accessibilityRole="button" style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.7 }]}>
              <ArrowLeft size={18} color={colors.text.primary} />
              <Text style={styles.secondaryText}>Recommencer à l'étape 1 (modifier le PIN)</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>

      <BiometricSheet visible={bioPending} biometryType={biometryType} onUsePin={usePinInstead} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.canvas },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.base, paddingTop: spacing.base },
  backBtn: { width: 44, height: 44, borderRadius: radii.lg, backgroundColor: colors.brands.waveBg, alignItems: 'center', justifyContent: 'center' },
  stepper: { alignItems: 'center' },
  stepperText: { fontSize: typography.sizes.caption, letterSpacing: 1, color: colors.text.secondary, fontWeight: typography.weights.semibold },
  stepperBars: { flexDirection: 'row', gap: 6, marginTop: 6 },
  bar: { width: 28, height: 5, borderRadius: 3, backgroundColor: colors.surface.border },
  barOn: { backgroundColor: colors.primary.DEFAULT },
  localPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary.container,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  localPillText: { fontSize: typography.sizes.caption, color: colors.primary.DEFAULT, fontWeight: typography.weights.bold },
  content: { padding: spacing.base, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.surface.card, borderRadius: radii.xl, padding: spacing.lg, alignItems: 'center' },
  cardError: { borderWidth: 1.5, borderColor: colors.accent.dangerBorder },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary.container,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { fontSize: typography.sizes.headline, fontWeight: typography.weights.bold, color: colors.text.primary, textAlign: 'center' },
  subtitle: { marginTop: spacing.xs, fontSize: typography.sizes.body, lineHeight: 21, color: colors.text.secondary, textAlign: 'center' },
  dotsFooter: { flexDirection: 'row', alignSelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' },
  counter: { fontSize: typography.sizes.bodySm, color: colors.text.secondary },
  peekBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  peekText: { fontSize: typography.sizes.bodySm, color: colors.primary.DEFAULT, fontWeight: typography.weights.semibold },
  errorText: { fontSize: typography.sizes.bodySm, color: colors.accent.danger, fontWeight: typography.weights.semibold, textAlign: 'center' },
  warnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.warningBg,
    borderColor: colors.accent.warningBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  warnText: { flexShrink: 1, fontSize: typography.sizes.bodySm, color: colors.text.primary },
  bioCard: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface.card,
    borderRadius: radii.xl,
    padding: spacing.base,
  },
  bioIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.brands.waveBg, alignItems: 'center', justifyContent: 'center' },
  bioTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text.primary },
  bioText: { fontSize: typography.sizes.bodySm, color: colors.text.secondary },
  padWrap: { marginTop: spacing.md, backgroundColor: colors.surface.card, borderRadius: radii.xl, padding: spacing.sm },
  rules: { marginTop: spacing.md, backgroundColor: colors.surface.card, borderRadius: radii.xl, padding: spacing.base, gap: spacing.sm },
  rulesHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  rulesTitle: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text.primary },
  ruleRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  ruleText: { flex: 1, fontSize: typography.sizes.bodySm, lineHeight: 19, color: colors.text.secondary },
  cta: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: radii.lg,
    minHeight: 56,
    paddingHorizontal: spacing.base,
  },
  ctaDisabled: { backgroundColor: colors.text.muted },
  ctaPressed: { backgroundColor: colors.primary.dark },
  ctaText: { color: colors.text.inverted, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold },
  secondary: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    backgroundColor: colors.brands.waveBg,
    paddingHorizontal: spacing.base,
  },
  secondaryText: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text.primary },
});
