/**
 * Modale de Clôture / Suppression de Compte — GERETOU
 * RÈGLE STRICTE UTILISATEUR :
 * - Blocage obligatoire si solde > 0 avec demande de virement préalable vers un autre compte.
 * - Application du Soft Delete (is_archived = 1) une fois le solde à 0 pour préserver l'historique comptable.
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Account } from '../../types/database';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useWalletStore } from '../../store/useWalletStore';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

interface DeleteAccountModalProps {
  visible: boolean;
  account: Account | null;
  otherAccounts: Account[];
  onClose: () => void;
  onSuccess: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  visible,
  account,
  otherAccounts,
  onClose,
  onSuccess,
}) => {
  const { transferFundsBeforeDeletion, softDeleteAccount, isLoading } = useWalletStore();
  const [selectedDestId, setSelectedDestId] = useState<string>(
    otherAccounts[0]?.id || ''
  );

  if (!account) return null;

  const hasPositiveBalance = account.balance > 0;

  const handleTransferAndClose = async () => {
    if (!selectedDestId) {
      Alert.alert('Erreur', 'Veuillez sélectionner un compte destinataire pour transférer les fonds.');
      return;
    }

    const transferSuccess = await transferFundsBeforeDeletion(account.id, selectedDestId);
    if (!transferSuccess) {
      Alert.alert('Échec', 'Impossible de transférer les fonds.');
      return;
    }

    // Effectuer le soft delete
    const deleteSuccess = await softDeleteAccount(account.id, account.user_id);
    if (deleteSuccess) {
      Alert.alert(
        'Compte Clôturé avec Succès',
        `Les ${formatFCFA(account.balance)} ont été transférés et le compte "${account.name}" a été archivé (Soft Delete) sans perte d'historique.`
      );
      onSuccess();
      onClose();
    } else {
      Alert.alert('Erreur', "Échec de l'archivage du compte.");
    }
  };

  const handleDirectSoftDelete = async () => {
    const success = await softDeleteAccount(account.id, account.user_id);
    if (success) {
      Alert.alert(
        'Compte Archivé',
        `Le compte "${account.name}" a été archivé (Soft Delete). Son historique passé reste consultable dans vos bilans.`
      );
      onSuccess();
      onClose();
    } else {
      Alert.alert('Erreur', "Échec de l'archivage du compte.");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          {/* En-tête */}
          <View style={styles.header}>
            <Text style={styles.modalTitle}>Suppression du Compte</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.accountName}>
            {account.name} ({account.type})
          </Text>

          {hasPositiveBalance ? (
            /* CAS 1 : BLOCAGE OBLIGATOIRE CAR SOLDE > 0 */
            <View>
              <Card style={styles.blockingCard}>
                <View style={styles.badgeRow}>
                  <Badge label="Blocage Obligatoire" variant="danger" />
                  <Text style={styles.balanceHighlight}>{formatFCFA(account.balance)}</Text>
                </View>
                <Text style={styles.blockingText}>
                  Ce compte contient encore des fonds actifs. Selon la règle comptable stricte de GERETOU,
                  vous devez d'abord transférer l'intégralité du solde vers un autre portefeuille avant
                  de pouvoir le clôturer.
                </Text>
              </Card>

              {otherAccounts.length > 0 ? (
                <View style={styles.destinationSection}>
                  <Text style={styles.sectionLabel}>Transférer automatiquement vers :</Text>
                  {otherAccounts.map((dest) => (
                    <TouchableOpacity
                      key={dest.id}
                      activeOpacity={0.7}
                      onPress={() => setSelectedDestId(dest.id)}
                      style={[
                        styles.destOption,
                        selectedDestId === dest.id ? styles.destOptionSelected : undefined,
                      ]}
                    >
                      <View>
                        <Text style={styles.destName}>{dest.name}</Text>
                        <Text style={styles.destBalance}>Solde actuel : {formatFCFA(dest.balance)}</Text>
                      </View>
                      <View
                        style={[
                          styles.radioCircle,
                          selectedDestId === dest.id ? styles.radioSelected : undefined,
                        ]}
                      />
                    </TouchableOpacity>
                  ))}

                  <Button
                    title={`Transférer ${formatFCFA(account.balance)} & Clôturer`}
                    onPress={handleTransferAndClose}
                    variant="danger"
                    loading={isLoading}
                    style={{ marginTop: spacing.base }}
                  />
                </View>
              ) : (
                <View style={styles.noAccountAlert}>
                  <Text style={styles.noAccountText}>
                    Vous n'avez aucun autre compte actif vers lequel virer ces fonds.
                    Veuillez créer un autre compte (ex: Espèces ou MoMo) avant de supprimer celui-ci.
                  </Text>
                  <Button
                    title="Fermer"
                    onPress={onClose}
                    variant="outline"
                    style={{ marginTop: spacing.md }}
                  />
                </View>
              )}
            </View>
          ) : (
            /* CAS 2 : SOLDE À 0 => SOFT DELETE DIRECT */
            <View>
              <Card style={styles.softDeleteCard}>
                <Badge label="Solde Équilibré (0 FCFA)" variant="success" />
                <Text style={styles.softDeleteText}>
                  Le solde de ce compte est nul. Sa suppression appliquera un <Text style={{ fontWeight: 'bold' }}>Soft Delete</Text> :
                  le compte ne sera plus affiché dans vos saisies de dépenses, mais toutes les transactions
                  historiques associées seront précieusement conservées pour vos audits et calculs annuels.
                </Text>
              </Card>

              <View style={styles.actionRow}>
                <Button
                  title="Annuler"
                  onPress={onClose}
                  variant="outline"
                  style={{ flex: 1, marginRight: spacing.sm }}
                />
                <Button
                  title="Archiver (Soft Delete)"
                  onPress={handleDirectSoftDelete}
                  variant="danger"
                  loading={isLoading}
                  style={{ flex: 1.5, marginLeft: spacing.sm }}
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  modalBox: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface.card,
    borderRadius: radii.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  closeText: {
    fontSize: 18,
    color: colors.text.muted,
  },
  accountName: {
    fontSize: typography.sizes.bodySm,
    color: colors.text.secondary,
    marginBottom: spacing.base,
  },
  blockingCard: {
    backgroundColor: colors.accent.dangerBg,
    borderColor: colors.accent.dangerBorder,
    marginBottom: spacing.base,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  balanceHighlight: {
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.extrabold,
    color: colors.accent.danger,
  },
  blockingText: {
    fontSize: typography.sizes.bodySm,
    color: colors.accent.danger,
    lineHeight: 18,
    fontWeight: typography.weights.medium,
  },
  destinationSection: {
    marginTop: spacing.xs,
  },
  sectionLabel: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  destOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface.muted,
    marginBottom: spacing.sm,
  },
  destOptionSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.subtle,
  },
  destName: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  destBalance: {
    fontSize: typography.sizes.caption,
    color: colors.text.secondary,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.surface.border,
  },
  radioSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.DEFAULT,
  },
  noAccountAlert: {
    padding: spacing.base,
    backgroundColor: colors.surface.muted,
    borderRadius: radii.md,
  },
  noAccountText: {
    fontSize: typography.sizes.bodySm,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  softDeleteCard: {
    backgroundColor: colors.surface.muted,
    marginBottom: spacing.base,
  },
  softDeleteText: {
    fontSize: typography.sizes.bodySm,
    color: colors.text.secondary,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.base,
  },
});
