/**
 * Nouveau Revenu / Gain — GERETOU
 * Maquette Stitch « Nouveau Revenu / Gain ».
 * Règle comptable : un crédit / emprunt est enregistré comme dette, pas comme revenu.
 */

import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { X, TriangleAlert, Check, NotebookPen, CircleX, CircleCheck, Info, ArrowDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { AmountCard } from '../../components/transaction/AmountCard';
import { AccountSelector } from '../../components/transaction/AccountSelector';
import { PROVENANCE_ICONS } from '../../components/common/AppIcons';
import { useAuthStore } from '../../store/useAuthStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { showToast } from '../../store/useToastStore';
import { IncomeProvenance } from '../../types/database';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

const PRESETS = [10000, 50000, 100000, 200000];

const PROVENANCES: { id: IncomeProvenance; title: string; subtitle: string; isDebt?: boolean }[] = [
  { id: 'SALARY', title: 'Salaire', subtitle: 'Revenu fixe récurrent' },
  { id: 'FREELANCE', title: 'Prestation / Freelance', subtitle: 'Facture client' },
  { id: 'SALE', title: 'Vente d’un bien', subtitle: 'Commerce, objet' },
  { id: 'GIFT', title: 'Don / Cadeau', subtitle: 'Soutien famille' },
  { id: 'LOAN', title: 'Crédit / Emprunt', subtitle: 'Enregistré en dette', isDebt: true },
  { id: 'OTHER', title: 'Autre provenance', subtitle: 'Entrée ponctuelle' },
];

interface NouveauRevenuScreenProps {
  onClose: () => void;
  onSwitchToExpense: () => void;
  onSuccess: () => void;
}

export const NouveauRevenuScreen: React.FC<NouveauRevenuScreenProps> = ({ onClose, onSwitchToExpense, onSuccess }) => {
  const { currentUser, recordActivity } = useAuthStore();
  const { summary, fetchWallet } = useWalletStore();
  const { createIncome, isLoading } = useTransactionStore();

  const accounts = summary.accounts.filter((a) => a.is_archived === 0);
  const [amount, setAmount] = useState(0);
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id ?? '');
  const [provenance, setProvenance] = useState<IncomeProvenance>('SALARY');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) setSelectedAccountId(accounts[0].id);
  }, [summary.accounts]);

  useEffect(() => setFormError(null), [amount, selectedAccountId, provenance]);

  const isLoan = provenance === 'LOAN';

  const submit = async () => {
    if (!currentUser) return;
    recordActivity();
    if (amount <= 0) return setFormError('Saisissez un montant supérieur à 0 FCFA.');
    if (!selectedAccountId) return setFormError('Choisissez le compte qui reçoit cet argent.');

    const result = await createIncome({
      userId: currentUser.id,
      amount,
      accountId: selectedAccountId,
      provenance,
      notes: notes.trim() || undefined,
    });
    if (!result) return setFormError("Impossible d'enregistrer le revenu. Réessayez.");

    await fetchWallet(currentUser.id);
    if (result.isDebtCreated) {
      showToast(
        {
          kind: 'info',
          title: 'Emprunt enregistré comme dette',
          message: `+${formatFCFA(amount)} ajoutés à votre compte, et inscrits dans vos dettes à rembourser (pas dans vos revenus).`,
        },
        6000
      );
    } else {
      showToast({ kind: 'success', title: 'Revenu enregistré', message: `+${formatFCFA(amount)} crédités sur votre compte.` });
    }
    onSuccess();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Fermer" style={styles.closeBtn}>
          <X size={22} color={colors.text.primary} />
        </Pressable>
        <View style={styles.segment} accessibilityRole="tablist">
          <Pressable onPress={onSwitchToExpense} accessibilityRole="tab" accessibilityState={{ selected: false }} style={styles.segmentItem}>
            <Text style={styles.segmentText}>Dépense</Text>
          </Pressable>
          <View style={[styles.segmentItem, styles.segmentActive]} accessibilityRole="tab" accessibilityState={{ selected: true }}>
            <ArrowDown size={14} color={colors.text.inverted} />
            <Text style={styles.segmentTextActive}>Revenu</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" onTouchStart={recordActivity}>
        <View>
          <Text style={styles.title}>Nouveau revenu / gain</Text>
          <Text style={styles.subtitle}>Saisie rapide d'une entrée d'argent</Text>
        </View>

        <AmountCard label="Montant encaissé" amount={amount} onChange={setAmount} presets={PRESETS} tone="income" />

        <View>
          <Text style={styles.sectionLabel}>Origine & motif</Text>
          <View style={styles.noteField}>
            <NotebookPen size={18} color={colors.text.secondary} />
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="ex : salaire de mai, vente de pagnes…"
              placeholderTextColor={colors.text.muted}
              maxLength={120}
              accessibilityLabel="Motif du revenu"
              style={styles.noteInput}
            />
            {notes ? (
              <Pressable onPress={() => setNotes('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Effacer le motif">
                <CircleX size={18} color={colors.text.muted} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View>
          <Text style={styles.sectionLabel}>
            Provenance de l'argent <Text style={{ color: colors.accent.danger }}>*</Text>
          </Text>
          <View style={styles.grid} accessibilityRole="radiogroup">
            {PROVENANCES.map((opt) => {
              const on = opt.id === provenance;
              const Icon = PROVENANCE_ICONS[opt.id];
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setProvenance(opt.id);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={opt.title}
                  style={[styles.tile, on && (opt.isDebt ? styles.tileDebt : styles.tileOn), opt.id === 'OTHER' && !on && styles.tileDashed]}
                >
                  <View style={styles.tileHead}>
                    <View style={[styles.tileIcon, on && { backgroundColor: opt.isDebt ? colors.accent.warningBg : colors.primary.container }]}>
                      <Icon size={20} color={on ? (opt.isDebt ? '#B45309' : colors.primary.DEFAULT) : colors.text.secondary} />
                    </View>
                    {on ? (
                      <View style={[styles.check, opt.isDebt && { backgroundColor: colors.accent.warning }]}>
                        <Check size={12} color={colors.text.inverted} strokeWidth={3} />
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.tileTitle, on && { color: opt.isDebt ? '#B45309' : colors.primary.DEFAULT }]} numberOfLines={1}>
                    {opt.title}
                  </Text>
                  <Text style={styles.tileSub} numberOfLines={1}>{opt.subtitle}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {isLoan ? (
          <View style={[styles.note, styles.noteWarn]}>
            <TriangleAlert size={18} color="#B45309" />
            <Text style={styles.noteText}>
              <Text style={styles.noteStrong}>Un emprunt n'est pas un revenu.</Text> Cette somme augmente votre solde, mais elle est
              aussi inscrite comme <Text style={styles.noteStrong}>dette à rembourser</Text> pour ne pas fausser vos bilans.
            </Text>
          </View>
        ) : (
          <View style={styles.note}>
            <Info size={18} color={colors.primary.DEFAULT} />
            <Text style={styles.noteText}>
              <Text style={styles.noteStrong}>Note comptable :</Text> ce montant est compté dans vos revenus et augmente votre solde
              disponible.
            </Text>
          </View>
        )}

        <AccountSelector
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onSelectAccount={setSelectedAccountId}
          label="Compte de destination"
        />
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
          {isLoading ? <ActivityIndicator color={colors.text.inverted} /> : <CircleCheck size={20} color={colors.text.inverted} />}
          <Text style={styles.ctaText}>{amount > 0 ? `Enregistrer le revenu (+${formatFCFA(amount)})` : 'Enregistrer le revenu'}</Text>
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
  segmentItem: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.md },
  segmentActive: { backgroundColor: colors.primary.DEFAULT },
  segmentText: { fontSize: typography.sizes.body, color: colors.text.secondary, fontWeight: typography.weights.medium },
  segmentTextActive: { fontSize: typography.sizes.body, color: colors.text.inverted, fontWeight: typography.weights.bold },
  content: { paddingHorizontal: spacing.base, paddingBottom: 160, gap: spacing.lg },
  title: { fontSize: typography.sizes.headline, fontWeight: typography.weights.extrabold, color: colors.primary.dark },
  subtitle: { fontSize: typography.sizes.bodySm, color: colors.text.secondary, marginTop: 2 },
  sectionLabel: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text.primary, marginBottom: spacing.sm },
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: spacing.md,
  },
  tileOn: { borderWidth: 2, borderColor: colors.primary.DEFAULT, backgroundColor: colors.primary.subtle },
  tileDebt: { borderWidth: 2, borderColor: colors.accent.warning, backgroundColor: colors.accent.warningBg },
  tileDashed: { borderStyle: 'dashed', borderWidth: 1.5 },
  tileHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  tileIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.brands.waveBg, alignItems: 'center', justifyContent: 'center' },
  check: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary.DEFAULT, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text.primary },
  tileSub: { fontSize: typography.sizes.caption, color: colors.text.secondary, marginTop: 2 },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.brands.waveBg,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  noteWarn: { backgroundColor: colors.accent.warningBg, borderWidth: 1, borderColor: colors.accent.warningBorder },
  noteText: { flex: 1, fontSize: typography.sizes.bodySm, lineHeight: 19, color: colors.text.secondary },
  noteStrong: { fontWeight: typography.weights.bold, color: colors.text.primary },
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
