/**
 * Fenêtre « montant + compte » réutilisable — GERETOU
 * Encaisser / verser un remboursement, alimenter / retirer l'épargne d'un projet.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { X, TriangleAlert, Check } from 'lucide-react-native';
import { AmountCard } from '../transaction/AmountCard';
import { Account } from '../../types/database';
import { ACCOUNT_BRAND } from '../../theme/brand';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

interface MoneyActionModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  amountLabel: string;
  /** Montant maximal autorisé (ex : reste dû) ; affiché et proposé en raccourci. */
  max?: number;
  presets: number[];
  accounts: Account[];
  accountLabel: string;
  /** Le compte sera débité (vérifie le solde dans l'affichage). */
  debit: boolean;
  /** Propose « Sans compte » (réglé en espèces non suivies, etc.). */
  allowNoAccount?: boolean;
  confirmLabel: (amount: number) => string;
  /** Renvoie null si succès, sinon le message d'erreur à afficher. */
  onConfirm: (amount: number, accountId: string | null) => Promise<string | null>;
  onClose: () => void;
}

export const MoneyActionModal: React.FC<MoneyActionModalProps> = (liveProps) => {
  // Pendant l'animation de fermeture, on garde le dernier contenu affiché
  // (l'écran parent remet souvent ses données à null dès la fermeture).
  const frozen = useRef(liveProps);
  if (liveProps.visible) frozen.current = liveProps;
  const props = { ...frozen.current, visible: liveProps.visible, onClose: liveProps.onClose };
  const { visible, title, subtitle, amountLabel, max, presets, accounts, accountLabel, debit, allowNoAccount, confirmLabel, onConfirm, onClose } = props;
  const keyboardHeight = useKeyboardHeight();
  const [amount, setAmount] = useState(0);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setAmount(0);
    setAccountId(accounts[0]?.id ?? null);
    setError(null);
  }, [visible]);

  useEffect(() => setError(null), [amount, accountId]);

  const submit = async () => {
    if (max !== undefined && amount > max) return setError(`Le montant ne peut pas dépasser ${formatFCFA(max)}.`);
    if (!accountId && !allowNoAccount) return setError('Choisissez un compte.');
    setBusy(true);
    const failure = await onConfirm(amount, accountId);
    setBusy(false);
    if (failure) return setError(failure);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.backdrop, keyboardHeight > 0 && { paddingBottom: keyboardHeight }]}>
          <View style={[styles.sheet, keyboardHeight > 0 && { maxHeight: '96%' }]}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fermer">
                <X size={22} color={colors.text.primary} />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <AmountCard label={amountLabel} amount={amount} onChange={setAmount} presets={presets} tone={debit ? 'expense' : 'income'} />
              {max !== undefined ? (
                <Pressable onPress={() => setAmount(max)} accessibilityRole="button" style={styles.maxBtn}>
                  <Text style={styles.maxText}>Tout : {formatFCFA(max)}</Text>
                </Pressable>
              ) : null}
              <Text style={styles.label}>{accountLabel}</Text>
              {accounts.map((a) => {
                const on = a.id === accountId;
                const short = debit && a.balance < amount;
                const brand = ACCOUNT_BRAND[a.type];
                return (
                  <Pressable key={a.id} onPress={() => setAccountId(a.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={a.name} style={[styles.account, on && styles.accountOn]}>
                    <View style={[styles.accountIcon, { backgroundColor: brand.bg }]}>
                      <Text style={[styles.accountInitial, { color: brand.fg }]}>{a.name.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.accountName}>{a.name}</Text>
                      <Text style={[styles.accountBalance, short && { color: colors.accent.danger }]}>
                        Solde : {formatFCFA(a.balance)}
                        {short ? ' · insuffisant' : ''}
                      </Text>
                    </View>
                    <View style={[styles.radio, on && styles.radioOn]} />
                  </Pressable>
                );
              })}
              {allowNoAccount ? (
                <Pressable onPress={() => setAccountId(null)} accessibilityRole="radio" accessibilityState={{ checked: accountId === null }} style={[styles.account, accountId === null && styles.accountOn]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.accountName}>Sans compte suivi</Text>
                    <Text style={styles.accountBalance}>Réglé de main à main : aucun solde n'est modifié</Text>
                  </View>
                  <View style={[styles.radio, accountId === null && styles.radioOn]} />
                </Pressable>
              ) : null}
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
                <Text style={styles.ctaText} numberOfLines={1}>{confirmLabel(amount)}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  keyboardAvoid: { width: '100%', justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%', backgroundColor: colors.surface.canvas, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.surface.border },
  title: { fontSize: typography.sizes.title, fontWeight: typography.weights.bold, color: colors.text.primary },
  subtitle: { fontSize: typography.sizes.bodySm, color: colors.text.secondary },
  content: { padding: spacing.base, gap: spacing.sm },
  maxBtn: { alignSelf: 'flex-start', backgroundColor: colors.primary.subtle, borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: 6 },
  maxText: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold, color: colors.primary.DEFAULT },
  label: { marginTop: spacing.sm, fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold, color: colors.text.secondary },
  account: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface.card, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.surface.border, padding: spacing.md },
  accountOn: { borderWidth: 2, borderColor: colors.primary.DEFAULT },
  accountIcon: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  accountInitial: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold },
  accountName: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text.primary },
  accountBalance: { fontSize: typography.sizes.bodySm, color: colors.text.secondary },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.surface.border },
  radioOn: { borderWidth: 7, borderColor: colors.primary.DEFAULT },
  footer: { padding: spacing.base, backgroundColor: colors.surface.card, borderTopWidth: 1, borderTopColor: colors.surface.border },
  error: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.accent.dangerBg, borderColor: colors.accent.dangerBorder, borderWidth: 1, borderRadius: radii.md, padding: spacing.sm, marginBottom: spacing.sm },
  errorText: { flex: 1, color: colors.accent.danger, fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 54, borderRadius: radii.lg, backgroundColor: colors.primary.DEFAULT, paddingHorizontal: spacing.sm },
  ctaDisabled: { backgroundColor: colors.text.muted },
  ctaText: { color: colors.text.inverted, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, flexShrink: 1 },
});
