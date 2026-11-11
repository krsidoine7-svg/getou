/**
 * Barre d'onglets basse — GERETOU
 * Accueil · Portefeuilles · Budgets · Stocks · Plus
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { House, Wallet, ChartPie, Package, Ellipsis } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { TabScreen, useNavStore } from '../../store/useNavStore';
import { useAuthStore } from '../../store/useAuthStore';
import { colors, spacing, typography } from '../../theme/tokens';

const TABS: { key: TabScreen; label: string; Icon: typeof House }[] = [
  { key: 'DASHBOARD', label: 'Accueil', Icon: House },
  { key: 'WALLETS', label: 'Portefeuilles', Icon: Wallet },
  { key: 'BUDGETS', label: 'Budgets', Icon: ChartPie },
  { key: 'STOCKS', label: 'Stocks', Icon: Package },
  { key: 'MORE', label: 'Plus', Icon: Ellipsis },
];

interface TabBarProps {
  /** Onglet à surligner (l'onglet racine de l'écran affiché). */
  activeTab: TabScreen;
}

export const TabBar: React.FC<TabBarProps> = ({ activeTab }) => {
  const switchTab = useNavStore((s) => s.switchTab);
  const recordActivity = useAuthStore((s) => s.recordActivity);

  const onPress = (tab: TabScreen) => {
    recordActivity();
    if (tab === activeTab) return;
    Haptics.selectionAsync().catch(() => {});
    switchTab(tab);
  };

  return (
    <View style={styles.bar} accessibilityRole="tablist">
      {TABS.map(({ key, label, Icon }) => {
        const active = key === activeTab;
        const tint = active ? colors.primary.DEFAULT : colors.text.muted;
        return (
          <Pressable
            key={key}
            onPress={() => onPress(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
            style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
          >
            <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
              <Icon size={22} color={tint} strokeWidth={active ? 2.4 : 2} />
            </View>
            <Text style={[styles.label, { color: tint }, active && styles.labelActive]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface.card,
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: spacing.touchMinHeight,
  },
  tabPressed: {
    opacity: 0.6,
  },
  iconWrap: {
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    borderRadius: 999,
  },
  iconWrapActive: {
    backgroundColor: colors.primary.subtle,
  },
  label: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    marginTop: 2,
  },
  labelActive: {
    fontWeight: typography.weights.bold,
  },
});
