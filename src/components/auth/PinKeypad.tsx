/**
 * Composant Pavé Numérique Tactile (PinKeypad) — Forest Ledger
 * Touches 0-9 réactives, retour haptique instantané, pastilles masquées.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme/tokens';

const PIN_LENGTH = 4;

interface PinKeypadProps {
  onComplete: (pin: string) => void;
  onBiometricPress?: () => void;
  biometricAvailable?: boolean;
  biometryType?: string;
  errorMessage?: string | null;
}

export const PinKeypad: React.FC<PinKeypadProps> = ({
  onComplete,
  onBiometricPress,
  biometricAvailable = false,
  biometryType = 'Biométrie',
  errorMessage,
}) => {
  const [pin, setPin] = useState<string>('');

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Ignorer
    }
  };

  const handleDigitPress = (digit: string) => {
    if (pin.length < PIN_LENGTH) {
      triggerHaptic();
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === PIN_LENGTH) {
        setTimeout(() => {
          onComplete(newPin);
          setPin('');
        }, 100);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      triggerHaptic();
      setPin(pin.slice(0, -1));
    }
  };

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['BIO', '0', 'DEL'],
  ];

  return (
    <View style={styles.container}>
      {/* Indicateur de pastilles masquées */}
      <View style={styles.dotsContainer}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < pin.length ? styles.dotFilled : styles.dotEmpty,
              errorMessage ? styles.dotError : undefined,
            ]}
          />
        ))}
      </View>

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : (
        <Text style={styles.hintText}>Entrez votre code confidentiel à 4 chiffres</Text>
      )}

      {/* Clavier numérique 3x4 */}
      <View style={styles.keypad}>
        {keys.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((key) => {
              if (key === 'BIO') {
                return biometricAvailable && onBiometricPress ? (
                  <TouchableOpacity
                    key={key}
                    activeOpacity={0.7}
                    onPress={() => {
                      triggerHaptic();
                      onBiometricPress();
                    }}
                    style={[styles.keyButton, styles.specialKey]}
                  >
                    <Text style={styles.specialKeyText}>{biometryType === 'Face ID' ? 'FaceID' : 'Empr.'}</Text>
                  </TouchableOpacity>
                ) : (
                  <View key={key} style={styles.emptyKey} />
                );
              }

              if (key === 'DEL') {
                return (
                  <TouchableOpacity
                    key={key}
                    activeOpacity={0.7}
                    onPress={handleDelete}
                    style={[styles.keyButton, styles.specialKey]}
                  >
                    <Text style={styles.delKeyText}>Effacer</Text>
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={key}
                  activeOpacity={0.6}
                  onPress={() => handleDigitPress(key)}
                  style={styles.keyButton}
                >
                  <Text style={styles.keyText}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: spacing.base,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginHorizontal: spacing.sm,
    borderWidth: 1.5,
  },
  dotEmpty: {
    borderColor: colors.surface.border,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.DEFAULT,
  },
  dotError: {
    borderColor: colors.accent.danger,
    backgroundColor: colors.accent.danger,
  },
  hintText: {
    fontSize: typography.sizes.bodySm,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
  },
  errorText: {
    fontSize: typography.sizes.bodySm,
    color: colors.accent.danger,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xl,
  },
  keypad: {
    width: '100%',
    maxWidth: 320,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  keyButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  specialKey: {
    backgroundColor: colors.surface.muted,
    borderColor: colors.surface.border,
  },
  emptyKey: {
    width: 72,
    height: 72,
  },
  keyText: {
    fontSize: 26,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  specialKeyText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.primary.DEFAULT,
  },
  delKeyText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.text.secondary,
  },
});
