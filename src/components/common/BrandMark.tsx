/**
 * Logo GERETOU — « G » vert forêt + point ambre.
 * Conforme au design minimaliste & micro-animations douces.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors, typography } from '../../theme/tokens';

export interface BrandMarkProps {
  size?: number;
  /** « badge » = carré arrondi plein ; « ring » = G sur fond clair. */
  variant?: 'badge' | 'ring';
  /** Anime l'apparition du logo et la pulsation discrète du point ambre */
  animated?: boolean;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ size = 96, variant = 'ring', animated = false }) => {
  const filled = variant === 'badge';
  const dot = Math.round(size * 0.14);

  // Valeurs animées (utilisées si animated === true)
  const containerScale = useRef(new Animated.Value(animated ? 0.9 : 1)).current;
  const containerOpacity = useRef(new Animated.Value(animated ? 0 : 1)).current;
  const dotScale = useRef(new Animated.Value(animated ? 0 : 1)).current;
  const dotPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animated) return;

    // 1. Entrée douce du conteneur (fade-in + léger scale-up)
    Animated.parallel([
      Animated.timing(containerOpacity, {
        toValue: 1,
        duration: 550,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(containerScale, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 2. Déploiement du point ambre avec micro-ressort
      Animated.spring(dotScale, {
        toValue: 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }).start(() => {
        // 3. Pulsation d'ambiance ultra-subtile (respiration sereine du point)
        Animated.loop(
          Animated.sequence([
            Animated.timing(dotPulse, {
              toValue: 1.15,
              duration: 1200,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(dotPulse, {
              toValue: 1,
              duration: 1200,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ])
        ).start();
      });
    });
  }, [animated, containerOpacity, containerScale, dotScale, dotPulse]);

  const combinedDotScale = Animated.multiply(dotScale, dotPulse);

  return (
    <Animated.View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: filled ? size * 0.22 : size / 2,
          backgroundColor: filled ? colors.primary.DEFAULT : colors.surface.card,
          transform: [{ scale: containerScale }],
          opacity: containerOpacity,
        },
        !filled && styles.ring,
      ]}
      accessibilityLabel="Logo GERETOU"
    >
      <Text
        style={{
          fontSize: size * 0.52,
          lineHeight: size * 0.65,
          fontWeight: typography.weights.extrabold,
          color: filled ? colors.primary.container : colors.primary.DEFAULT,
        }}
      >
        G
      </Text>
      <Animated.View
        style={{
          position: 'absolute',
          top: size * 0.2,
          right: size * 0.2,
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          backgroundColor: colors.accent.warning,
          transform: [{ scale: combinedDotScale }],
        }}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    borderWidth: 1,
    borderColor: colors.surface.border,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
});
