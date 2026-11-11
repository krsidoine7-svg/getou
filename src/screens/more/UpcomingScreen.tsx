/**
 * Écran d'attente — GERETOU
 * Affiché pour un module dont l'écran Stitch n'est pas encore intégré.
 * Indique honnêtement l'étape du plan (doc/PLAN_ECRANS_STITCH.md) et permet le retour.
 */

import React from 'react';
import { SafeAreaView, View, Text, Pressable, StyleSheet } from 'react-native';
import { ArrowLeft, Hammer } from 'lucide-react-native';
import { useNavStore } from '../../store/useNavStore';
import { colors, radii, spacing, typography } from '../../theme/tokens';

interface UpcomingScreenProps {
  title: string;
  /** Étape du plan qui livrera cet écran, ex. « Étape 5 ». */
  planStep: string;
  /** Afficher le bouton retour (faux pour un onglet racine). */
  showBack?: boolean;
}

export const UpcomingScreen: React.FC<UpcomingScreenProps> = ({ title, planStep, showBack = true }) => {
  const goBack = useNavStore((s) => s.goBack);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        {showBack ? (
          <Pressable
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Retour"
            hitSlop={12}
            style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}
          >
            <ArrowLeft size={22} color={colors.text.primary} />
          </Pressable>
        ) : null}
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.badge}>
          <Hammer size={28} color={colors.primary.DEFAULT} />
        </View>
        <Text style={styles.heading}>Écran en construction</Text>
        <Text style={styles.text}>
          Ce module arrive avec l'{planStep.toLowerCase()} du plan d'intégration des écrans.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  back: { marginRight: spacing.md, padding: spacing.xs, borderRadius: radii.md },
  title: { fontSize: typography.sizes.headline, fontWeight: typography.weights.extrabold, color: colors.text.primary },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  heading: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text.primary },
  text: {
    fontSize: typography.sizes.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
  },
});
