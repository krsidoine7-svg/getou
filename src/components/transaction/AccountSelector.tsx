/**
 * Sélecteur de Portefeuille Source / Destination — Forest Ledger
 * Permet de choisir le compte débité avec affichage du solde en direct.
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Account } from '../../types/database';
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
  label = 'Portefeuille débité',
}) => {
  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'WAVE':
        return colors.brands.wave;
      case 'MOMO':
        return colors.brands.momo;
      case 'ORANGE':
        return colors.brands.orange;
      default:
        return colors.brands.cash;
    }
  };

  const handleSelect = (id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Ignorer
    }
    onSelectAccount(id);
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.countText}>{accounts.length} comptes</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {accounts.map((acc) => {
          const isSelected = acc.id === selectedAccountId;
          return (
            <TouchableOpacity
              key={acc.id}
              activeOpacity={0.8}
              onPress={() => handleSelect(acc.id)}
              style={[
                styles.card,
                isSelected ? styles.cardSelected : undefined,
              ]}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.typeDot,
                    { backgroundColor: getBadgeColor(acc.type) },
                  ]}
                />
                {isSelected ? (
                  <View style={styles.checkCircle}>
                    <Text style={styles.checkIcon}>✓</Text>
                  </View>
                ) : (
                  <View style={styles.emptyCircle} />
                )}
              </View>

              <Text style={styles.accountName} numberOfLines={1}>
                {acc.name}
              </Text>
              <Text style={styles.accountBalance}>
                {formatFCFA(acc.balance)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  countText: {
    fontSize: typography.sizes.caption,
    color: colors.text.muted,
  },
  scrollContent: {
    paddingVertical: spacing.xs,
  },
  card: {
    width: 140,
    backgroundColor: colors.surface.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: spacing.md,
    marginRight: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  cardSelected: {
    borderColor: colors.primary.DEFAULT,
    borderWidth: 2,
    backgroundColor: colors.primary.subtle,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  typeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    color: colors.text.inverted,
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  emptyCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  accountName: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  accountBalance: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.primary.DEFAULT,
  },
});
