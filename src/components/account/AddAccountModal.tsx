/**
 * Nouveau compte — GERETOU
 * Wave, MTN MoMo, Orange Money, banque ou espèces ; compte principal, coffre ou épargne.
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { X, Plus, TriangleAlert, Wallet, Lock, PiggyBank } from 'lucide-react-native';
import { useWalletStore } from '../../store/useWalletStore';
import { useAuthStore } from '../../store/useAuthStore';
import { showToast } from '../../store/useToastStore';
import { parseAmountInput, formatAmountInput } from '../transaction/amountFormat';
import { ACCOUNT_TYPE_LABELS } from '../../services/dashboard/dashboardData';
import { ACCOUNT_BRAND } from '../../theme/brand';
import { AccountSubType, AccountType } from '../../types/database';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

const TYPES: AccountType[] = ['WAVE', 'MOMO', 'ORANGE', 'BANK', 'CASH'];
const KINDS: { value: AccountSubType; label: string; hint: string; Icon: typeof Wallet }[] = [
  { value: 'MAIN', label: 'Compte courant', hint: 'Argent disponible', Icon: Wallet },
  { value: 'VAULT', label: 'Coffre', hint: 'Bloqué, hors dépenses', Icon: Lock },
  { value: 'SAVINGS', label: 'Épargne', hint: 'Mis de côté', Icon: PiggyBank },
];

export function defaultAccountName(type: AccountType, kind: AccountSubType): string {
  const label = ACCOUNT_TYPE_LABELS[type];
  if (kind === 'VAULT') return `Coffre ${label}`;
  if (kind === 'SAVINGS') return `Épargne ${label}`;
  return label;
}

interface AddAccountModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({ visible, onClose }) => {
  const keyboardHeight = useKeyboardHeight();
  const { currentUser, recordActivity } = useAuthStore();
  const { summary, createAccount, isLoading } = useWalletStore();
  const [type, setType] = useState<AccountType>('WAVE');
  const [kind, setKind] = useState<AccountSubType>('MAIN');
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [balance, setBalance] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setType('WAVE');
    setKind('MAIN');
    setName(defaultAccountName('WAVE', 'MAIN'));
    setNameTouched(false);
    setBalance(0);
    setError(null);
  }, [visible]);

  // Le nom suit le type tant que l'utilisateur ne l'a pas modifié lui-même
  useEffect(() => {
    if (!nameTouched) setName(defaultAccountName(type, kind));
  }, [type, kind]);

  const submit = async () => {
    if (!currentUser) return;
    recordActivity();
    const clean = name.trim();
    if (clean.length < 2) return setError('Donnez un nom au compte (2 caractères minimum).');
    const duplicate = summary.accounts.some((a) => !a.is_archived && a.name.toLowerCase() === clean.toLowerCase());
    if (duplicate) return setError('Un compte actif porte déjà ce nom.');
    const ok = await createAccount(currentUser.id, clean, type, kind, balance);
    if (!ok) return setError('Impossible de créer le compte. Réessayez.');
    showToast({ kind: 'success', title: 'Compte ajouté', message: `${clean} · solde de départ ${formatFCFA(balance)}.` });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.backdrop, keyboardHeight > 0 && { paddingBottom: keyboardHeight }]}>
          <View style={[styles.sheet, keyboardHeight > 0 && { maxHeight: '96%' }]}>
            <View style={styles.header}>
              <Text style={styles.title}>Nouveau compte</Text>
              <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fermer">
                <X size={22} color={colors.text.primary} />
              </Pressable>
            </View>

              <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Opérateur</Text>
            <View style={styles.wrap} accessibilityRole="radiogroup">
              {TYPES.map((t) => {
                const on = t === type;
                const brand = ACCOUNT_BRAND[t];
                return (
                  <Pressable
                    key={t}
                    onPress={() => setType(t)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    style={[styles.chip, { backgroundColor: on ? brand.bg : colors.surface.card }, on && { borderColor: brand.fg, borderWidth: 2 }]}
                  >
                    <Text style={[styles.chipText, on && { color: brand.fg, fontWeight: typography.weights.bold }]}>{ACCOUNT_TYPE_LABELS[t]}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Type de compte</Text>
            <View style={styles.kinds} accessibilityRole="radiogroup">
              {KINDS.map(({ value, label, hint, Icon }) => {
                const on = value === kind;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setKind(value)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={label}
                    style={[styles.kind, on && styles.kindOn]}
                  >
                    <Icon size={20} color={on ? colors.primary.DEFAULT : colors.text.secondary} />
                    <Text style={[styles.kindLabel, on && { color: colors.primary.DEFAULT }]}>{label}</Text>
                    <Text style={styles.kindHint}>{hint}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Nom du compte</Text>
            <TextInput
              value={name}
              onChangeText={(t) => {
                setName(t);
                setNameTouched(true);
                setError(null);
              }}
              maxLength={40}
              accessibilityLabel="Nom du compte"
              style={styles.input}
            />

            <Text style={styles.label}>Solde actuel</Text>
            <View style={styles.amountRow}>
              <TextInput
                value={formatAmountInput(balance)}
                onChangeText={(t) => setBalance(parseAmountInput(t))}
                placeholder="0"
                placeholderTextColor={colors.text.muted}
                keyboardType="number-pad"
                accessibilityLabel="Solde actuel en FCFA"
                style={[styles.input, { flex: 1 }]}
              />
              <Text style={styles.unit}>FCFA</Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            {error ? (
              <View style={styles.error} accessibilityRole="alert">
                <TriangleAlert size={16} color={colors.accent.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            <Pressable
              onPress={submit}
              disabled={isLoading}
              accessibilityRole="button"
              style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
            >
              {isLoading ? <ActivityIndicator color={colors.text.inverted} /> : <Plus size={18} color={colors.text.inverted} />}
              <Text style={styles.ctaText}>Ajouter le compte</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
  },
  title: { fontSize: typography.sizes.title, fontWeight: typography.weights.bold, color: colors.text.primary },
  content: { padding: spacing.base, gap: spacing.sm },
  label: { marginTop: spacing.sm, fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold, color: colors.text.primary },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.full, borderWidth: 1, borderColor: colors.surface.border },
  chipText: { fontSize: typography.sizes.bodySm, color: colors.text.primary },
  kinds: { flexDirection: 'row', gap: spacing.sm },
  kind: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    padding: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    backgroundColor: colors.surface.card,
  },
  kindOn: { borderWidth: 2, borderColor: colors.primary.DEFAULT, backgroundColor: colors.primary.subtle },
  kindLabel: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.bold, color: colors.text.primary },
  kindHint: { fontSize: 10, color: colors.text.secondary, textAlign: 'center' },
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
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  unit: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text.secondary },
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
  ctaText: { color: colors.text.inverted, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
});
