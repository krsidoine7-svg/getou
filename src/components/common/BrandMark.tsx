/**
 * Logo GERETOU — « G » vert forêt + point ambre.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../../theme/tokens';

interface BrandMarkProps {
  size?: number;
  /** « badge » = carré arrondi plein ; « ring » = G sur fond clair. */
  variant?: 'badge' | 'ring';
}

export const BrandMark: React.FC<BrandMarkProps> = ({ size = 96, variant = 'ring' }) => {
  const filled = variant === 'badge';
  const dot = Math.round(size * 0.14);
  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: filled ? size * 0.22 : size / 2,
          backgroundColor: filled ? colors.primary.DEFAULT : colors.surface.card,
        },
        !filled && styles.ring,
      ]}
      accessibilityLabel="Logo GERETOU"
    >
      <Text
        style={{
          fontSize: size * 0.55,
          lineHeight: size * 0.7,
          fontWeight: typography.weights.extrabold,
          color: filled ? colors.primary.container : colors.primary.DEFAULT,
        }}
      >
        G
      </Text>
      <View
        style={{
          position: 'absolute',
          top: size * 0.2,
          right: size * 0.2,
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          backgroundColor: colors.accent.warning,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    shadowColor: colors.primary.DEFAULT,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
});
