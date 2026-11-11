/**
 * Configuration du coffre — GERETOU (étape 1 sur 2)
 * Maquette Stitch « Inscription & Création de Compte », sans compte obligatoire :
 * l'app s'utilise immédiatement ; le compte Google n'est demandé qu'au moment de synchroniser.
 */

import React, { useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { ArrowLeft, ShieldCheck, Lock, ArrowRight, CloudUpload, CircleCheck } from 'lucide-react-native';
import { Input } from '../../components/common/Input';
import { colors, radii, spacing, typography } from '../../theme/tokens';

export interface RegistrationDetails {
  displayName: string;
  /** Adresse Google si l'utilisateur vient de la connexion ; null = profil invité. */
  email: string | null;
  initialWave: number;
  initialCash: number;
}

interface RegisterScreenProps {
  /** Valeurs déjà saisies (retour depuis l'étape PIN). */
  initial?: RegistrationDetails | null;
  onContinue: (details: RegistrationDetails) => void;
  /** Retour à l'écran de découverte. */
  onBack: () => void;
  /** Compte Google déjà connecté (aucune sauvegarde trouvée) : rattaché au coffre. */
  prefillEmail?: string;
  /** « Déjà un coffre sauvegardé ? Se connecter ». */
  onLogin: () => void;
}

/** « 25 000 » → 25000 ; renvoie NaN si la saisie n'est pas un montant. */
export function parseAmount(text: string): number {
  const cleaned = text.replace(/[\s ]/g, '');
  if (cleaned === '') return 0;
  return /^\d+$/.test(cleaned) ? Number(cleaned) : NaN;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ initial, onContinue, onBack, prefillEmail, onLogin }) => {
  const [displayName, setDisplayName] = useState(initial?.displayName ?? '');
  const [initialWave, setInitialWave] = useState(initial?.initialWave ? String(initial.initialWave) : '');
  const [initialCash, setInitialCash] = useState(initial?.initialCash ? String(initial.initialCash) : '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const linkedEmail = initial?.email ?? prefillEmail ?? null;

  const clearError = (key: string) => errors[key] && setErrors({ ...errors, [key]: '' });

  const submit = () => {
    const errs: Record<string, string> = {};
    const wave = parseAmount(initialWave);
    const cash = parseAmount(initialCash);
    if (Number.isNaN(wave)) errs.initialWave = 'Montant en chiffres uniquement.';
    if (Number.isNaN(cash)) errs.initialCash = 'Montant en chiffres uniquement.';
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    onContinue({ displayName: displayName.trim(), email: linkedEmail, initialWave: wave, initialCash: cash });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Retour" style={({ pressed }) => pressed && { opacity: 0.6 }}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Mon coffre</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.banner}>
          <ShieldCheck size={18} color={colors.primary.DEFAULT} />
          <Text style={styles.bannerText}>SANS COMPTE • 100 % HORS-LIGNE</Text>
          <View style={styles.stepPill}>
            <Text style={styles.stepPillText}>Étape 1/2</Text>
          </View>
        </View>

        <Text style={styles.title}>Configurez votre coffre</Text>
        <Text style={styles.subtitle}>
          Aucun compte à créer : tout reste sur ce téléphone. Ces informations sont facultatives.
        </Text>

        {linkedEmail ? (
          <View style={styles.linked}>
            <CircleCheck size={18} color={colors.primary.DEFAULT} />
            <Text style={styles.linkedText}>
              Sauvegarde rattachée au compte Google <Text style={styles.linkedStrong}>{linkedEmail}</Text>
            </Text>
          </View>
        ) : null}

        <Input
          label="Votre nom ou pseudo (facultatif)"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="ex : Alex Konan, Famille Kouassi"
          helperText="Affiché en haut de votre tableau de bord."
        />

        <View style={styles.row}>
          <Input
            style={{ flex: 1 }}
            label="Solde Wave actuel"
            value={initialWave}
            onChangeText={(t) => { setInitialWave(t); clearError('initialWave'); }}
            placeholder="0"
            keyboardType="number-pad"
            error={errors.initialWave}
            helperText="En FCFA"
          />
          <Input
            style={{ flex: 1 }}
            label="Espèces actuelles"
            value={initialCash}
            onChangeText={(t) => { setInitialCash(t); clearError('initialCash'); }}
            placeholder="0"
            keyboardType="number-pad"
            error={errors.initialCash}
            helperText="En FCFA"
          />
        </View>

        <View style={styles.labelRow}>
          <Text style={styles.label}>Devise principale</Text>
          <Text style={styles.labelHint}>Verrouillée</Text>
        </View>
        <View style={styles.currency}>
          <View style={styles.currencyBadge}>
            <Text style={styles.currencyBadgeText}>FCFA</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.currencyTitle}>Franc CFA (XOF / XAF)</Text>
            <Text style={styles.currencySub}>Afrique de l'Ouest & Centrale</Text>
          </View>
          <View style={styles.currencyLock}>
            <Lock size={16} color={colors.primary.DEFAULT} />
          </View>
        </View>

        {!linkedEmail ? (
          <View style={styles.syncHint}>
            <CloudUpload size={18} color={colors.primary.DEFAULT} />
            <Text style={styles.syncHintText}>
              Plus tard, si vous voulez sauvegarder ou changer de téléphone, connectez simplement votre compte Google
              depuis <Text style={styles.linkedStrong}>Plus → Sauvegarde Google Drive</Text>.
            </Text>
          </View>
        ) : null}

        <Pressable onPress={submit} accessibilityRole="button" style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
          <Text style={styles.ctaText}>Continuer & définir mon PIN</Text>
          <ArrowRight size={20} color={colors.text.inverted} />
        </Pressable>

        <Pressable onPress={onLogin} accessibilityRole="button" style={styles.loginLink}>
          <Text style={styles.loginLinkText}>
            Déjà un coffre sauvegardé ? <Text style={styles.loginLinkStrong}>Se connecter</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
  },
  headerTitle: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text.primary },
  content: { padding: spacing.base, paddingBottom: spacing.xxl },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary.container,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bannerText: { flex: 1, fontSize: typography.sizes.caption, color: colors.primary.dark, letterSpacing: 0.5, fontWeight: typography.weights.semibold },
  stepPill: { backgroundColor: colors.surface.card, paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radii.full },
  stepPillText: { fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, color: colors.text.primary },
  title: { marginTop: spacing.lg, fontSize: 26, lineHeight: 32, fontWeight: typography.weights.extrabold, color: colors.text.primary },
  subtitle: { marginTop: spacing.xs, marginBottom: spacing.lg, fontSize: typography.sizes.body, lineHeight: 21, color: colors.text.secondary },
  linked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary.subtle,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  linkedText: { flex: 1, fontSize: typography.sizes.bodySm, color: colors.text.secondary, lineHeight: 19 },
  linkedStrong: { color: colors.primary.DEFAULT, fontWeight: typography.weights.semibold },
  row: { flexDirection: 'row', gap: spacing.md },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  label: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold, color: colors.text.primary },
  labelHint: { fontSize: typography.sizes.caption, color: colors.text.muted },
  currency: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: spacing.md,
  },
  currencyBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyBadgeText: { color: colors.text.inverted, fontWeight: typography.weights.extrabold, fontSize: 12 },
  currencyTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text.primary },
  currencySub: { fontSize: typography.sizes.bodySm, color: colors.text.secondary },
  currencyLock: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brands.waveBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncHint: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.brands.waveBg,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  syncHintText: { flex: 1, fontSize: typography.sizes.bodySm, lineHeight: 19, color: colors.text.secondary },
  cta: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: radii.lg,
    minHeight: 56,
  },
  loginLink: { alignItems: 'center', paddingVertical: spacing.base },
  loginLinkText: { fontSize: typography.sizes.body, color: colors.text.secondary },
  loginLinkStrong: { color: colors.primary.DEFAULT, fontWeight: typography.weights.bold, textDecorationLine: 'underline' },
  ctaPressed: { backgroundColor: colors.primary.dark },
  ctaText: { color: colors.text.inverted, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold },
});
