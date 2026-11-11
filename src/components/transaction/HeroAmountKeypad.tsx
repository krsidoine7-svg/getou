/**
 * Composant Saisie Montant Hero (HeroAmountKeypad) — Forest Ledger
 * Affichage géant en FCFA, puces d'incrémentation instantanée et retour haptique.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

interface HeroAmountKeypadProps {
  amount: number;
  onAmountChange: (newAmount: number) => void;
  type?: 'EXPENSE' | 'INCOME';
}

export const HeroAmountKeypad: React.FC<HeroAmountKeypadProps> = ({
  amount,
  onAmountChange,
  type = 'EXPENSE',
}) => {
  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Ignorer
    }
  };

  const handleIncrement = (increment: number) => {
    triggerHaptic();
    onAmountChange(amount + increment);
  };

  const handleDigitPress = (digit: string) => {
    triggerHaptic();
    const currentStr = amount === 0 ? '' : amount.toString();
    const nextStr = currentStr + digit;
    const parsed = parseInt(nextStr, 10);
    if (!isNaN(parsed) && parsed <= 100000000) {
      onAmountChange(parsed);
    }
  };

  const handleBackspace = () => {
    triggerHaptic();
    const currentStr = amount.toString();
    if (currentStr.length <= 1) {
      onAmountChange(0);
    } else {
      const nextStr = currentStr.slice(0, -1);
      onAmountChange(parseInt(nextStr, 10) || 0);
    }
  };

  const handleClearAll = () => {
    triggerHaptic();
    onAmountChange(0);
  };

  const isExpense = type === 'EXPENSE';
  const prefix = isExpense ? '-' : '+';
  const primaryAmountColor = isExpense ? colors.accent.danger : colors.accent.success;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>
          {isExpense ? 'MONTANT DE LA DÉPENSE' : 'MONTANT ENCAISSÉ'}
        </Text>
        <View style={styles.modeBadge}>
          <Text style={styles.modeText}>Mode Express</Text>
        </View>
      </View>

      {/* Affichage Héro du Montant */}
      <View style={styles.amountContainer}>
        <Text style={[styles.amountText, { color: primaryAmountColor }]}>
          {amount > 0 ? `${prefix}${formatFCFA(amount)}` : `0 FCFA`}
        </Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleBackspace}
          onLongPress={handleClearAll}
          style={styles.backspaceButton}
        >
          <Text style={styles.backspaceIcon}>⌫</Text>
        </TouchableOpacity>
      </View>

      {/* Puces Raccourcis Rapides */}
      <View style={styles.chipsRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleIncrement(1000)}
          style={styles.chip}
        >
          <Text style={styles.chipText}>+1 000</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleIncrement(5000)}
          style={styles.chip}
        >
          <Text style={styles.chipText}>+5 000</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleIncrement(10000)}
          style={styles.chip}
        >
          <Text style={styles.chipText}>+10 000</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleIncrement(25000)}
          style={[styles.chip, styles.chipHighlight]}
        >
          <Text style={[styles.chipText, styles.chipHighlightText]}>+25 000</Text>
        </TouchableOpacity>
      </View>

      {/* Pavé numérique tactile 3x4 compact */}
      <View style={styles.keypad}>
        {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['00', '0', 'C']].map((row, rIdx) => (
          <View key={rIdx} style={styles.keyRow}>
            {row.map((k) => (
              <TouchableOpacity
                key={k}
                activeOpacity={0.6}
                onPress={() => {
                  if (k === 'C') handleClearAll();
                  else if (k === '00') {
                    if (amount > 0) handleDigitPress('00');
                  } else {
                    handleDigitPress(k);
                  }
                }}
                style={styles.keyButton}
              >
                <Text style={styles.keyLabel}>{k}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: spacing.base,
    marginBottom: spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  modeBadge: {
    backgroundColor: colors.primary.subtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  modeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.primary.DEFAULT,
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
  },
  amountText: {
    fontSize: typography.sizes.hero,
    fontWeight: typography.weights.extrabold,
    letterSpacing: -0.5,
  },
  backspaceButton: {
    padding: spacing.sm,
    backgroundColor: colors.surface.muted,
    borderRadius: radii.md,
  },
  backspaceIcon: {
    fontSize: 20,
    color: colors.text.secondary,
    fontWeight: typography.weights.bold,
  },
  chipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.md,
  },
  chip: {
    flex: 1,
    backgroundColor: colors.primary.subtle,
    borderWidth: 1,
    borderColor: colors.primary.container,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  chipHighlight: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  chipText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.primary.DEFAULT,
  },
  chipHighlightText: {
    color: colors.text.inverted,
  },
  keypad: {
    marginTop: spacing.xs,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  keyButton: {
    flex: 1,
    height: 48,
    marginHorizontal: 4,
    backgroundColor: colors.surface.canvas,
    borderWidth: 1,
    borderColor: colors.surface.border,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyLabel: {
    fontSize: 20,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
});
