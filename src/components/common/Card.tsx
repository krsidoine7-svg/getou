/**
 * Composant Carte & Conteneur — Forest Ledger Design System
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'elevated' | 'outlined' | 'subtle';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'outlined',
}) => {
  const getCardStyle = (): ViewStyle => {
    switch (variant) {
      case 'outlined':
        return {
          backgroundColor: colors.surface.card,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.surface.border,
          padding: spacing.base,
        };
      case 'subtle':
        return {
          backgroundColor: colors.surface.muted,
          borderRadius: radii.md,
          padding: spacing.base,
        };
      case 'elevated':
        return {
          backgroundColor: colors.surface.card,
          borderRadius: radii.md,
          padding: spacing.base,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        };
    }
  };

  return <View style={[getCardStyle(), style]}>{children}</View>;
};
