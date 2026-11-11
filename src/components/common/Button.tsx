/**
 * Composant Bouton — Forest Ledger Design System
 * Respect strict de l'accessibilité : zone tactile >= 48px, contraste élevé, haptics.
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}) => {
  const handlePress = () => {
    if (disabled || loading) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Ignorer si indisponible
    }
    onPress();
  };

  const getContainerStyle = (): ViewStyle => {
    const base: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      minHeight: spacing.touchMinHeight,
      paddingHorizontal: spacing.base,
    };

    switch (variant) {
      case 'primary':
        return {
          ...base,
          backgroundColor: disabled ? colors.surface.border : colors.primary.DEFAULT,
        };
      case 'secondary':
        return {
          ...base,
          backgroundColor: disabled ? colors.surface.muted : colors.primary.subtle,
          borderWidth: 1,
          borderColor: colors.primary.container,
        };
      case 'outline':
        return {
          ...base,
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: disabled ? colors.surface.border : colors.primary.DEFAULT,
        };
      case 'danger':
        return {
          ...base,
          backgroundColor: disabled ? colors.surface.border : colors.accent.danger,
        };
      case 'ghost':
        return {
          ...base,
          backgroundColor: 'transparent',
        };
      default:
        return base;
    }
  };

  const getTextStyle = (): TextStyle => {
    const base: TextStyle = {
      fontWeight: typography.weights.bold,
      fontSize: size === 'sm' ? typography.sizes.bodySm : typography.sizes.body,
    };

    switch (variant) {
      case 'primary':
      case 'danger':
        return {
          ...base,
          color: disabled ? colors.text.muted : colors.text.inverted,
        };
      case 'secondary':
        return {
          ...base,
          color: disabled ? colors.text.muted : colors.primary.DEFAULT,
        };
      case 'outline':
      case 'ghost':
        return {
          ...base,
          color: disabled ? colors.text.muted : colors.primary.DEFAULT,
        };
      default:
        return base;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[getContainerStyle(), style]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? colors.text.inverted : colors.primary.DEFAULT}
        />
      ) : (
        <>
          {icon ? <>{icon}</> : null}
          <Text style={[getTextStyle(), icon ? { marginLeft: spacing.sm } : undefined, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};
