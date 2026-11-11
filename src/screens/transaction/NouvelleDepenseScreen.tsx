/**
 * Nouvelle Dépense (saisie rapide) — GERETOU
 * Maquette Stitch « Nouvelle Dépense (Saisie Rapide) ».
 */

import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { X, TriangleAlert, Check, NotebookPen, CircleX, CircleCheck } from 'lucide-react-native';
import { AmountCard } from '../../components/transaction/AmountCard';
import { AccountSelector } from '../../components/transaction/AccountSelector';
import { CategoryGrid } from '../../components/transaction/CategoryGrid';
import { useAuthStore } from '../../store/useAuthStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { showToast } from '../../store/useToastStore';
import { TransactionNature, TransactionUrgency } from '../../types/database';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

const PRESETS = [1000, 5000, 10000, 25000];

const NATURES: { value: TransactionNature; label: string }[] = [
  { value: 'REGULAR', label: 'Régulière' },
  { value: 'UNEXPECTED', label: 'Imprévue' },
  { value: 'REIMBURSABLE', label: 'Remboursable' },
];

const URGENCIES: { value: TransactionUrgency; label: string }[] = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'Important' },
  { value: 'CRITICAL', label: 'Urgent' },
];

interface NouvelleDepenseScreenProps {
  onClose: () => void;
  onSwitchToIncome: () => void;
  onSuccess: () => void;
}

