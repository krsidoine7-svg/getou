/**
 * Écran Saisie Rapide d'un Revenu (NouveauRevenuScreen) — GERETOU
 * Intègre la Règle Comptable Stricte : Crédit/Emprunt routé vers Dettes passives.
 */

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { HeroAmountKeypad } from '../../components/transaction/HeroAmountKeypad';
import { AccountSelector } from '../../components/transaction/AccountSelector';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useAuthStore } from '../../store/useAuthStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { IncomeProvenance } from '../../types/database';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

interface NouveauRevenuScreenProps {
  onClose: () => void;
  onSwitchToExpense: () => void;
  onSuccess: () => void;
}

interface ProvenanceOption {
  id: IncomeProvenance;
  title: string;
  subtitle: string;
  emoji: string;
  isDebt?: boolean;
}

const PROVENANCES: ProvenanceOption[] = [
  { id: 'SALARY', title: 'Salaire', subtitle: 'Revenu fixe récurrent', emoji: '💼' },
  { id: 'FREELANCE', title: 'Prestation / Freelance', subtitle: 'Facture client', emoji: '💻' },
  { id: 'SALE', title: 'Vente d’un bien', subtitle: 'Commerce, objet', emoji: '🛍️' },
  { id: 'GIFT', title: 'Don / Cadeau', subtitle: 'Soutien famille', emoji: '🎁' },
  { id: 'LOAN', title: 'Crédit / Emprunt', subtitle: 'Routé vers Dettes', emoji: '🤝', isDebt: true },
  { id: 'OTHER', title: 'Autre provenance', subtitle: 'Entrée ponctuelle', emoji: '⚡' },
];

