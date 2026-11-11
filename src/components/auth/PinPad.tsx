/**
 * Pastilles + pavé numérique contrôlés — GERETOU
 * Style des maquettes Stitch « Définition / Confirmation du Code PIN ».
 * Le parent détient la valeur (permet l'aperçu des chiffres et l'état d'erreur).
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Delete, RotateCcw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme/tokens';

const LETTERS: Record<string, string> = {
  '1': '', '2': 'ABC', '3': 'DEF', '4': 'GHI', '5': 'JKL',
  '6': 'MNO', '7': 'PQRS', '8': 'TUV', '9': 'WXYZ', '0': '',
};

interface PinDotsProps {
  value: string;
  length: number;
  /** Affiche les chiffres en clair au lieu des pastilles. */
  reveal?: boolean;
  error?: boolean;
  /** Incrémenter cette valeur déclenche une secousse (erreur). */
  shakeKey?: number;
}

export const PinDots: React.FC<PinDotsProps> = ({ value, length, reveal = false, error = false, shakeKey = 0 }) => {
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!shakeKey) return;
    Animated.sequence(
      [10, -10, 8, -8, 4, 0].map((toValue) =>
        Animated.timing(shake, { toValue, duration: 50, useNativeDriver: true })
      )
    ).start();
  }, [shakeKey]);

  return (
    <Animated.View style={[styles.dots, { transform: [{ translateX: shake }] }]} accessibilityLabel={`${value.length} chiffres sur ${length}`}>
      {Array.from({ length }).map((_, i) => {
        const filled = i < value.length;
        return (
          <View
            key={i}
            style={[styles.dot, filled && styles.dotFilled, error && styles.dotError]}
          >
            {reveal && filled ? <Text style={styles.dotDigit}>{value[i]}</Text> : null}
          </View>
        );
      })}
    </Animated.View>
  );
};

interface PinPadProps {
  value: string;
  length: number;
  onChange: (next: string) => void;
  disabled?: boolean;
  /** Remplace la touche « Tout effacer » en bas à gauche (ex : Biométrie). */
  leftKey?: { label: string; icon: React.ReactNode; onPress: () => void; highlighted?: boolean };
}

export const PinPad: React.FC<PinPadProps> = ({ value, length, onChange, disabled = false, leftKey }) => {
  const press = (next: string) => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onChange(next);
  };

  const digit = (d: string) => (
    <Pressable
      key={d}
      onPress={() => value.length < length && press(value + d)}
      accessibilityRole="button"
      accessibilityLabel={d}
      style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
    >
      <Text style={styles.keyDigit}>{d}</Text>
      <Text style={styles.keyLetters}>{LETTERS[d] || ' '}</Text>
    </Pressable>
  );

  return (
    <View style={[styles.pad, disabled && { opacity: 0.5 }]}>
      {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row, i) => (
        <View key={i} style={styles.row}>{row.map(digit)}</View>
      ))}
      <View style={styles.row}>
        {leftKey ? (
          <Pressable
            onPress={leftKey.onPress}
            accessibilityRole="button"
            accessibilityLabel={leftKey.label}
            style={({ pressed }) => [
              styles.key,
              styles.keySpecial,
              leftKey.highlighted && styles.keyHighlighted,
              pressed && styles.keyPressed,
            ]}
          >
            {leftKey.icon}
            <Text style={[styles.keySpecialText, leftKey.highlighted && styles.keyHighlightedText]}>{leftKey.label}</Text>
          </Pressable>
        ) : (
        <Pressable
          onPress={() => value.length > 0 && press('')}
          accessibilityRole="button"
          accessibilityLabel="Tout effacer"
          style={({ pressed }) => [styles.key, styles.keySpecial, pressed && styles.keyPressed]}
        >
          <RotateCcw size={20} color={colors.text.secondary} />
          <Text style={styles.keySpecialText}>Tout effacer</Text>
        </Pressable>
        )}
        {digit('0')}
        <Pressable
          onPress={() => value.length > 0 && press(value.slice(0, -1))}
          accessibilityRole="button"
          accessibilityLabel="Effacer"
          style={({ pressed }) => [styles.key, styles.keySpecial, pressed && styles.keyPressed]}
        >
          <Delete size={22} color={colors.text.secondary} />
          <Text style={styles.keySpecialText}>Effacer</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginVertical: spacing.base },
  dot: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: colors.primary.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dotFilled: { backgroundColor: colors.primary.DEFAULT },
  dotError: { backgroundColor: colors.accent.danger, borderColor: colors.accent.dangerBorder },
  dotDigit: { color: colors.text.inverted, fontSize: 20, fontWeight: typography.weights.bold },
  pad: { width: '100%', maxWidth: 360, alignSelf: 'center', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  key: {
    flex: 1,
    height: 60,
    borderRadius: radii.lg,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: { backgroundColor: colors.primary.subtle },
  keySpecial: { backgroundColor: colors.surface.muted },
  keyDigit: { fontSize: 24, fontWeight: typography.weights.semibold, color: colors.text.primary },
  keyLetters: { fontSize: 10, letterSpacing: 1, color: colors.text.muted, marginTop: -2 },
  keyHighlighted: { backgroundColor: colors.primary.container, borderColor: colors.primary.container },
  keyHighlightedText: { color: colors.primary.DEFAULT, fontWeight: typography.weights.semibold },
  keySpecialText: { fontSize: typography.sizes.caption, color: colors.text.secondary, marginTop: 2 },
});
