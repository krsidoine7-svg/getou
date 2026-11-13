/**
 * Nouvelle échéance / modification — GERETOU
 * Maquette Stitch « Nouvelle Deadline & Récurrence ».
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { X, TriangleAlert, Trash2, Check, CalendarDays, AlarmClock, Repeat, ChevronLeft, ChevronRight, CalendarPlus, BellRing } from 'lucide-react-native';
import { AmountCard } from '../transaction/AmountCard';
import { KIND_VISUALS, PRIORITY_LABELS } from './deadlineVisuals';
import { useAgendaStore } from '../../store/useAgendaStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useWalletStore } from '../../store/useWalletStore';
import { showToast } from '../../store/useToastStore';
import {
  DeadlineKind,
  DeadlinePriority,
  KIND_LABELS,
  Recurrence,
  RECURRENCE_LABELS,
  addDays,
  dueLabel,
  parseDay,
  quickDates,
  recurrenceRule,
  toDayString,
} from '../../services/agenda/deadlineCore';
import { Deadline, defaultTitle } from '../../services/agenda/deadlineRepo';
import { notificationsSupported } from '../../services/agenda/deadlineNotifications';
import { ACCOUNT_BRAND } from '../../theme/brand';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

const KINDS: DeadlineKind[] = ['BILL', 'RENT', 'SUBSCRIPTION', 'OTHER'];
const TIMES = ['07:00', '09:00', '12:00', '18:00'];
const REMINDERS = [
  { v: 0, l: 'Le jour J' },
  { v: 1, l: 'La veille' },
  { v: 3, l: '3 jours avant' },
];
const PRIORITIES: DeadlinePriority[] = ['NORMAL', 'HIGH', 'VITAL'];
const CYCLES: Recurrence[] = ['WEEKLY', 'MONTHLY', 'QUARTERLY'];

interface Props {
  visible: boolean;
  onClose: () => void;
  editing?: Deadline | null;
  /** Création : jour présélectionné (jour touché dans la semaine). */
  initialDay?: string | null;
}

