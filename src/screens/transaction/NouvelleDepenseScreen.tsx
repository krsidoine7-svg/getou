/**
 * Écran Saisie Rapide d'une Dépense (NouvelleDepenseScreen) — GERETOU
 * 3 clics, débit de compte immédiat, transaction SQLite ACID et retour haptique.
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
import { CategoryGrid } from '../../components/transaction/CategoryGrid';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

interface NouvelleDepenseScreenProps {
  onClose: () => void;
  onSwitchToIncome: () => void;
  onSuccess: () => void;
}

export const NouvelleDepenseScreen: React.FC<NouvelleDepenseScreenProps> = ({
  onClose,
  onSwitchToIncome,
  onSuccess,
}) => {
  const { currentUser } = useAuthStore();
  const { summary, fetchWallet } = useWalletStore();
  const {
    categories,
    selectedCategoryId,
    selectCategory,
    fetchCategories,
    createExpense,
    addCustomCategory,
    isLoading,
  } = useTransactionStore();

  const [amount, setAmount] = useState<number>(0);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    summary.accounts[0]?.id || ''
  );
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    fetchCategories('EXPENSE');
  }, []);

  useEffect(() => {
    if (!selectedAccountId && summary.accounts.length > 0) {
      setSelectedAccountId(summary.accounts[0].id);
    }
  }, [summary.accounts]);

  const handleSubmit = async () => {
    if (!currentUser) return;

    if (amount <= 0) {
      Alert.alert('Montant Invalide', 'Veuillez saisir un montant supérieur à 0 FCFA.');
      return;
    }

    if (!selectedAccountId) {
      Alert.alert('Compte Invalide', 'Veuillez choisir un portefeuille pour régler cette dépense.');
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert('Catégorie Requise', 'Veuillez sélectionner une catégorie de dépense.');
      return;
    }

    const tx = await createExpense({
      userId: currentUser.id,
      amount,
      accountId: selectedAccountId,
      categoryId: selectedCategoryId,
      notes: notes.trim() || undefined,
    });

    if (tx) {
      // Rafraîchir les soldes
      await fetchWallet(currentUser.id);
      Alert.alert(
        'Dépense Enregistrée',
        `-${formatFCFA(amount)} ont été débités de votre compte. Vos bilans sont à jour.`,
        [{ text: 'OK', onPress: () => { onSuccess(); onClose(); } }]
      );
    } else {
      Alert.alert('Erreur', "Impossible d'enregistrer la dépense.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Sticky avec commutateur Dépense / Revenu */}
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        {/* Sélecteur de type Dépense / Revenu */}
        <View style={styles.segmentContainer}>
          <View style={[styles.segmentPill, styles.segmentPillActive]}>
            <Text style={styles.segmentTextActive}>Dépense</Text>
          </View>
          <TouchableOpacity activeOpacity={0.7} onPress={onSwitchToIncome} style={styles.segmentPill}>
            <Text style={styles.segmentTextInactive}>Revenu</Text>
          </TouchableOpacity>
        </View>

        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Titre & Sous-titre */}
        <View style={styles.titleSection}>
          <Text style={styles.screenTitle}>Nouvelle Dépense</Text>
          <Text style={styles.screenSubtitle}>Saisie rapide • 100 % hors-ligne (SQLite)</Text>
        </View>

        {/* 1. Clavier Héro & Montant Express */}
        <HeroAmountKeypad
          amount={amount}
          onAmountChange={setAmount}
          type="EXPENSE"
        />

        {/* 2. Sélecteur de Portefeuille Débité */}
        <AccountSelector
          accounts={summary.accounts.filter((a) => a.is_archived === 0)}
          selectedAccountId={selectedAccountId}
          onSelectAccount={setSelectedAccountId}
          label="Débiter depuis :"
        />

        {/* 3. Grille des Catégories */}
        <CategoryGrid
          categories={categories}
          selectedCategoryId={selectedCategoryId || ''}
          onSelectCategory={selectCategory}
          onAddCategory={async (name, icon, color) => {
            const cat = await addCustomCategory(name, icon, color, 'EXPENSE');
            return !!cat;
          }}
          type="EXPENSE"
        />

        {/* 4. Note / Description Optionnelle */}
        <Input
          label="Motif ou note (optionnel)"
          value={notes}
          onChangeText={setNotes}
          placeholder="ex: Marché d'Adjamé, Ticket péage..."
        />
      </ScrollView>

      {/* CTA Sticky en bas */}
      <View style={styles.footerSticky}>
        <Button
          title={amount > 0 ? `Valider la dépense (-${formatFCFA(amount)})` : 'Valider la dépense'}
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