export const NouveauRevenuScreen: React.FC<NouveauRevenuScreenProps> = ({
  onClose,
  onSwitchToExpense,
  onSuccess,
}) => {
  const { currentUser } = useAuthStore();
  const { summary, fetchWallet } = useWalletStore();
  const { createIncome, isLoading } = useTransactionStore();

  const [amount, setAmount] = useState<number>(0);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    summary.accounts[0]?.id || ''
  );
  const [provenance, setProvenance] = useState<IncomeProvenance>('SALARY');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (!selectedAccountId && summary.accounts.length > 0) {
      setSelectedAccountId(summary.accounts[0].id);
    }
  }, [summary.accounts]);

  const isLoanSelected = provenance === 'LOAN';

  const handleSubmit = async () => {
    if (!currentUser) return;

    if (amount <= 0) {
      Alert.alert('Montant Invalide', 'Veuillez saisir un montant supérieur à 0 FCFA.');
      return;
    }

    if (!selectedAccountId) {
      Alert.alert('Compte Invalide', 'Veuillez choisir un portefeuille de destination.');
      return;
    }

    const result = await createIncome({
      userId: currentUser.id,
      amount,
      accountId: selectedAccountId,
      provenance,
      notes: notes.trim() || undefined,
    });

    if (result) {
      await fetchWallet(currentUser.id);
      if (result.isDebtCreated) {
        Alert.alert(
          'Crédit Comptabilisé en Dette',
          `+${formatFCFA(amount)} ont été ajoutés sur votre compte. Conformément à la règle comptable stricte de GERETOU, cette somme a été enregistrée dans vos Dettes à rembourser et n'augmente pas votre revenu net.`,
          [{ text: 'Compris', onPress: () => { onSuccess(); onClose(); } }]
        );
      } else {
        Alert.alert(
          'Revenu Enregistré',
          `+${formatFCFA(amount)} crédités sur votre compte avec succès.`,
          [{ text: 'OK', onPress: () => { onSuccess(); onClose(); } }]
        );
      }
    } else {
      Alert.alert('Erreur', "Impossible d'enregistrer le revenu.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Sticky */}
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.segmentContainer}>
          <TouchableOpacity activeOpacity={0.7} onPress={onSwitchToExpense} style={styles.segmentPill}>
            <Text style={styles.segmentTextInactive}>Dépense</Text>
          </TouchableOpacity>
          <View style={[styles.segmentPill, styles.segmentPillActive]}>
            <Text style={styles.segmentTextActive}>Revenu</Text>
          </View>
        </View>

        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.titleSection}>
          <Text style={styles.screenTitle}>Nouveau Revenu / Gain</Text>
          <Text style={styles.screenSubtitle}>Règle comptable stricte : emprunts imputés en passif</Text>
        </View>

        {/* 1. Clavier Héro & Montant */}
        <HeroAmountKeypad
          amount={amount}
          onAmountChange={setAmount}
          type="INCOME"
        />

        {/* 2. Provenance de l'argent */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Provenance de l'argent *</Text>
          <View style={styles.provenanceGrid}>
            {PROVENANCES.map((opt) => {
              const isSelected = opt.id === provenance;
              return (
                <TouchableOpacity
                  key={opt.id}
                  activeOpacity={0.8}
                  onPress={() => setProvenance(opt.id)}
                  style={[
                    styles.provTile,
                    isSelected ? styles.provTileSelected : undefined,
                    opt.isDebt ? styles.provTileDebt : undefined,
                  ]}
                >
                  <View style={styles.provTileHeader}>
                    <Text style={styles.provEmoji}>{opt.emoji}</Text>
                    {opt.isDebt ? (
                      <Badge label="Dette" variant="warning" />
                    ) : isSelected ? (
                      <View style={styles.checkBadge}>
                        <Text style={styles.checkText}>✓</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.provTitle, isSelected ? styles.provTitleSelected : undefined]}>
                    {opt.title}
                  </Text>
                  <Text style={styles.provSubtitle}>{opt.subtitle}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Alerte Règle Comptable Stricte si Emprunt */}
        {isLoanSelected ? (
          <Card style={styles.loanWarningCard}>
            <View style={styles.warningHeader}>
              <Text style={styles.warningTitle}>⚠️ Règle Comptable Stricte GERETOU</Text>
              <Badge label="Non-Revenu" variant="warning" />
            </View>
            <Text style={styles.warningText}>
              Un crédit ou emprunt n'est pas un revenu d'activité ! Cette somme augmentera votre solde liquide
              mais sera simultanément enregistrée comme une **Dette à rembourser** pour ne pas fausser vos bilans.
            </Text>
          </Card>
        ) : null}

        {/* 3. Sélecteur de Portefeuille Destinataire */}
        <AccountSelector
          accounts={summary.accounts.filter((a) => a.is_archived === 0)}
          selectedAccountId={selectedAccountId}
          onSelectAccount={setSelectedAccountId}
          label="Créditer sur le compte :"
        />

        {/* 4. Motif / Description */}
        <Input
          label="Motif ou source"
          value={notes}
          onChangeText={setNotes}
          placeholder="ex: Virement Entreprise, Vente vélo..."
        />
      </ScrollView>

      {/* Footer Sticky */}
      <View style={styles.footerSticky}>
        <Button
          title={amount > 0 ? `Enregistrer le revenu (+${formatFCFA(amount)})` : 'Enregistrer le revenu'}
          onPress={handleSubmit}
          loading={isLoading}
          disabled={amount <= 0}
          variant="primary"
          style={styles.submitBtn}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface.canvas,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: typography.weights.bold,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface.muted,
    borderRadius: radii.full,
    padding: 3,
  },
  segmentPill: {
    paddingHorizontal: spacing.base,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  segmentPillActive: {
    backgroundColor: colors.primary.DEFAULT,
  },
  segmentTextActive: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.bold,
    color: colors.text.inverted,
  },
  segmentTextInactive: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
  },
  scrollContainer: {
    padding: spacing.screenPadding,
    paddingBottom: 90,
  },
  titleSection: {
    marginBottom: spacing.md,
  },
  screenTitle: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.extrabold,
    color: colors.primary.DEFAULT,
  },
  screenSubtitle: {
    fontSize: typography.sizes.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  section: {
    marginBottom: spacing.base,
  },
  sectionLabel: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  provenanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  provTile: {
    width: '48.5%',
    backgroundColor: colors.surface.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  provTileSelected: {
    borderColor: colors.primary.DEFAULT,
    borderWidth: 2,
    backgroundColor: colors.primary.subtle,
  },
  provTileDebt: {
    borderColor: colors.accent.warningBorder,
  },
  provTileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  provEmoji: {
    fontSize: 20,
  },
  checkBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: colors.text.inverted,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  provTitle: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  provTitleSelected: {
    color: colors.primary.DEFAULT,
  },
  provSubtitle: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  loanWarningCard: {
    backgroundColor: colors.accent.warningBg,
    borderColor: colors.accent.warningBorder,
    marginBottom: spacing.base,
  },
  warningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  warningTitle: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.bold,
    color: colors.accent.warning,
  },
  warningText: {
    fontSize: typography.sizes.caption,
    color: colors.accent.warning,
    lineHeight: 18,
    fontWeight: typography.weights.medium,
  },
  footerSticky: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
  },
  submitBtn: {
    width: '100%',
  },
});
