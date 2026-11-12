/**
 * Nouvel engagement (créance ou dette) — GERETOU
 */

import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { X, TriangleAlert, Check, ArrowDown, ArrowUp, UserRound, Phone, NotebookPen } from 'lucide-react-native';
import { AmountCard } from '../transaction/AmountCard';
import { useCommitmentStore } from '../../store/useCommitmentStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useWalletStore } from '../../store/useWalletStore';
import { showToast } from '../../store/useToastStore';
import { DebtType } from '../../services/debts/debtCore';
import { addDays, toDayString, parseDay } from '../../services/agenda/deadlineCore';
import { ACCOUNT_BRAND } from '../../theme/brand';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

interface Props {
  visible: boolean;
  initialType?: DebtType;
  onClose: () => void;
}

export const DebtEditorModal: React.FC<Props> = ({ visible, initialType = 'CREDIT', onClose }) => {
  const { currentUser } = useAuthStore();
  const { summary } = useWalletStore();
  const { addDebt } = useCommitmentStore();
  const accounts = summary.accounts.filter((a) => !a.is_archived);
  const [type, setType] = useState<DebtType>(initialType);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [due, setDue] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setType(initialType);
    setName('');
    setPhone('');
    setAmount(0);
    setNotes('');
    setDue(null);
    setAccountId(accounts[0]?.id ?? null);
    setError(null);
  }, [visible]);

  useEffect(() => setError(null), [name, amount, accountId, type]);

  const today = toDayString(new Date());
  const now = new Date();
  const dueChoices = [
    { label: 'Dans 1 semaine', day: addDays(today, 7) },
    { label: 'Fin du mois', day: toDayString(new Date(now.getFullYear(), now.getMonth() + 1, 0)) },
    { label: 'Dans 1 mois', day: addDays(today, 30) },
  ];
  const isCredit = type === 'CREDIT';

  const submit = async () => {
    if (!currentUser) return;
    setBusy(true);
    const failure = await addDebt({ userId: currentUser.id, type, personName: name, phone, amount, dueDate: due, notes, accountId });
    setBusy(false);
    if (failure) return setError(failure);
    const acc = accounts.find((a) => a.id === accountId);
    showToast({
      kind: 'success',
      title: isCredit ? 'Créance enregistrée' : 'Dette enregistrée',
      message: acc ? `${formatFCFA(amount)} ${isCredit ? 'débités de' : 'crédités sur'} ${acc.name}. Ni dépense, ni revenu.` : `${formatFCFA(amount)} · aucun solde modifié.`,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Nouvel engagement</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fermer">
              <X size={22} color={colors.text.primary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.segment} accessibilityRole="radiogroup">
              {[
                { v: 'CREDIT' as const, l: "On me doit (j'ai prêté)", Icon: ArrowDown },
                { v: 'DEBT' as const, l: "Je dois (j'ai emprunté)", Icon: ArrowUp },
              ].map(({ v, l, Icon }) => (
                <Pressable key={v} onPress={() => setType(v)} accessibilityRole="radio" accessibilityState={{ checked: type === v }} accessibilityLabel={l} style={[styles.segmentItem, type === v && (v === 'CREDIT' ? styles.segOnGreen : styles.segOnRed)]}>
                  <Icon size={16} color={type === v ? colors.text.inverted : colors.text.secondary} />
                  <Text style={[styles.segmentText, type === v && { color: colors.text.inverted, fontWeight: typography.weights.bold }]}>{l}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.field}>
              <UserRound size={18} color={colors.text.secondary} />
              <TextInput value={name} onChangeText={setName} placeholder={isCredit ? 'Qui vous doit ? (ex : Moussa K.)' : 'À qui devez-vous ? (ex : Boutique Awa)'} placeholderTextColor={colors.text.muted} maxLength={50} accessibilityLabel="Nom de la personne" style={styles.input} />
            </View>
            <View style={styles.field}>
              <Phone size={18} color={colors.text.secondary} />
              <TextInput value={phone} onChangeText={setPhone} placeholder="Téléphone (facultatif, pour la relance)" placeholderTextColor={colors.text.muted} keyboardType="phone-pad" maxLength={20} accessibilityLabel="Téléphone" style={styles.input} />
            </View>

            <AmountCard label={isCredit ? 'Montant prêté' : 'Montant emprunté'} amount={amount} onChange={setAmount} presets={[5000, 10000, 25000, 50000]} tone={isCredit ? 'expense' : 'income'} />

            <View style={styles.field}>
              <NotebookPen size={18} color={colors.text.secondary} />
              <TextInput value={notes} onChangeText={setNotes} placeholder="Motif (ex : appui commerce, avance billets)" placeholderTextColor={colors.text.muted} maxLength={80} accessibilityLabel="Motif" style={styles.input} />
            </View>

            <Text style={styles.label}>Échéance de remboursement</Text>
            <View style={styles.wrap}>
              {dueChoices.map((c) => (
                <Pressable key={c.label} onPress={() => setDue(c.day)} accessibilityRole="radio" accessibilityState={{ checked: due === c.day }} style={[styles.chip, due === c.day && styles.chipOn]}>
                  <Text style={[styles.chipText, due === c.day && styles.chipTextOn]}>{c.label}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setDue(null)} accessibilityRole="radio" accessibilityState={{ checked: due === null }} style={[styles.chip, due === null && styles.chipOn]}>
                <Text style={[styles.chipText, due === null && styles.chipTextOn]}>Pas de date</Text>
              </Pressable>
            </View>
            {due ? <Text style={styles.hint}>Le {parseDay(due).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text> : null}

            <Text style={styles.label}>{isCredit ? "D'où est sorti l'argent ?" : "Sur quel compte est arrivé l'argent ?"}</Text>
            <View style={styles.wrap}>
              {accounts.map((a) => {
                const on = a.id === accountId;
                return (
                  <Pressable key={a.id} onPress={() => setAccountId(a.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={a.name} style={[styles.account, on && styles.accountOn]}>
                    <Text style={[styles.accountText, { color: on ? colors.text.inverted : ACCOUNT_BRAND[a.type].fg }]}>{a.name}</Text>
                  </Pressable>
                );
              })}
              <Pressable onPress={() => setAccountId(null)} accessibilityRole="radio" accessibilityState={{ checked: accountId === null }} style={[styles.account, accountId === null && styles.accountOn]}>
                <Text style={[styles.accountText, { color: accountId === null ? colors.text.inverted : colors.text.secondary }]}>Déjà existant (aucun mouvement)</Text>
              </Pressable>
            </View>
            <Text style={styles.hint}>
              {isCredit ? 'Prêter' : 'Emprunter'} n'est ni une dépense ni un revenu : vos budgets et bilans ne changent pas.
            </Text>
          </ScrollView>
          <View style={styles.footer}>
            {error ? (
              <View style={styles.error} accessibilityRole="alert">
                <TriangleAlert size={16} color={colors.accent.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            <Pressable onPress={submit} disabled={busy || amount <= 0} accessibilityRole="button" style={({ pressed }) => [styles.cta, (busy || amount <= 0) && styles.ctaDisabled, pressed && { opacity: 0.85 }]}>
              {busy ? <ActivityIndicator color={colors.text.inverted} /> : <Check size={18} color={colors.text.inverted} />}
              <Text style={styles.ctaText}>{isCredit ? 'Enregistrer la créance' : 'Enregistrer la dette'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '94%', backgroundColor: colors.surface.canvas, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.base, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.surface.border },
  title: { fontSize: typography.sizes.title, fontWeight: typography.weights.bold, color: colors.text.primary },
  content: { padding: spacing.base, gap: spacing.sm },
  segment: { flexDirection: 'row', gap: spacing.sm },
  segmentItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48, borderRadius: radii.md, backgroundColor: colors.brands.waveBg, paddingHorizontal: 6 },
  segOnGreen: { backgroundColor: colors.primary.DEFAULT },
  segOnRed: { backgroundColor: colors.accent.danger },
  segmentText: { fontSize: typography.sizes.bodySm, color: colors.text.secondary, flexShrink: 1, textAlign: 'center' },
  field: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface.card, borderWidth: 1, borderColor: colors.surface.border, borderRadius: radii.md, paddingHorizontal: spacing.md, minHeight: 48 },
  input: { flex: 1, fontSize: typography.sizes.body, color: colors.text.primary, outlineStyle: 'none' } as never,
  label: { marginTop: spacing.sm, fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold, color: colors.text.secondary },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.full, backgroundColor: colors.brands.waveBg },
  chipOn: { backgroundColor: colors.primary.DEFAULT },
  chipText: { fontSize: typography.sizes.bodySm, color: colors.text.primary },
  chipTextOn: { color: colors.text.inverted, fontWeight: typography.weights.bold },
  hint: { fontSize: typography.sizes.caption, color: colors.text.secondary },
  account: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: colors.surface.border, backgroundColor: colors.surface.card },
  accountOn: { backgroundColor: colors.primary.DEFAULT, borderColor: colors.primary.DEFAULT },
  accountText: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold },
  footer: { padding: spacing.base, backgroundColor: colors.surface.card, borderTopWidth: 1, borderTopColor: colors.surface.border },
  error: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.accent.dangerBg, borderColor: colors.accent.dangerBorder, borderWidth: 1, borderRadius: radii.md, padding: spacing.sm, marginBottom: spacing.sm },
  errorText: { flex: 1, color: colors.accent.danger, fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 54, borderRadius: radii.lg, backgroundColor: colors.primary.DEFAULT },
  ctaDisabled: { backgroundColor: colors.text.muted },
  ctaText: { color: colors.text.inverted, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
});
