/**
 * Virement interne neutre — GERETOU
 * Débite un compte et en crédite un autre sans toucher aux dépenses / revenus.
 * Frais éventuels comptés à part en dépense « Frais & commissions ».
 */

import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { X, ArrowLeftRight, TriangleAlert, Info } from 'lucide-react-native';
import { AmountCard } from '../transaction/AmountCard';
import { AccountSelector } from '../transaction/AccountSelector';
import { parseAmountInput, formatAmountInput } from '../transaction/amountFormat';
import { useWalletStore } from '../../store/useWalletStore';
import { useAuthStore } from '../../store/useAuthStore';
import { showToast } from '../../store/useToastStore';
import { validateTransferInput } from '../../services/account/transferCore';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

interface TransferModalProps {
  visible: boolean;
  onClose: () => void;
  /** Compte source présélectionné. */
  initialFromId?: string;
  onDone?: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({ visible, onClose, initialFromId, onDone }) => {
  const { currentUser, recordActivity } = useAuthStore();
  const { summary, transfer, isLoading } = useWalletStore();
  const accounts = summary.accounts.filter((a) => a.is_archived === 0);

  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState(0);
  const [fees, setFees] = useState(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const from = initialFromId || accounts[0]?.id || '';
    setFromId(from);
    setToId(accounts.find((a) => a.id !== from)?.id ?? '');
    setAmount(0);
    setFees(0);
    setNotes('');
    setError(null);
  }, [visible, initialFromId]);

  useEffect(() => setError(null), [fromId, toId, amount, fees]);

  const from = accounts.find((a) => a.id === fromId);
  const to = accounts.find((a) => a.id === toId);

  const selectFrom = (id: string) => {
    setFromId(id);
    if (id === toId) setToId(accounts.find((a) => a.id !== id)?.id ?? '');
  };

  const submit = async () => {
    if (!currentUser) return;
    recordActivity();
    const invalid = validateTransferInput({ fromAccountId: fromId, toAccountId: toId, amount, fees });
    if (invalid) return setError(invalid);
    if (from && amount + fees > from.balance) {
      return setError(`Solde insuffisant : ${formatFCFA(from.balance)} disponibles sur ${from.name}.`);
    }
    const failure = await transfer({ userId: currentUser.id, fromAccountId: fromId, toAccountId: toId, amount, fees, notes });
    if (failure) return setError(failure);
    showToast({
      kind: 'success',
      title: 'Virement effectué',
      message: `${formatFCFA(amount)} de ${from?.name} vers ${to?.name}${fees > 0 ? ` (frais ${formatFCFA(fees)})` : ''}.`,
    });
    onDone?.();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <ArrowLeftRight size={18} color={colors.primary.DEFAULT} />
            </View>
            <Text style={styles.title}>Virement interne</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fermer">
              <X size={22} color={colors.text.primary} />
            </Pressable>
          </View>

          {accounts.length < 2 ? (
            <View style={styles.info}>
              <Info size={18} color={colors.primary.DEFAULT} />
              <Text style={styles.infoText}>Il faut au moins deux comptes actifs pour faire un virement interne.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <AccountSelector accounts={accounts} selectedAccountId={fromId} onSelectAccount={selectFrom} label="Débiter" />
              <AccountSelector
                accounts={accounts.filter((a) => a.id !== fromId)}
                selectedAccountId={toId}
                onSelectAccount={setToId}
                label="Créditer"
              />
              <AmountCard label="Montant viré" amount={amount} onChange={setAmount} presets={[5000, 10000, 25000, 50000]} tone="expense" />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Frais (facultatif)</Text>
                  <TextInput
                    value={formatAmountInput(fees)}
                    onChangeText={(t) => setFees(parseAmountInput(t))}
                    placeholder="0"
                    placeholderTextColor={colors.text.muted}
                    keyboardType="number-pad"
                    accessibilityLabel="Frais du virement en FCFA"
                    style={styles.input}
                  />
                </View>
                <View style={{ flex: 1.4 }}>
                  <Text style={styles.fieldLabel}>Motif (facultatif)</Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="ex : recharge MoMo"
                    placeholderTextColor={colors.text.muted}
                    maxLength={80}
                    accessibilityLabel="Motif du virement"
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.info}>
                <Info size={16} color={colors.primary.DEFAULT} />
                <Text style={styles.infoText}>
                  Opération neutre : elle ne compte ni dans vos dépenses ni dans vos revenus. Les frais, eux, sont comptés en
                  dépense « Frais & commissions ».
                </Text>
              </View>
            </ScrollView>
          )}

          <View style={styles.footer}>
            {error ? (
              <View style={styles.error} accessibilityRole="alert">
                <TriangleAlert size={16} color={colors.accent.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            <Pressable
              onPress={submit}
              disabled={isLoading || accounts.length < 2 || amount <= 0}
              accessibilityRole="button"
              style={({ pressed }) => [styles.cta, (isLoading || accounts.length < 2 || amount <= 0) && styles.ctaDisabled, pressed && { opacity: 0.85 }]}
            >
              {isLoading ? <ActivityIndicator color={colors.text.inverted} /> : <ArrowLeftRight size={18} color={colors.text.inverted} />}
              <Text style={styles.ctaText}>
                {amount > 0 ? `Virer ${formatFCFA(amount)}${to ? ` vers ${to.name}` : ''}` : 'Virer'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '92%',
    backgroundColor: colors.surface.canvas,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.base,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
  },
  headerIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary.container, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: typography.sizes.title, fontWeight: typography.weights.bold, color: colors.text.primary },
  content: { padding: spacing.base, gap: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.sm },
  fieldLabel: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold, color: colors.text.primary, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.surface.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    fontSize: typography.sizes.body,
    color: colors.text.primary,
  },
  info: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.primary.subtle, borderRadius: radii.lg, padding: spacing.md, margin: 0 },
  infoText: { flex: 1, fontSize: typography.sizes.bodySm, lineHeight: 19, color: colors.text.secondary },
  footer: { padding: spacing.base, backgroundColor: colors.surface.card, borderTopWidth: 1, borderTopColor: colors.surface.border },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.dangerBg,
    borderColor: colors.accent.dangerBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: { flex: 1, color: colors.accent.danger, fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 54,
    borderRadius: radii.lg,
    backgroundColor: colors.primary.DEFAULT,
  },
  ctaDisabled: { backgroundColor: colors.text.muted },
  ctaText: { color: colors.text.inverted, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
});
