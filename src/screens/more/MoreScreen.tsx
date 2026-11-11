/**
 * Onglet « Plus » — GERETOU
 * Accès aux modules secondaires.
 */

import React from 'react';
import { SafeAreaView, ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import {
  HandCoins,
  Target,
  CalendarDays,
  ChartColumn,
  Bell,
  ShieldCheck,
  Trash2,
  ChevronRight,
  Lock,
  CloudUpload,
} from 'lucide-react-native';
import { ModuleScreen, useNavStore } from '../../store/useNavStore';
import { useAuthStore } from '../../store/useAuthStore';
import { userLabel } from '../../services/auth/identity';
import { colors, radii, spacing, typography } from '../../theme/tokens';

export const MODULES: { key: ModuleScreen; title: string; subtitle: string; Icon: typeof Target }[] = [
  { key: 'DEBTS', title: 'Dettes & Créances', subtitle: 'Qui vous doit, ce que vous devez', Icon: HandCoins },
  { key: 'PROJECTS', title: "Projets & Épargne", subtitle: "Objectifs d'achat et coffres dédiés", Icon: Target },
  { key: 'AGENDA', title: 'Agenda & Échéances', subtitle: 'Factures et paiements à venir', Icon: CalendarDays },
  { key: 'ANALYTICS', title: 'Analyses', subtitle: 'Graphiques et bilan du mois', Icon: ChartColumn },
  { key: 'NOTIFICATIONS', title: 'Notifications', subtitle: "Centre d'alertes et historique", Icon: Bell },
  { key: 'BACKUP', title: 'Sauvegarde Google Drive', subtitle: 'Synchroniser et restaurer vos données', Icon: CloudUpload },
  { key: 'SETTINGS', title: 'Sécurité & Réglages', subtitle: 'Code PIN, biométrie, sauvegarde', Icon: ShieldCheck },
  { key: 'TRASH', title: 'Corbeille', subtitle: 'Restaurer les éléments supprimés', Icon: Trash2 },
];

export const MoreScreen: React.FC = () => {
  const navigate = useNavStore((s) => s.navigate);
  const { currentUser, lockSession, recordActivity } = useAuthStore();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} onTouchStart={recordActivity}>
        <Text style={styles.title}>Plus</Text>
        <Text style={styles.subtitle}>{userLabel(currentUser?.display_name, currentUser?.email) || 'Coffre local · sans compte'}</Text>

        <View style={styles.list}>
          {MODULES.map(({ key, title, subtitle, Icon }, i) => (
            <Pressable
              key={key}
              onPress={() => navigate(key)}
              accessibilityRole="button"
              accessibilityLabel={title}
              style={({ pressed }) => [
                styles.row,
                i < MODULES.length - 1 && styles.rowDivider,
                pressed && styles.rowPressed,
              ]}
            >
              <View style={styles.iconBox}>
                <Icon size={20} color={colors.primary.DEFAULT} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{title}</Text>
                <Text style={styles.rowSubtitle}>{subtitle}</Text>
              </View>
              <ChevronRight size={18} color={colors.text.muted} />
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={lockSession}
          accessibilityRole="button"
          style={({ pressed }) => [styles.lockBtn, pressed && styles.rowPressed]}
        >
          <Lock size={18} color={colors.accent.danger} />
          <Text style={styles.lockText}>Verrouiller maintenant</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.canvas },
  content: { padding: spacing.screenPadding, paddingBottom: spacing.xxl },
  title: {
    fontSize: typography.sizes.headline,
    fontWeight: typography.weights.extrabold,
    color: colors.text.primary,
    marginTop: spacing.base,
  },
  subtitle: { fontSize: typography.sizes.bodySm, color: colors.text.secondary, marginBottom: spacing.lg },
  list: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    minHeight: 64,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.surface.border },
  rowPressed: { backgroundColor: colors.surface.muted },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primary.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text.primary },
  rowSubtitle: { fontSize: typography.sizes.caption, color: colors.text.secondary, marginTop: 2 },
  lockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent.dangerBorder,
    backgroundColor: colors.accent.dangerBg,
    minHeight: spacing.touchMinHeight,
  },
  lockText: { color: colors.accent.danger, fontWeight: typography.weights.bold, fontSize: typography.sizes.body },
});
