/**
 * Écran de démarrage (Splash) — GERETOU
 * Maquette Stitch « Écran de Démarrage (Splash Screen) ».
 * La progression affichée reflète les vraies étapes d'initialisation (base locale, sécurité).
 */

import React from 'react';
import { SafeAreaView, View, Text, StyleSheet } from 'react-native';
import { ShieldCheck, Lock, WifiOff, Banknote, RefreshCw } from 'lucide-react-native';
import { BrandMark } from '../../components/common/BrandMark';
import { colors, radii, spacing, typography } from '../../theme/tokens';
import appConfig from '../../../app.json';

interface SplashScreenProps {
  /** Progression réelle de 0 à 1. */
  progress: number;
  /** Étape en cours, ex. « Ouverture de la base locale… ». */
  status: string;
  /** Message d'erreur si l'initialisation a échoué. */
  error?: string | null;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ progress, status, error }) => {
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  const version = (appConfig as { expo?: { version?: string } }).expo?.version;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topRow}>
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusPillText}>HORS-LIGNE PRÊT</Text>
        </View>
        {version ? (
          <View style={styles.versionRow}>
            <ShieldCheck size={16} color={colors.text.muted} />
            <Text style={styles.versionText}>v{version}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.center}>
        <View>
          <BrandMark size={112} />
          <View style={styles.coreBadge}>
            <Lock size={12} color={colors.text.inverted} />
            <Text style={styles.coreBadgeText}>Local</Text>
          </View>
        </View>

        <Text style={styles.brand}>
          GERETOU<Text style={styles.brandDot}>.</Text>
        </Text>
        <Text style={styles.tagline}>Votre grand-livre financier & domestique, sur votre téléphone</Text>

        <View style={styles.featureCard}>
          <View style={styles.featureIcon}>
            <ShieldCheck size={20} color={colors.primary.DEFAULT} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.featureTitle}>100 % hors-ligne</Text>
            <Text style={styles.featureText}>Vos données restent sur cet appareil</Text>
          </View>
        </View>

        <View style={styles.chips}>
          <View style={styles.chip}>
            <Banknote size={14} color={colors.text.secondary} />
            <Text style={styles.chipText}>FCFA / XOF / XAF</Text>
          </View>
          <View style={styles.chip}>
            <WifiOff size={14} color={colors.text.secondary} />
            <Text style={styles.chipText}>Aucun compte en ligne requis</Text>
          </View>
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <View style={styles.progressLabelRow}>
              <RefreshCw size={14} color={error ? colors.accent.danger : colors.primary.DEFAULT} />
              <Text style={[styles.progressLabel, error && { color: colors.accent.danger }]} numberOfLines={1}>
                {error ? "Échec de l'initialisation" : status}
              </Text>
            </View>
            <Text style={styles.progressPct}>{pct}%</Text>
          </View>
          <View
            style={styles.track}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: pct }}
          >
            <View style={[styles.fill, { width: `${pct}%` }, error && { backgroundColor: colors.accent.danger }]} />
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.canvas },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    gap: 6,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary.DEFAULT },
  statusPillText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.primary.DEFAULT,
    letterSpacing: 0.8,
  },
  versionRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  versionText: { fontSize: typography.sizes.bodySm, color: colors.text.muted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  coreBadge: {
    position: 'absolute',
    bottom: -10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  coreBadgeText: { color: colors.text.inverted, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  brand: {
    marginTop: spacing.xl,
    fontSize: typography.sizes.hero,
    fontWeight: typography.weights.extrabold,
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  brandDot: { color: colors.accent.warning },
  tagline: {
    marginTop: spacing.xs,
    fontSize: typography.sizes.subtitle,
    color: colors.primary.dark,
    textAlign: 'center',
    lineHeight: 24,
  },
  featureCard: {
    marginTop: spacing.xl,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primary.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text.primary },
  featureText: { fontSize: typography.sizes.bodySm, color: colors.text.secondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface.muted,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  chipText: { fontSize: typography.sizes.caption, color: colors.text.secondary, fontWeight: typography.weights.medium },
  progressBlock: { alignSelf: 'stretch', marginTop: spacing.xxl },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  progressLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: spacing.sm },
  progressLabel: { fontSize: typography.sizes.bodySm, color: colors.text.primary, flexShrink: 1 },
  progressPct: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.bold, color: colors.primary.DEFAULT },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.primary.subtle, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.primary.DEFAULT },
  errorText: { marginTop: spacing.sm, fontSize: typography.sizes.caption, color: colors.accent.danger },
});
