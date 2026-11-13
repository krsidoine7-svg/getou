/**
 * Nouveau projet d'achat / d'épargne — GERETOU
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
import { X, TriangleAlert, Check, Target, Lock, PiggyBank, Plus } from 'lucide-react-native';
import { AmountCard } from '../transaction/AmountCard';
import { useCommitmentStore } from '../../store/useCommitmentStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useWalletStore } from '../../store/useWalletStore';
import { showToast } from '../../store/useToastStore';
import { PRIORITY_LABELS, ProjectPriority } from '../../services/projects/projectCore';
import { ACCOUNT_TYPE_LABELS } from '../../services/dashboard/dashboardData';
import { toDayString, parseDay } from '../../services/agenda/deadlineCore';
import { ACCOUNT_BRAND } from '../../theme/brand';
import { AccountType } from '../../types/database';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

const PRIORITIES: ProjectPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const VAULT_TYPES: AccountType[] = ['WAVE', 'MOMO', 'ORANGE', 'BANK', 'CASH'];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const ProjectEditorModal: React.FC<Props> = ({ visible, onClose }) => {
  const { currentUser } = useAuthStore();
  const { summary } = useWalletStore();
  const { addProject } = useCommitmentStore();
  const vaults = summary.accounts.filter((a) => !a.is_archived && a.sub_type !== 'MAIN');
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState(0);
  const [date, setDate] = useState<string | null>(null);
  const [priority, setPriority] = useState<ProjectPriority>('MEDIUM');
  const [startNow, setStartNow] = useState(true);
  const [vaultId, setVaultId] = useState<string | null>(null);
  const [newVaultType, setNewVaultType] = useState<AccountType>('WAVE');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle('');
    setTarget(0);
    setDate(null);
    setPriority('MEDIUM');
    setStartNow(true);
    setVaultId(null);
    setNewVaultType('WAVE');
    setError(null);
  }, [visible]);

  useEffect(() => setError(null), [title, target]);

  const now = new Date();
  const dates = [
    { label: 'Dans 3 mois', day: toDayString(new Date(now.getFullYear(), now.getMonth() + 3, now.getDate())) },
    { label: 'Dans 6 mois', day: toDayString(new Date(now.getFullYear(), now.getMonth() + 6, now.getDate())) },
    { label: "Fin d'année", day: toDayString(new Date(now.getFullYear(), 11, 31)) },
  ];

  const submit = async () => {
    if (!currentUser) return;
    setBusy(true);
    const failure = await addProject({
      userId: currentUser.id,
      title,
      targetAmount: target,
      targetDate: date,
      priority,
      status: startNow ? 'ACTIVE' : 'IDEA',
      vaultAccountId: vaultId,
      newVaultType: vaultId ? null : newVaultType,
    });
    setBusy(false);
    if (failure) return setError(failure);
    showToast({ kind: 'success', title: 'Projet créé', message: `${title.trim()} · objectif ${formatFCFA(target)}. Alimentez son coffre quand vous voulez.` });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.backdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoid}
          >
            <View style={styles.sheet}>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Nouveau projet</Text>
                <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fermer">
                  <X size={22} color={colors.text.primary} />
                </Pressable>
              </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.field}>
              <Target size={18} color={colors.text.secondary} />
              <TextInput value={title} onChangeText={setTitle} placeholder="Nom du projet (ex : ordinateur, voyage, réserve)" placeholderTextColor={colors.text.muted} maxLength={50} accessibilityLabel="Nom du projet" style={styles.input} />
            </View>
            <AmountCard label="Objectif à atteindre" amount={target} onChange={setTarget} presets={[50000, 100000, 250000, 500000]} tone="income" />

            <Text style={styles.label}>Date cible</Text>
            <View style={styles.wrap}>
              {dates.map((d) => (
                <Pressable key={d.label} onPress={() => setDate(d.day)} accessibilityRole="radio" accessibilityState={{ checked: date === d.day }} style={[styles.chip, date === d.day && styles.chipOn]}>
                  <Text style={[styles.chipText, date === d.day && styles.chipTextOn]}>{d.label}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setDate(null)} accessibilityRole="radio" accessibilityState={{ checked: date === null }} style={[styles.chip, date === null && styles.chipOn]}>
                <Text style={[styles.chipText, date === null && styles.chipTextOn]}>Sans date</Text>
              </Pressable>
            </View>
            {date ? <Text style={styles.hint}>Le {parseDay(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text> : null}

            <Text style={styles.label}>Priorité</Text>
            <View style={styles.wrap}>
              {PRIORITIES.map((p) => (
                <Pressable key={p} onPress={() => setPriority(p)} accessibilityRole="radio" accessibilityState={{ checked: priority === p }} style={[styles.chip, priority === p && (p === 'CRITICAL' ? styles.chipDanger : styles.chipOn)]}>
                  <Text style={[styles.chipText, priority === p && styles.chipTextOn]}>{PRIORITY_LABELS[p].replace('Priorité ', '')}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Démarrage</Text>
            <View style={styles.row}>
              {[
                { v: true, l: 'Commencer maintenant' },
                { v: false, l: 'Planifier pour plus tard' },
              ].map(({ v, l }) => (
                <Pressable key={l} onPress={() => setStartNow(v)} accessibilityRole="radio" accessibilityState={{ checked: startNow === v }} style={[styles.option, startNow === v && styles.optionOn]}>
                  <Text style={[styles.chipText, startNow === v && { color: colors.primary.DEFAULT, fontWeight: typography.weights.bold }]}>{l}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Où bloquer l'argent ?</Text>
            <Pressable onPress={() => setVaultId(null)} accessibilityRole="radio" accessibilityState={{ checked: vaultId === null }} style={[styles.vault, vaultId === null && styles.vaultOn]}>
              <Plus size={18} color={colors.primary.DEFAULT} />
              <View style={{ flex: 1 }}>
                <Text style={styles.vaultTitle}>Créer un coffre dédié</Text>
                <Text style={styles.hint}>« Coffre {title.trim() || 'du projet'} » · {ACCOUNT_TYPE_LABELS[newVaultType]}</Text>
              </View>
            </Pressable>
            {vaultId === null ? (
              <View style={styles.wrap}>
                {VAULT_TYPES.map((t) => (
                  <Pressable key={t} onPress={() => setNewVaultType(t)} accessibilityRole="radio" accessibilityState={{ checked: newVaultType === t }} style={[styles.chip, { backgroundColor: newVaultType === t ? ACCOUNT_BRAND[t].bg : colors.surface.card, borderWidth: newVaultType === t ? 2 : 1, borderColor: newVaultType === t ? ACCOUNT_BRAND[t].fg : colors.surface.border }]}>
                    <Text style={[styles.chipText, { color: ACCOUNT_BRAND[t].fg, fontWeight: typography.weights.semibold }]}>{ACCOUNT_TYPE_LABELS[t]}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {vaults.map((v) => (
              <Pressable key={v.id} onPress={() => setVaultId(v.id)} accessibilityRole="radio" accessibilityState={{ checked: vaultId === v.id }} accessibilityLabel={v.name} style={[styles.vault, vaultId === v.id && styles.vaultOn]}>
                {v.sub_type === 'VAULT' ? <Lock size={18} color={colors.accent.warning} /> : <PiggyBank size={18} color={colors.accent.warning} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.vaultTitle}>{v.name}</Text>
                  <Text style={styles.hint}>Solde actuel : {formatFCFA(v.balance)}</Text>
                </View>
              </Pressable>
            ))}
            <Text style={styles.hint}>Seul l'argent réellement versé dans ce coffre est déduit de votre argent disponible.</Text>
          </ScrollView>
          <View style={styles.footer}>
            {error ? (
              <View style={styles.error} accessibilityRole="alert">
                <TriangleAlert size={16} color={colors.accent.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            <Pressable onPress={submit} disabled={busy || target <= 0} accessibilityRole="button" style={({ pressed }) => [styles.cta, (busy || target <= 0) && styles.ctaDisabled, pressed && { opacity: 0.85 }]}>
              {busy ? <ActivityIndicator color={colors.text.inverted} /> : <Check size={18} color={colors.text.inverted} />}
              <Text style={styles.ctaText}>Créer le projet</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  </TouchableWithoutFeedback>
</Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  keyboardAvoid: { width: '100%', justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%', backgroundColor: colors.surface.canvas, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.base, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.surface.border },
  headerTitle: { fontSize: typography.sizes.title, fontWeight: typography.weights.bold, color: colors.text.primary },
  content: { padding: spacing.base, gap: spacing.sm },
  field: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface.card, borderWidth: 1, borderColor: colors.surface.border, borderRadius: radii.md, paddingHorizontal: spacing.md, minHeight: 48 },
  input: { flex: 1, fontSize: typography.sizes.body, color: colors.text.primary, outlineStyle: 'none' } as never,
  label: { marginTop: spacing.sm, fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold, color: colors.text.secondary },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.full, backgroundColor: colors.brands.waveBg },
  chipOn: { backgroundColor: colors.primary.DEFAULT },
  chipDanger: { backgroundColor: colors.accent.danger },
  chipText: { fontSize: typography.sizes.bodySm, color: colors.text.primary },
  chipTextOn: { color: colors.text.inverted, fontWeight: typography.weights.bold },
  option: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44, borderRadius: radii.md, backgroundColor: colors.brands.waveBg, paddingHorizontal: 4 },
  optionOn: { backgroundColor: colors.primary.subtle, borderWidth: 2, borderColor: colors.primary.DEFAULT },
  hint: { fontSize: typography.sizes.caption, color: colors.text.secondary },
  vault: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface.card, borderWidth: 1, borderColor: colors.surface.border, borderRadius: radii.lg, padding: spacing.md },
  vaultOn: { borderWidth: 2, borderColor: colors.primary.DEFAULT, backgroundColor: colors.primary.subtle },
  vaultTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text.primary },
  footer: { padding: spacing.base, backgroundColor: colors.surface.card, borderTopWidth: 1, borderTopColor: colors.surface.border },
  error: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.accent.dangerBg, borderColor: colors.accent.dangerBorder, borderWidth: 1, borderRadius: radii.md, padding: spacing.sm, marginBottom: spacing.sm },
  errorText: { flex: 1, color: colors.accent.danger, fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 54, borderRadius: radii.lg, backgroundColor: colors.primary.DEFAULT },
  ctaDisabled: { backgroundColor: colors.text.muted },
  ctaText: { color: colors.text.inverted, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
});
