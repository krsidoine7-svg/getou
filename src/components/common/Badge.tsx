/**
 * Composant Badge de Statut — Forest Ledger Design System
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme/tokens';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  style,
}) => {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: colors.accent.successBg, border: colors.accent.successBorder, text: colors.accent.success };
      case 'warning':
        return { bg: colors.accent.warningBg, border: colors.accent.warningBorder, text: colors.accent.warning };
      case 'danger':
        return { bg: colors.accent.dangerBg, border: colors.accent.dangerBorder, text: colors.accent.danger };
      case 'info':
        return { bg: colors.primary.subtle, border: colors.primary.container, text: colors.primary.DEFAULT };
      default:
        return { bg: colors.surface.muted, border: colors.surface.border, text: colors.text.secondary };
    }
  };

  const c = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }, style]}>
      <Text style={[styles.text, { color: c.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  text: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
  },
});
