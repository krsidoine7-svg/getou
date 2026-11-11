/**
 * Composant Champ de Saisie (Input) — Forest Ledger Design System
 */

import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  KeyboardTypeOptions,
} from 'react-native';
import { colors, radii, spacing, typography } from '../../theme/tokens';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  error?: string;
  helperText?: string;
  style?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry = false,
  error,
  helperText,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.muted}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        style={[
          styles.input,
          error ? styles.inputError : undefined,
        ]}
      />
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
  },
  label: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  input: {
    minHeight: spacing.touchMinHeight,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.surface.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.base,
    fontSize: typography.sizes.body,
    color: colors.text.primary,
  },
  inputError: {
    borderColor: colors.accent.danger,
    backgroundColor: colors.accent.dangerBg,
  },
  errorText: {
    marginTop: spacing.xs,
    fontSize: typography.sizes.caption,
    color: colors.accent.danger,
    fontWeight: typography.weights.medium,
  },
  helperText: {
    marginTop: spacing.xs,
    fontSize: typography.sizes.caption,
    color: colors.text.muted,
  },
});
