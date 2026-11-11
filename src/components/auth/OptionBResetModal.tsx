/**
 * Modale de Réinitialisation de Code PIN — Option B (Par E-mail)
 * Fonctionne même hors-ligne avec enregistrement dans sync_queue.
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { AuthService } from '../../services/auth/authService';
import { colors, radii, spacing, typography } from '../../theme/tokens';

interface OptionBResetModalProps {
  visible: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export const OptionBResetModal: React.FC<OptionBResetModalProps> = ({
  visible,
  onClose,
  defaultEmail = '',
}) => {
  const [email, setEmail] = useState<string>(defaultEmail);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSendReset = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Erreur', 'Veuillez saisir une adresse e-mail valide.');
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      const result = await AuthService.requestPasswordResetOptionB(email);
      setLoading(false);
      if (result.success) {
        setStatusMessage(result.message);
      } else {
        Alert.alert('Échec', result.message);
      }
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Erreur', err.message || 'Impossible de traiter la demande.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Réinitialisation du PIN (Option B)</Text>
          <Text style={styles.description}>
            Pour des raisons de sécurité stricte, nous pouvons vous envoyer un lien de réinitialisation
            sur votre adresse e-mail de récupération.
          </Text>

          {statusMessage ? (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>{statusMessage}</Text>
              <Button
                title="Fermer"
                onPress={onClose}
                variant="primary"
                style={{ marginTop: spacing.base }}
              />
            </View>
          ) : (
            <>
              <Input
                label="Adresse e-mail enregistrée"
                value={email}
                onChangeText={setEmail}
                placeholder="ex: amadou@example.com"
                keyboardType="email-address"
              />

              <View style={styles.buttonRow}>
                <Button
                  title="Annuler"
                  onPress={onClose}
                  variant="outline"
                  style={styles.actionBtn}
                />
                <Button
                  title="Envoyer le lien"
                  onPress={handleSendReset}
                  loading={loading}
                  variant="primary"
                  style={styles.actionBtn}
                />
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface.card,
    borderRadius: radii.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  title: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.sizes.bodySm,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.base,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    marginHorizontal: 4,
  },
  successContainer: {
    padding: spacing.base,
    backgroundColor: colors.primary.subtle,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary.container,
  },
  successText: {
    fontSize: typography.sizes.bodySm,
    color: colors.primary.DEFAULT,
    fontWeight: typography.weights.medium,
    lineHeight: 20,
  },
});
