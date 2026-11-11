/**
 * Jauge de budget — GERETOU
 * Vert (sain) → ambre (seuil d'alerte) → orange (imminent, 95 %) → rouge (dépassé).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BudgetStatus } from '../../services/budget/budgetCalc';
import { colors, radii } from '../../theme/tokens';

export const STATUS_COLORS: Record<BudgetStatus, { fg: string; bg: string; border: string }> = {
  healthy: { fg: colors.primary.DEFAULT, bg: colors.primary.subtle, border: colors.primary.container },
  warning: { fg: colors.accent.warning, bg: colors.accent.warningBg, border: colors.accent.warningBorder },
  imminent: { fg: '#EA580C', bg: '#FFEDD5', border: '#FDBA74' },
  over: { fg: colors.accent.danger, bg: colors.accent.dangerBg, border: colors.accent.danger },
};

interface BudgetGaugeProps {
  ratio: number;
  status: BudgetStatus;
  height?: number;
}

export const BudgetGauge: React.FC<BudgetGaugeProps> = ({ ratio, status, height = 8 }) => {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <View
      style={[styles.track, { height, borderRadius: height / 2 }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
    >
      <View style={{ width: `${pct}%`, height, borderRadius: height / 2, backgroundColor: STATUS_COLORS[status].fg }} />
    </View>
  );
};

const styles = StyleSheet.create({
  track: { backgroundColor: colors.brands.waveBg, overflow: 'hidden', borderRadius: radii.full },
});