export const DeadlineEditorModal: React.FC<Props> = ({ visible, onClose, editing, initialDay }) => {
  const { currentUser, recordActivity } = useAuthStore();
  const { summary } = useWalletStore();
  const { save, remove } = useAgendaStore();
  const accounts = summary.accounts.filter((a) => !a.is_archived);

  const [amount, setAmount] = useState(0);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<DeadlineKind>('BILL');
  const [day, setDay] = useState(toDayString(new Date()));
  const [time, setTime] = useState('09:00');
  const [remindBefore, setRemindBefore] = useState(1);
  const [repeat, setRepeat] = useState(false);
  const [cycle, setCycle] = useState<Recurrence>('MONTHLY');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [priority, setPriority] = useState<DeadlinePriority>('NORMAL');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setAmount(editing?.amount ?? 0);
    setTitle(editing?.title ?? '');
    setKind(editing?.kind ?? 'BILL');
    setDay(editing?.due_date ?? initialDay ?? quickDates()[0].day);
    setTime(editing?.remind_time ?? '09:00');
    setRemindBefore(editing?.remind_days_before ?? 1);
    setRepeat(editing ? editing.recurrence !== 'NONE' : false);
    setCycle(editing && editing.recurrence !== 'NONE' ? editing.recurrence : 'MONTHLY');
    setAccountId(editing?.account_id ?? accounts[0]?.id ?? null);
    setPriority(editing?.priority ?? 'NORMAL');
    setError(null);
    setConfirmDelete(false);
  }, [visible, editing?.id]);

  useEffect(() => setError(null), [amount, title, day, time]);

  const today = toDayString(new Date());

  const submit = async () => {
    if (!currentUser) return;
    recordActivity();
    if (day < today && !editing) return setError("La date est déjà passée : choisissez aujourd'hui ou plus tard.");
    setBusy(true);
    const failure = await save(
      {
        userId: currentUser.id,
        title: title.trim() || defaultTitle(kind),
        amount,
        kind,
        dueDate: day,
        remindTime: time,
        remindDaysBefore: remindBefore,
        recurrence: repeat ? cycle : 'NONE',
        accountId,
        priority,
      },
      editing?.id
    );
    setBusy(false);
    if (failure) return setError(failure);
    showToast({
      kind: 'success',
      title: editing ? 'Échéance modifiée' : 'Échéance enregistrée',
      message: notificationsSupported ? `Rappel programmé ${REMINDERS.find((r) => r.v === remindBefore)?.l.toLowerCase()} à ${time}.` : `${formatFCFA(amount)} · ${dueLabel(day)}.`,
    });
    onClose();
  };

  const doDelete = async () => {
    if (!currentUser || !editing) return;
    if (!confirmDelete) return setConfirmDelete(true);
    setBusy(true);
    const failure = await remove(currentUser.id, editing.id);
    setBusy(false);
    if (failure) return setError(failure);
    showToast({ kind: 'info', title: 'Échéance supprimée' });
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
                <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fermer">
                  <X size={22} color={colors.text.primary} />
                </Pressable>
                <Text style={styles.headerTitle}>{editing ? "Modifier l'échéance" : 'Nouvelle échéance'}</Text>
                <View style={{ width: 22 }} />
              </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <AmountCard label="Montant à honorer" amount={amount} onChange={setAmount} presets={[5000, 10000, 25000, 50000]} tone="expense" />

            <View style={styles.card}>
              <Text style={styles.label}>Intitulé de l'échéance</Text>
              <View style={styles.inputRow}>
                <CalendarPlus size={18} color={colors.text.secondary} />
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder={`ex : ${defaultTitle(kind)} CIE, loyer Cocody…`}
                  placeholderTextColor={colors.text.muted}
                  maxLength={60}
                  accessibilityLabel="Intitulé de l'échéance"
                  style={styles.input}
                />
              </View>
              <Text style={styles.label}>Type</Text>
              <View style={styles.wrap} accessibilityRole="radiogroup">
                {KINDS.map((k) => {
                  const on = k === kind;
                  const { Icon } = KIND_VISUALS[k];
                  return (
                    <Pressable key={k} onPress={() => setKind(k)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={KIND_LABELS[k]} style={[styles.kind, on && styles.kindOn]}>
                      <Icon size={16} color={on ? colors.text.inverted : colors.text.primary} />
                      <Text style={[styles.kindText, on && { color: colors.text.inverted }]} numberOfLines={1}>{KIND_LABELS[k]}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Date butoir & rappel</Text>
              <View style={styles.wrap}>
                {quickDates().map((q) => (
                  <Pressable key={q.label} onPress={() => setDay(q.day)} accessibilityRole="button" style={[styles.chip, day === q.day && styles.chipOn]}>
                    <Text style={[styles.chipText, day === q.day && styles.chipTextOn]}>{q.label}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.dateRow}>
                <Pressable onPress={() => setDay(addDays(day, -1))} disabled={day <= today} hitSlop={8} accessibilityRole="button" accessibilityLabel="Jour précédent" style={[styles.stepBtn, day <= today && { opacity: 0.3 }]}>
                  <ChevronLeft size={18} color={colors.text.primary} />
                </Pressable>
                <View style={styles.dateBox}>
                  <CalendarDays size={18} color={colors.text.primary} />
                  <Text style={styles.dateText}>{parseDay(day).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                </View>
                <Pressable onPress={() => setDay(addDays(day, 1))} hitSlop={8} accessibilityRole="button" accessibilityLabel="Jour suivant" style={styles.stepBtn}>
                  <ChevronRight size={18} color={colors.text.primary} />
                </Pressable>
              </View>
              <View style={styles.inline}>
                <AlarmClock size={16} color={colors.text.secondary} />
                <Text style={styles.sub}>Heure du rappel</Text>
              </View>
              <View style={styles.wrap}>
                {TIMES.map((t) => (
                  <Pressable key={t} onPress={() => setTime(t)} accessibilityRole="radio" accessibilityState={{ checked: time === t }} style={[styles.chip, time === t && styles.chipOn]}>
                    <Text style={[styles.chipText, time === t && styles.chipTextOn]}>{t}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.inline}>
                <BellRing size={16} color={colors.text.secondary} />
                <Text style={styles.sub}>Me prévenir</Text>
              </View>
              <View style={styles.row}>
                {REMINDERS.map((r) => (
                  <Pressable key={r.v} onPress={() => setRemindBefore(r.v)} accessibilityRole="radio" accessibilityState={{ checked: remindBefore === r.v }} style={[styles.option, remindBefore === r.v && styles.optionOn]}>
                    <Text style={[styles.chipText, remindBefore === r.v && styles.optionTextOn]}>{r.l}</Text>
                  </Pressable>
                ))}
              </View>
              {!notificationsSupported ? <Text style={styles.note}>Les rappels sonnent sur le téléphone (pas dans le navigateur).</Text> : null}
            </View>

            <View style={styles.card}>
              <View style={styles.repeatHead}>
                <View style={styles.repeatIcon}>
                  <Repeat size={18} color={colors.primary.DEFAULT} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Répéter cette échéance</Text>
                  <Text style={styles.sub}>La suivante est créée quand celle-ci est réglée</Text>
                </View>
                <Switch value={repeat} onValueChange={setRepeat} trackColor={{ false: colors.surface.border, true: colors.primary.DEFAULT }} accessibilityLabel="Répéter cette échéance" />
              </View>
              {repeat ? (
                <>
                  <View style={styles.segment}>
                    {CYCLES.map((c) => (
                      <Pressable key={c} onPress={() => setCycle(c)} accessibilityRole="radio" accessibilityState={{ checked: cycle === c }} style={[styles.segmentItem, cycle === c && styles.segmentOn]}>
                        <Text style={[styles.chipText, cycle === c && styles.optionTextOn]}>{RECURRENCE_LABELS[c]}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.ruleBox}>
                    <Text style={styles.sub}>Règle :</Text>
                    <View style={styles.rulePill}>
                      <Text style={styles.rulePillText}>{recurrenceRule(day, cycle)}</Text>
                    </View>
                  </View>
                </>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Compte prévu pour payer</Text>
              <View style={styles.wrap}>
                {accounts.map((a) => {
                  const on = a.id === accountId;
                  const brand = ACCOUNT_BRAND[a.type];
                  return (
                    <Pressable key={a.id} onPress={() => setAccountId(a.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={a.name} style={[styles.account, on && { backgroundColor: colors.primary.DEFAULT, borderColor: colors.primary.DEFAULT }]}>
                      <Text style={[styles.accountName, { color: on ? colors.text.inverted : brand.fg }]} numberOfLines={1}>{a.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.label}>Niveau d'impact</Text>
              <View style={styles.row}>
                {PRIORITIES.map((p) => {
                  const on = p === priority;
                  const vital = p === 'VITAL';
                  return (
                    <Pressable key={p} onPress={() => setPriority(p)} accessibilityRole="radio" accessibilityState={{ checked: on }} style={[styles.option, on && (vital ? styles.optionVital : styles.optionOn)]}>
                      {vital ? <TriangleAlert size={14} color={on ? colors.accent.danger : colors.text.secondary} /> : null}
                      <Text style={[styles.chipText, on && (vital ? { color: colors.accent.danger, fontWeight: typography.weights.bold } : styles.optionTextOn)]}>{PRIORITY_LABELS[p]}</Text>
                    </Pressable>
                  );
                })}
              </View>
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
                <Pressable onPress={doDelete} disabled={busy} accessibilityRole="button" style={[styles.delete, confirmDelete && styles.deleteOn]}>
                  <Trash2 size={18} color={confirmDelete ? colors.text.inverted : colors.accent.danger} />
                  <Text style={[styles.deleteText, confirmDelete && { color: colors.text.inverted }]}>{confirmDelete ? 'Confirmer' : 'Supprimer'}</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={submit} disabled={busy || amount <= 0} accessibilityRole="button" style={({ pressed }) => [styles.cta, (busy || amount <= 0) && styles.ctaDisabled, pressed && { opacity: 0.85 }]}>
                {busy ? <ActivityIndicator color={colors.text.inverted} /> : <Check size={18} color={colors.text.inverted} />}
                <Text style={styles.ctaText} numberOfLines={1}>{amount > 0 ? `Enregistrer l'échéance (${formatFCFA(amount)})` : "Enregistrer l'échéance"}</Text>
              </Pressable>
            </View>
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
  sheet: { maxHeight: '92%', backgroundColor: colors.surface.canvas, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.base, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.surface.border },
  headerTitle: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text.primary },
  content: { padding: spacing.base, gap: spacing.md },
  card: { backgroundColor: colors.surface.card, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.surface.border, padding: spacing.base, gap: spacing.sm },
  cardTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text.primary },
  label: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold, color: colors.text.secondary },
  sub: { fontSize: typography.sizes.bodySm, color: colors.text.secondary },
  note: { fontSize: typography.sizes.caption, color: colors.text.muted },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.brands.waveBg, borderRadius: radii.md, paddingHorizontal: spacing.md, minHeight: 48 },
  input: { flex: 1, fontSize: typography.sizes.body, color: colors.text.primary, outlineStyle: 'none' } as never,
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  kind: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md, backgroundColor: colors.brands.waveBg },
  kindOn: { backgroundColor: colors.primary.DEFAULT },
  kindText: { fontSize: typography.sizes.bodySm, color: colors.text.primary },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.full, backgroundColor: colors.brands.waveBg },
  chipOn: { backgroundColor: colors.primary.DEFAULT },
  chipText: { fontSize: typography.sizes.bodySm, color: colors.text.primary },
  chipTextOn: { color: colors.text.inverted, fontWeight: typography.weights.bold },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepBtn: { width: 40, height: 44, borderRadius: radii.md, backgroundColor: colors.brands.waveBg, alignItems: 'center', justifyContent: 'center' },
  dateBox: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 44, borderRadius: radii.md, backgroundColor: colors.brands.waveBg },
  dateText: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text.primary },
  option: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 44, borderRadius: radii.md, backgroundColor: colors.brands.waveBg, paddingHorizontal: 4 },
  optionOn: { backgroundColor: colors.primary.subtle, borderWidth: 2, borderColor: colors.primary.DEFAULT },
  optionVital: { backgroundColor: colors.accent.dangerBg, borderWidth: 2, borderColor: colors.accent.danger },
  optionTextOn: { color: colors.primary.DEFAULT, fontWeight: typography.weights.bold },
  repeatHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  repeatIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary.subtle, alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row', backgroundColor: colors.brands.waveBg, borderRadius: radii.md, padding: 3 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radii.sm },
  segmentOn: { backgroundColor: colors.surface.card },
  ruleBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.brands.waveBg, borderRadius: radii.md, padding: spacing.sm },
  rulePill: { backgroundColor: colors.primary.container, borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: 3 },
  rulePillText: { fontSize: typography.sizes.bodySm, color: colors.primary.dark, fontWeight: typography.weights.semibold },
  account: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: colors.surface.border, backgroundColor: colors.surface.card },
  accountName: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold },
  footer: { padding: spacing.base, backgroundColor: colors.surface.card, borderTopWidth: 1, borderTopColor: colors.surface.border },
  error: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.accent.dangerBg, borderColor: colors.accent.dangerBorder, borderWidth: 1, borderRadius: radii.md, padding: spacing.sm, marginBottom: spacing.sm },
  errorText: { flex: 1, color: colors.accent.danger, fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold },
  delete: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, minHeight: 52, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.accent.dangerBorder, backgroundColor: colors.accent.dangerBg },
  deleteOn: { backgroundColor: colors.accent.danger, borderColor: colors.accent.danger },
  deleteText: { color: colors.accent.danger, fontWeight: typography.weights.bold },
  cta: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 52, borderRadius: radii.lg, backgroundColor: colors.primary.DEFAULT, paddingHorizontal: spacing.sm },
  ctaDisabled: { backgroundColor: colors.text.muted },
  ctaText: { color: colors.text.inverted, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, flexShrink: 1 },
});
