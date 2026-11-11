/**
 * Créer / modifier un plafond — GERETOU
 * Global ou par catégorie, par jour ou par mois, avec seuil d'alerte.
 */

import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { X, TriangleAlert, Trash2, Check, Globe, Tags } from 'lucide-react-native';
import { AmountCard } from '../transaction/AmountCard';
import { CategoryIcon } from '../common/AppIcons';
import { TransactionService } from '../../services/transaction/transactionService';
import { categoryDisplay } from '../../services/transaction/labels';
import { useBudgetStore } from '../../store/useBudgetStore';
import { useAuthStore } from '../../store/useAuthStore';
import { showToast } from '../../store/useToastStore';
import { BudgetView } from '../../services/budget/budgetRepo';
import { BudgetPeriod, Category } from '../../types/database';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

const THRESHOLDS = [0.8, 0.85, 0.9];

interface BudgetEditorModalProps {
  visible: boolean;
  onClose: () => void;
  /** Plafond à modifier ; absent = création. */
  editing?: BudgetView | null;
  /** Création : portée proposée par défaut. */
  defaultScope?: 'global' | 'category';
  defaultPeriod?: BudgetPeriod;
}

export const BudgetEditorModal: React.FC<BudgetEditorModalProps> = ({ visible, onClose, editing, defaultScope = 'category', defaultPeriod = 'MONTH' }) => {
  const { currentUser, recordActivity } = useAuthStore();
  const { save, remove } = useBudgetStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [scope, setScope] = useState<'global' | 'category'>(defaultScope);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [period, setPeriod] = useState<BudgetPeriod>(defaultPeriod);
  const [limit, setLimit] = useState(0);
  const [threshold, setThreshold] = useState(0.8);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!visible) return;
    TransactionService.getCategories('EXPENSE').then(setCategories).catch(() => setCategories([]));
    setScope(editing ? (editing.category_id ? 'category' : 'global') : defaultScope);
    setCategoryId(editing?.category_id ?? null);
    setPeriod(editing?.period ?? defaultPeriod);
    setLimit(editing?.limit_amount ?? 0);
    setThreshold(editing?.alert_threshold ?? 0.8);
    setError(null);
    setConfirmDelete(false);
  }, [visible, editing?.id]);

  useEffect(() => setError(null), [scope, categoryId, period, limit, threshold]);

  const submit = async () => {
    if (!currentUser) return;
    recordActivity();
    if (scope === 'category' && !categoryId) return setError('Choisissez la catégorie à plafonner.');
    setBusy(true);
    const failure = await save(
      { userId: currentUser.id, period, categoryId: scope === 'global' ? null : categoryId, limitAmount: limit, alertThreshold: threshold },
      editing?.id
    );
    setBusy(false);
    if (failure) return setError(failure);
    showToast({ kind: 'success', title: editing ? 'Plafond modifié' : 'Plafond enregistré', message: `${formatFCFA(limit)} ${period === 'DAY' ? 'par jour' : 'par mois'}.` });
    onClose();
  };

  const doDelete = async () => {
    if (!currentUser || !editing) return;
    if (!confirmDelete) return setConfirmDelete(true);
    setBusy(true);
    await remove(currentUser.id, editing.id);
    setBusy(false);
    showToast({ kind: 'info', title: 'Plafond supprimé', message: 'Vos dépenses passées ne sont pas modifiées.' });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{editing ? 'Modifier le plafond' : 'Nouveau plafond'}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fermer">
              <X size={22} color={colors.text.primary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Portée</Text>
            <View style={styles.row} accessibilityRole="radiogroup">
              {[
                { v: 'global' as const, l: 'Toutes dépenses', Icon: Globe },
                { v: 'category' as const, l: 'Une catégorie', Icon: Tags },
              ].map(({ v, l, Icon }) => (
                <Pressable key={v} onPress={() => setScope(v)} accessibilityRole="radio" accessibilityState={{ checked: scope === v }} accessibilityLabel={l} style={[styles.option, scope === v && styles.optionOn]}>
                  <Icon size={18} color={scope === v ? colors.primary.DEFAULT : colors.text.secondary} />
                  <Text style={[styles.optionText, scope === v && styles.optionTextOn]}>{l}</Text>
                </Pressable>
              ))}
            </View>

            {scope === 'category' ? (
              <>
                <Text style={styles.label}>Catégorie</Text>
                <View style={styles.cats} accessibilityRole="radiogroup">
                  {categories.map((c) => {
                    const on = c.id === categoryId;
                    return (
                      <Pressable key={c.id} onPress={() => setCategoryId(c.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={c.name} style={[styles.cat, on && styles.optionOn]}>
                        <CategoryIcon name={c.icon} size={16} color={on ? colors.primary.DEFAULT : c.color || colors.text.secondary} />
                        <Text style={[styles.catText, on && styles.optionTextOn]} numberOfLines={1}>{categoryDisplay(c).short}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            <Text style={styles.label}>Période</Text>
            <View style={styles.row} accessibilityRole="radiogroup">
              {[
                { v: 'MONTH' as const, l: 'Par mois' },
                { v: 'DAY' as const, l: 'Par jour' },
              ].map(({ v, l }) => (
                <Pressable key={v} onPress={() => setPeriod(v)} accessibilityRole="radio" accessibilityState={{ checked: period === v }} accessibilityLabel={l} style={[styles.option, period === v && styles.optionOn]}>
                  <Text style={[styles.optionText, period === v && styles.optionTextOn]}>{l}</Text>
                </Pressable>
              ))}
            </View>

            <AmountCard label="Plafond" amount={limit} onChange={setLimit} presets={period === 'DAY' ? [1000, 5000, 10000, 20000] : [10000, 25000, 50000, 100000]} tone="expense" />

            <Text style={styles.label}>M'alerter à</Text>
            <View style={styles.row} accessibilityRole="radiogroup">
              {THRESHOLDS.map((t) => (
                <Pressable key={t} onPress={() => setThreshold(t)} accessibilityRole="radio" accessibilityState={{ checked: threshold === t }} accessibilityLabel={`${Math.round(t * 100)} %`} style={[styles.option, threshold === t && styles.optionWarn]}>
                  <Text style={[styles.optionText, threshold === t && { color: '#B45309', fontWeight: typography.weights.bold }]}>{Math.round(t * 100)} %</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            {error ? (
              <View style={styles.error} accessibilityRole="alert">
                <TriangleAlert size={16} color={colors.accent.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            <View style={styles.row}>
              {editing ? (
                <Pressable onPress={doDelete} disabled={busy} accessibilityRole="button" style={[styles.delete, confirmDelete && styles.deleteConfirm]}>
                  <Trash2 size={18} color={confirmDelete ? colors.text.inverted : colors.accent.danger} />
                  <Text style={[styles.deleteText, confirmDelete && { color: colors.text.inverted }]}>{confirmDelete ? 'Confirmer' : 'Supprimer'}</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={submit} disabled={busy || limit <= 0} accessibilityRole="button" style={({ pressed }) => [styles.cta, (busy || limit <= 0) && styles.ctaDisabled, pressed && { opacity: 0.85 }]}>
                {busy ? <ActivityIndicator color={colors.text.inverted} /> : <Check size={18} color={colors.text.inverted} />}
                <Text style={styles.ctaText}>Enregistrer le plafond</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', backgroundColor: colors.surface.canvas, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
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
  row: { flexDirection: 'row', gap: spacing.sm },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
    backgroundColor: colors.surface.card,
  },
  optionOn: { borderWidth: 2, borderColor: colors.primary.DEFAULT, backgroundColor: colors.primary.subtle },
  optionWarn: { borderWidth: 2, borderColor: colors.accent.warning, backgroundColor: colors.accent.warningBg },
  optionText: { fontSize: typography.sizes.bodySm, color: colors.text.primary },
  optionTextOn: { color: colors.primary.DEFAULT, fontWeight: typography.weights.bold },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.surface.border,
    backgroundColor: colors.surface.card,
  },
  catText: { fontSize: typography.sizes.bodySm, color: colors.text.primary },
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
  delete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    minHeight: 52,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.accent.dangerBorder,
    backgroundColor: colors.accent.dangerBg,
  },
  deleteConfirm: { backgroundColor: colors.accent.danger, borderColor: colors.accent.danger },
  deleteText: { color: colors.accent.danger, fontWeight: typography.weights.bold },
  cta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.primary.DEFAULT,
  },
  ctaDisabled: { backgroundColor: colors.text.muted },
  ctaText: { color: colors.text.inverted, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
});
