/**
 * Choix du compte (source ou destination) — GERETOU
 * Maquettes Stitch « Nouvelle Dépense » / « Nouveau Revenu » : cartes défilantes
 * avec pastille d'opérateur, nom, solde et coche.
 */

import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Account } from '../../types/database';
import { ACCOUNT_BRAND } from '../../theme/brand';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

interface AccountSelectorProps {
  accounts: Account[];
  selectedAccountId: string;
  onSelectAccount: (accountId: string) => void;
  label?: string;
}

export const AccountSelector: React.FC<AccountSelectorProps> = ({
  accounts,
  selectedAccountId,
  onSelectAccount,
  label = 'Compte source',
}) => {
  const select = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    onSelectAccount(id);
  };

  return (
    <View>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.count}>
          {accounts.length} compte{accounts.length > 1 ? 's' : ''} dispo
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {accounts.map((acc) => {
          const selected = acc.id === selectedAccountId;
          const brand = ACCOUNT_BRAND[acc.type];
          return (
            <Pressable
              key={acc.id}
              onPress={() => select(acc.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${acc.name}, ${formatFCFA(acc.balance)}`}
              style={[styles.card, selected && styles.cardSelected]}
            >
              <View style={styles.cardHead}>
                <View style={[styles.pill, { backgroundColor: brand.bg }]}>
                  <Text style={[styles.pillText, { color: brand.fg }]}>{brand.short}</Text>
                </View>
                {selected ? (
                  <View style={styles.check}>
                    <Check size={12} color={colors.text.inverted} strokeWidth={3} />
                  </View>
                ) : (
                  <View style={styles.radio} />
                )}
              </View>
              <Text style={styles.name} numberOfLines={1}>{acc.name}</Text>
              <Text style={[styles.balance, acc.balance < 0 && { color: colors.accent.danger }]}>{formatFCFA(acc.balance)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  label: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold, letterSpacing: 1, color: colors.text.secondary, textTransform: 'uppercase' },
  count: { fontSize: typography.sizes.caption, color: colors.primary.DEFAULT, fontWeight: typography.weights.medium },
  row: { gap: spacing.sm, paddingRight: spacing.base },
  card: {
    width: 168,
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: spacing.md,
  },
  cardSelected: { borderWidth: 2, borderColor: colors.primary.DEFAULT },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.sm },
  pillText: { fontSize: typography.sizes.caption, fontWeight: typography.weights.bold },
  check: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary.DEFAULT, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.surface.border },
  name: { marginTop: spacing.sm, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text.primary },
  balance: { marginTop: 2, fontSize: typography.sizes.bodySm, color: colors.text.secondary },
});