export const NouvelleDepenseScreen: React.FC<NouvelleDepenseScreenProps> = ({ onClose, onSwitchToIncome, onSuccess }) => {
  const { currentUser, recordActivity } = useAuthStore();
  const { summary, fetchWallet } = useWalletStore();
  const { categories, selectedCategoryId, selectCategory, fetchCategories, createExpense, addCustomCategory, isLoading } =
    useTransactionStore();

  const accounts = summary.accounts.filter((a) => a.is_archived === 0);
  const [amount, setAmount] = useState(0);
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id ?? '');
  const [notes, setNotes] = useState('');
  const [nature, setNature] = useState<TransactionNature>('REGULAR');
  const [urgency, setUrgency] = useState<TransactionUrgency>('NORMAL');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories('EXPENSE');
  }, []);

  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) setSelectedAccountId(accounts[0].id);
  }, [summary.accounts]);

  // L'erreur disparaît dès que l'utilisateur corrige sa saisie
  useEffect(() => setFormError(null), [amount, selectedAccountId, selectedCategoryId]);

  const submit = async () => {
    if (!currentUser) return;
    recordActivity();
    if (amount <= 0) return setFormError('Saisissez un montant supérieur à 0 FCFA.');
    if (!selectedAccountId) return setFormError('Choisissez le compte qui paie cette dépense.');
    if (!selectedCategoryId) return setFormError('Choisissez une catégorie.');

    const tx = await createExpense({
      userId: currentUser.id,
      amount,
      accountId: selectedAccountId,
      categoryId: selectedCategoryId,
      nature,
      urgency,
      notes: notes.trim() || undefined,
    });
    if (!tx) return setFormError("Impossible d'enregistrer la dépense. Réessayez.");

    await fetchWallet(currentUser.id);
    showToast({ kind: 'success', title: 'Dépense enregistrée', message: `-${formatFCFA(amount)} débités de votre compte.` });
    onSuccess();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Fermer" style={styles.closeBtn}>
          <X size={22} color={colors.text.primary} />
        </Pressable>
        <View style={styles.segment} accessibilityRole="tablist">
          <View style={[styles.segmentItem, styles.segmentActive]} accessibilityRole="tab" accessibilityState={{ selected: true }}>
            <Text style={styles.segmentTextActive}>Dépense</Text>
          </View>
          <Pressable onPress={onSwitchToIncome} accessibilityRole="tab" accessibilityState={{ selected: false }} style={styles.segmentItem}>
            <Text style={styles.segmentText}>Revenu</Text>
          </Pressable>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" onTouchStart={recordActivity}>
        <AmountCard label="Montant décaissé" amount={amount} onChange={setAmount} presets={PRESETS} tone="expense" />

        <View>
          <Text style={styles.sectionLabel}>À quoi ça a servi ?</Text>
          <View style={styles.noteField}>
            <NotebookPen size={18} color={colors.text.secondary} />
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="ex : riz, huile et légumes au marché"
              placeholderTextColor={colors.text.muted}
              maxLength={120}
              accessibilityLabel="Motif de la dépense"
              style={styles.noteInput}
            />
            {notes ? (
              <Pressable onPress={() => setNotes('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Effacer le motif">
                <CircleX size={18} color={colors.text.muted} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <AccountSelector accounts={accounts} selectedAccountId={selectedAccountId} onSelectAccount={setSelectedAccountId} label="Compte source" />

        <CategoryGrid
          categories={categories}
          selectedCategoryId={selectedCategoryId || ''}
          onSelectCategory={selectCategory}
          onAddCategory={async (name, icon, color) => !!(await addCustomCategory(name, icon, color, 'EXPENSE'))}
        />

        <View style={styles.box}>
          <Text style={styles.boxLabel}>Typologie de dépense</Text>
          <View style={styles.segmentWide} accessibilityRole="radiogroup">
            {NATURES.map((n) => {
              const on = n.value === nature;
              return (
                <Pressable
                  key={n.value}
                  onPress={() => setNature(n.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  style={[styles.segmentWideItem, on && styles.segmentWideActive]}
                >
                  <Text style={[styles.segmentWideText, on && styles.segmentWideTextActive]}>{n.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.box, styles.boxRow]}>
          <Text style={[styles.boxLabel, { marginBottom: 0, flex: 1 }]}>Degré d'importance</Text>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {URGENCIES.map((u) => {
              const on = u.value === urgency;
              const warn = u.value !== 'NORMAL';
              return (
                <Pressable
                  key={u.value}
                  onPress={() => setUrgency(u.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  style={[styles.chip, on && (warn ? styles.chipWarn : styles.chipOn)]}
                >
                  <Text style={[styles.chipText, on && { color: warn ? '#B45309' : colors.primary.DEFAULT, fontWeight: typography.weights.bold }]}>
                    {u.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {formError ? (
          <View style={styles.formError} accessibilityRole="alert">
            <TriangleAlert size={16} color={colors.accent.danger} />
            <Text style={styles.formErrorText}>{formError}</Text>
          </View>
        ) : null}
        <Pressable
          onPress={submit}
          disabled={amount <= 0 || isLoading}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cta, (amount <= 0 || isLoading) && styles.ctaDisabled, pressed && styles.ctaPressed]}
        >
          {isLoading ? <ActivityIndicator color={colors.text.inverted} /> : <Check size={20} color={colors.text.inverted} strokeWidth={2.6} />}
          <Text style={styles.ctaText}>{amount > 0 ? `Valider la dépense (${formatFCFA(amount)})` : 'Valider la dépense'}</Text>
        </Pressable>
        <View style={styles.footNote}>
          <CircleCheck size={13} color={colors.text.secondary} />
          <Text style={styles.footNoteText}>Enregistrement local immédiat, même sans connexion</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.canvas },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface.card },
  segment: { flexDirection: 'row', backgroundColor: colors.brands.waveBg, borderRadius: radii.lg, padding: 4 },
  segmentItem: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.md },
  segmentActive: { backgroundColor: colors.primary.DEFAULT },
  segmentText: { fontSize: typography.sizes.body, color: colors.text.secondary, fontWeight: typography.weights.medium },
  segmentTextActive: { fontSize: typography.sizes.body, color: colors.text.inverted, fontWeight: typography.weights.bold },
  content: { paddingHorizontal: spacing.base, paddingBottom: 160, gap: spacing.lg },
  sectionLabel: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  noteField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  noteInput: { flex: 1, fontSize: typography.sizes.body, color: colors.text.primary, paddingVertical: spacing.sm, outlineStyle: 'none' } as never,
  box: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: spacing.md,
  },
  boxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  boxLabel: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text.primary, marginBottom: spacing.sm },
  segmentWide: { flexDirection: 'row', backgroundColor: colors.brands.waveBg, borderRadius: radii.md, padding: 3 },
  segmentWideItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radii.sm },
  segmentWideActive: { backgroundColor: colors.surface.card },
  segmentWideText: { fontSize: typography.sizes.bodySm, color: colors.text.secondary },
  segmentWideTextActive: { color: colors.primary.DEFAULT, fontWeight: typography.weights.bold },
  chips: { flexDirection: 'row', gap: 6 },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.md, borderWidth: 1, borderColor: colors.surface.border },
  chipOn: { borderColor: colors.primary.DEFAULT, backgroundColor: colors.primary.subtle },
  chipWarn: { borderColor: colors.accent.warning, backgroundColor: colors.accent.warningBg },
  chipText: { fontSize: typography.sizes.bodySm, color: colors.text.primary },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface.card,
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  formError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.dangerBg,
    borderColor: colors.accent.dangerBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  formErrorText: { flex: 1, color: colors.accent.danger, fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.primary.DEFAULT,
  },
  ctaDisabled: { backgroundColor: colors.text.muted },
  ctaPressed: { backgroundColor: colors.primary.dark },
  ctaText: { color: colors.text.inverted, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold },
  footNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.sm },
  footNoteText: { fontSize: typography.sizes.caption, color: colors.text.secondary },
});
