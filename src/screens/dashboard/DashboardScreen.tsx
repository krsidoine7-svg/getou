/**
 * Écran Tableau de Bord Principal (DashboardScreen) — GERETOU
 * Vue consolidée du patrimoine, cartes Mobile Money, flux des transactions récentes et bouton FAB (+).
 */

import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { DeleteAccountModal } from '../settings/DeleteAccountModal';
import { Account, Transaction } from '../../types/database';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

interface DashboardScreenProps {
  onOpenNewExpense: () => void;
  onOpenNewIncome: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onOpenNewExpense,
  onOpenNewIncome,
}) => {
  const { currentUser, lockSession, recordActivity } = useAuthStore();
  const { summary, fetchWallet, isLoading: isWalletLoading } = useWalletStore();
  const { recentTransactions, fetchRecentTransactions, isLoading: isTxLoading } = useTransactionStore();

  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  useEffect(() => {
    if (currentUser?.id) {
      fetchWallet(currentUser.id);
      fetchRecentTransactions(currentUser.id);
    }
  }, [currentUser?.id]);

  const onRefresh = async () => {
    if (currentUser?.id) {
      recordActivity();
      await fetchWallet(currentUser.id);
      await fetchRecentTransactions(currentUser.id);
    }
  };

  const getAccountColor = (type: string) => {
    switch (type) {
      case 'WAVE':
        return colors.brands.wave;
      case 'MOMO':
        return colors.brands.momo;
      case 'ORANGE':
        return colors.brands.orange;
      default:
        return colors.brands.cash;
    }
  };

  const otherAccounts = accountToDelete
    ? summary.accounts.filter((a) => a.id !== accountToDelete.id && a.is_archived === 0)
    : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={isWalletLoading || isTxLoading} onRefresh={onRefresh} />}
        onTouchStart={recordActivity}
      >
        {/* En-tête supérieur */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.appTitle}>GERETOU</Text>
            <Text style={styles.userSubtitle}>{currentUser?.email || 'Mode Hors-Ligne Sécurisé'}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={lockSession}
            style={styles.lockButton}
          >
            <Text style={styles.lockText}>🔒 Verrouiller</Text>
          </TouchableOpacity>
        </View>

        {/* Carte Héro : Patrimoine Consolidé */}
        <Card variant="elevated" style={styles.heroCard}>
          <Text style={styles.heroLabel}>PATRIMOINE TOTAL CONSOLIDÉ</Text>
          <Text style={styles.heroAmount}>{formatFCFA(summary.totalBalance)}</Text>

          <View style={styles.summarySplit}>
            <View style={styles.splitItem}>
              <Text style={styles.splitLabel}>Argent liquide disponible</Text>
              <Text style={[styles.splitValue, { color: colors.accent.success }]}>
                {formatFCFA(summary.liquidBalance)}
              </Text>
            </View>
            <View style={styles.splitDivider} />
            <View style={styles.splitItem}>
              <Text style={styles.splitLabel}>Fonds bloqués / Épargne</Text>
              <Text style={[styles.splitValue, { color: colors.accent.warning }]}>
                {formatFCFA(summary.lockedBalance)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Rangée d'Actions Rapides */}
        <View style={styles.quickActionRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onOpenNewExpense}
            style={[styles.quickActionBtn, styles.quickExpenseBtn]}
          >
            <Text style={styles.quickActionIcon}>💸</Text>
            <Text style={styles.quickExpenseText}>- Nouvelle Dépense</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onOpenNewIncome}
            style={[styles.quickActionBtn, styles.quickIncomeBtn]}
          >
            <Text style={styles.quickActionIcon}>💰</Text>
            <Text style={styles.quickIncomeText}>+ Nouveau Revenu</Text>
          </TouchableOpacity>
        </View>

        {/* Section Comptes & Portefeuilles */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mes Portefeuilles & Mobile Money</Text>
          <Badge label={`${summary.accounts.length} comptes`} variant="info" />
        </View>

        {summary.accounts.map((acc) => (
          <Card key={acc.id} style={styles.accountCard}>
            <View style={styles.accountHeader}>
              <View style={styles.accountIdentity}>
                <View
                  style={[
                    styles.typeIndicator,
                    { backgroundColor: getAccountColor(acc.type) },
                  ]}
                />
                <View>
                  <Text style={styles.accountTitle}>{acc.name}</Text>
                  <Text style={styles.accountMeta}>
                    {acc.type} • {acc.sub_type === 'VAULT' ? 'Coffre verrouillé' : 'Compte courant'}
                  </Text>
                </View>
              </View>
              <Text style={styles.accountBalance}>{formatFCFA(acc.balance)}</Text>
            </View>

            <View style={styles.accountActions}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setAccountToDelete(acc)}
                style={styles.deleteOptionBtn}
              >
                <Text style={styles.deleteOptionText}>Clôturer / Supprimer</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}

        {/* Section Transactions Récentes */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Transactions Récentes (SQLite)</Text>
          <Badge label={`${recentTransactions.length} entrées`} variant="neutral" />
        </View>

        {recentTransactions.length === 0 ? (
          <Card variant="subtle" style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>Aucune transaction enregistrée</Text>
            <Text style={styles.emptyDesc}>
              Appuyez sur le bouton « - Nouvelle Dépense » ci-dessus pour effectuer votre première saisie en 3 clics !
            </Text>
          </Card>
        ) : (
          recentTransactions.map((tx) => {
            const isExp = tx.type === 'EXPENSE';
            const color = isExp ? colors.accent.danger : colors.accent.success;
            const sign = isExp ? '-' : '+';
            return (
              <Card key={tx.id} style={styles.txRow}>
                <View style={styles.txLeft}>
                  <View style={[styles.txIconBox, { backgroundColor: isExp ? colors.accent.dangerBg : colors.accent.successBg }]}>
                    <Text style={{ fontSize: 16 }}>{isExp ? '🛒' : '💼'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txTitle}>
                      {tx.notes || (isExp ? 'Dépense courante' : tx.provenance || 'Revenu')}
                    </Text>
                    <Text style={styles.txDate}>
                      {new Date(tx.date).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.txAmount, { color }]}>
                  {sign}{formatFCFA(tx.amount)}
                </Text>
              </Card>
            );
          })
        )}

        {/* Avertissement de sécurité */}
        <Card variant="subtle" style={styles.infoCard}>
          <Text style={styles.infoTitle}>Règle de Sécurité Comptable GERETOU</Text>
          <Text style={styles.infoText}>
            • Aucun compte avec un solde positif ne peut être supprimé sans transfert préalable.{'\n'}
            • La clôture applique un Soft Delete pour préserver 100 % de votre historique.{'\n'}
            • Verrouillage automatique de session après 3 minutes d'inactivité.
          </Text>
        </Card>
      </ScrollView>

      {/* Bouton d'Action Flottant (FAB +) */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onOpenNewExpense}
        style={styles.fab}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Modale de clôture / suppression de compte */}
      <DeleteAccountModal
        visible={!!accountToDelete}
        account={accountToDelete}
        otherAccounts={otherAccounts}
        onClose={() => setAccountToDelete(null)}
        onSuccess={() => {
          if (currentUser?.id) {
            fetchWallet(currentUser.id);
            fetchRecentTransactions(currentUser.id);
          }
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface.canvas,
  },
  scrollContainer: {
    padding: spacing.screenPadding,
    paddingBottom: 100,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  appTitle: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.extrabold,
    color: colors.primary.DEFAULT,
    letterSpacing: 1,
  },
  userSubtitle: {
    fontSize: typography.sizes.caption,
    color: colors.text.secondary,
  },
  lockButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface.muted,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  lockText: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  heroCard: {
    backgroundColor: colors.primary.DEFAULT,
    padding: spacing.xl,
    marginBottom: spacing.base,
  },
  heroLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.primary.container,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  heroAmount: {
    fontSize: typography.sizes.hero,
    fontWeight: typography.weights.extrabold,
    color: colors.text.inverted,
    marginBottom: spacing.lg,
  },
  summarySplit: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: spacing.md,
  },
  splitItem: {
    flex: 1,
  },
  splitDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: spacing.md,
  },
  splitLabel: {
    fontSize: typography.sizes.caption,
    color: colors.primary.container,
    marginBottom: 2,
  },
  splitValue: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  quickActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  quickExpenseBtn: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.dark,
    marginRight: spacing.xs,
  },
  quickIncomeBtn: {
    backgroundColor: colors.surface.card,
    borderColor: colors.primary.container,
    marginLeft: spacing.xs,
  },
  quickActionIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  quickExpenseText: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.bold,
    color: colors.text.inverted,
  },
  quickIncomeText: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.bold,
    color: colors.primary.DEFAULT,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  accountCard: {
    marginBottom: spacing.md,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.md,
  },
  accountTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  accountMeta: {
    fontSize: typography.sizes.caption,
    color: colors.text.secondary,
  },
  accountBalance: {
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.extrabold,
    color: colors.text.primary,
  },
  accountActions: {
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    alignItems: 'flex-end',
  },
  deleteOptionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  deleteOptionText: {
    fontSize: typography.sizes.caption,
    color: colors.accent.danger,
    fontWeight: typography.weights.semibold,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: typography.sizes.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingVertical: spacing.md,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  txIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  txTitle: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  txDate: {
    fontSize: typography.sizes.caption,
    color: colors.text.muted,
    marginTop: 2,
  },
  txAmount: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.extrabold,
  },
  infoCard: {
    marginTop: spacing.md,
  },
  infoTitle: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: typography.sizes.caption,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: colors.surface.card,
  },
  fabIcon: {
    fontSize: 32,
    color: colors.text.inverted,
    fontWeight: typography.weights.bold,
    lineHeight: 34,
  },
});
