/**
 * Modale de Changement de Code PIN — GERETOU
 * Vérification de l'ancien PIN, validation des règles de sécurité et confirmation.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { X, TriangleAlert, Check, KeyRound } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { showToast } from '../../store/useToastStore';
import { validatePin } from '../../services/auth/pinRules';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { colors, radii, spacing, typography } from '../../theme/tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const ChangePinModal: React.FC<Props> = ({ visible, onClose }) => {
  const { changePin } = useAuthStore();
  const keyboardHeight = useKeyboardHeight();
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setOldPin('');
    setNewPin('');
    setConfirmPin('');
    setError(null);
  }, [visible]);

  const handleSubmit = async () => {
    if (oldPin.length < 4) {
      setError('Saisissez votre ancien code PIN.');
      return;
    }
    const valErr = validatePin(newPin);
    if (valErr) {
      setError(valErr);
      return;
    }
    if (newPin !== confirmPin) {
      setError('La confirmation ne correspond pas au nouveau code PIN.');
      return;
    }
    if (oldPin === newPin) {
      setError('Le nouveau code doit être différent de l’ancien.');
      return;
    }

    setBusy(true);
    const result = await changePin(oldPin, newPin);
    setBusy(false);

    if (!result.success) {
      setError(result.error ?? 'Erreur lors de la modification.');
      return;
    }

    showToast({
      kind: 'success',
      title: 'Code PIN modifié',
      message: 'Votre nouveau code est immédiatement actif.',
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.backdrop, keyboardHeight > 0 && { paddingBottom: keyboardHeight }]}>
          <View style={[styles.sheet, keyboardHeight > 0 && styles.sheetKeyboard]}>
            <View style={styles.header}>
              <View style={styles.inline}>
                <KeyRound size={20} color={colors.primary.DEFAULT} />
                <Text style={styles.title}>Modifier mon code PIN</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fermer">
                <X size={22} color={colors.text.primary} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Text style={styles.label}>Ancien code PIN</Text>
              <View style={styles.field}>
                <TextInput
                  value={oldPin}
                  onChangeText={(t) => {
                    setOldPin(t.replace(/\D/g, ''));
                    setError(null);
                  }}
                  placeholder="••••"
                  placeholderTextColor={colors.text.muted}
                  secureTextEntry
                  keyboardType="numeric"
                  maxLength={6}
                  style={styles.input}
                />
              </View>

              <Text style={styles.label}>Nouveau code PIN (4 chiffres)</Text>
              <View style={styles.field}>
                <TextInput
                  value={newPin}
                  onChangeText={(t) => {
                    setNewPin(t.replace(/\D/g, ''));
                    setError(null);
                  }}
                  placeholder="••••"
                  placeholderTextColor={colors.text.muted}
                  secureTextEntry
                  keyboardType="numeric"
                  maxLength={6}
                  style={styles.input}
                />
              </View>

              <Text style={styles.label}>Confirmer le nouveau code PIN</Text>
              <View style={styles.field}>
                <TextInput
                  value={confirmPin}
                  onChangeText={(t) => {
                    setConfirmPin(t.replace(/\D/g, ''));
                    setError(null);
                  }}
                  placeholder="••••"
                  placeholderTextColor={colors.text.muted}
                  secureTextEntry
                  keyboardType="numeric"
                  maxLength={6}
                  style={styles.input}
                />
              </View>

              {error ? (
                <View style={styles.errorBox} accessibilityRole="alert">
                  <TriangleAlert size={16} color={colors.accent.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={handleSubmit}
                disabled={busy || oldPin.length < 4 || newPin.length < 4}
                style={({ pressed }) => [
                  styles.saveBtn,
                  (busy || oldPin.length < 4 || newPin.length < 4) && styles.saveBtnDisabled,
                  pressed && { opacity: 0.85 },
                ]}
              >
                {busy ? (
                  <ActivityIndicator color={colors.text.inverted} />
                ) : (
                  <Check size={18} color={colors.text.inverted} />
                )}
                <Text style={styles.saveBtnText}>Valider le nouveau code</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.surface.canvas,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  sheetKeyboard: {
    maxHeight: '96%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  content: {
    padding: spacing.base,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  label: {
    marginTop: spacing.xs,
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
  },
  field: {
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.surface.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  input: {
    fontSize: 22,
    letterSpacing: 4,
    color: colors.text.primary,
    outlineStyle: 'none',
  } as never,
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.dangerBg,
    borderColor: colors.accent.dangerBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  errorText: {
    flex: 1,
    color: colors.accent.danger,
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.semibold,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.primary.DEFAULT,
    marginTop: spacing.md,
  },
  saveBtnDisabled: {
    backgroundColor: colors.text.muted,
  },
  saveBtnText: {
    color: colors.text.inverted,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
});
