/**
 * Écran de démarrage (Splash) — GERETOU
 * Design minimaliste & éditorial (conforme aux principes de minimalist-skill).
 * Micro-animation du logo G + point ambre, progression épurée et typographie soignée.
 */

import React, { useEffect, useRef } from 'react';
import { SafeAreaView, View, Text, StyleSheet, Animated, Easing } from 'react-native';
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

  // Animation d'apparition du texte de marque (titre + baseline)
  const textFade = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(textFade, {
        toValue: 1,
        duration: 500,
        delay: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(textTranslateY, {
        toValue: 0,
        duration: 500,
        delay: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [textFade, textTranslateY]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Section centrale : Logo animé + Marque + Baseline */}
        <View style={styles.centerSection}>
          <BrandMark size={104} animated />

          <Animated.View
            style={[
              styles.textBlock,
              {
                opacity: textFade,
                transform: [{ translateY: textTranslateY }],
              },
            ]}
          >
            <Text style={styles.brand}>
              GERETOU<Text style={styles.brandDot}>.</Text>
            </Text>
            <Text style={styles.tagline}>Votre grand-livre financier & domestique</Text>
          </Animated.View>
        </View>

        {/* Section inférieure discrète : Micro-indicateur de chargement / Erreur */}
        <View style={styles.bottomSection}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>Échec du démarrage</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <View style={styles.loaderWrap}>
              <View
                style={styles.progressBarTrack}
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: 100, now: pct }}
              >
                <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.statusText} numberOfLines={1}>
                {status.toUpperCase()}
              </Text>
            </View>
          )}

          <Text style={styles.footerText}>
            {version ? `v${version} · ` : ''}100 % hors-ligne
          </Text>
        </View>
      </View>
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
    paddingVertical: spacing.xxl,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  textBlock: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  brand: {
    fontSize: 26,
    fontWeight: typography.weights.extrabold,
    color: colors.text.primary,
    letterSpacing: 2,
  },
  brandDot: {
    color: colors.accent.warning,
  },
  tagline: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.base,
  },
  loaderWrap: {
    alignItems: 'center',
    width: '100%',
  },
  progressBarTrack: {
    width: 140,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.surface.border,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.primary.DEFAULT,
  },
  statusText: {
    marginTop: spacing.md,
    fontSize: 10,
    fontWeight: typography.weights.medium,
    color: colors.text.muted,
    letterSpacing: 1.2,
  },
  footerText: {
    marginTop: spacing.base,
    fontSize: typography.sizes.caption,
    color: colors.text.muted,
    letterSpacing: 0.5,
  },
  errorBox: {
    maxWidth: 320,
    padding: spacing.md,
    backgroundColor: colors.accent.dangerBg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent.dangerBorder,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.bold,
    color: colors.accent.danger,
    marginBottom: 2,
  },
  errorText: {
    fontSize: typography.sizes.caption,
    color: colors.accent.danger,
    textAlign: 'center',
  },
});
