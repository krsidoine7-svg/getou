/**
 * Alerte d'échéance / règlement — GERETOU
 * Maquette Stitch « Alerte Échéance (24h avant) ». Ouvert depuis l'agenda ou en touchant un rappel.
 */

import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { ArrowLeft, Clock, TriangleAlert, BellRing, CircleCheck, CheckCheck, AlarmClockPlus, ArrowRight, Ban, CalendarX } from 'lucide-react-native';
import { KIND_VISUALS, PRIORITY_LABELS } from '../../components/agenda/deadlineVisuals';
import { useAuthStore } from '../../store/useAuthStore';
import { useAgendaStore } from '../../store/useAgendaStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useNavStore } from '../../store/useNavStore';
import { showToast } from '../../store/useToastStore';
import { KIND_LABELS, daysUntil, dueLabel, parseDay, reminderDate } from '../../services/agenda/deadlineCore';
import { ACCOUNT_BRAND } from '../../theme/brand';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

function countdown(due: Date, now: Date): string {
  const ms = due.getTime() - now.getTime();
  if (ms <= 0) {
    const late = Math.floor(-ms / 86_400_000);
    return late >= 1 ? `EN RETARD DE ${late} J` : 'ÉCHÉANCE DÉPASSÉE';
  }
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return days > 0 ? `J-${days} · ${hours} H ${String(minutes).padStart(2, '0')} RESTANTES` : `${hours} H ${String(minutes).padStart(2, '0')} RESTANTES`;
}

export const DeadlineAlertScreen: React.FC = () => {
  const { currentUser, recordActivity } = useAuthStore();
  const { deadlines, focusId, refresh, pay, markPaid, postpone } = useAgendaStore();
  const { summary, fetchWallet } = useWalletStore();
  const { goBack, replace } = useNavStore();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'pay' | 'mark' | 'later'>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  const d = deadlines.find((x) => x.id === focusId) ?? null;
  const accounts = summary.accounts.filter((a) => !a.is_archived);

  useEffect(() => {
    if (!currentUser?.id) return;
    refresh(currentUser.id);
    fetchWallet(currentUser.id);
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, [currentUser?.id, focusId]);

  // Compte proposé : celui prévu s'il a assez, sinon le premier qui suffit
  useEffect(() => {
    if (!d) return;
    const planned = accounts.find((a) => a.id === d.account_id && a.balance >= d.amount);
    setAccountId((planned ?? accounts.find((a) => a.balance >= d.amount) ?? null)?.id ?? null);
  }, [d?.id, summary.accounts]);

  const leave = () => replace('AGENDA');

  if (!d) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={leave} hitSlop={12} accessibilityRole="button" accessibilityLabel="Retour">
            <ArrowLeft size={24} color={colors.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Échéance</Text>
        </View>
        <View style={styles.missing}>
          <CalendarX size={36} color={colors.text.muted} />
          <Text style={styles.missingText}>Cette échéance a déjà été réglée ou supprimée.</Text>
          <Pressable onPress={leave} accessibilityRole="button" style={styles.secondary}>
            <Text style={styles.secondaryText}>Voir l'agenda</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const { Icon, fg, bg } = KIND_VISUALS[d.kind];
  const dueAt = reminderDate(d.due_date, d.remind_time, 0);
  const n = daysUntil(d.due_date, now);
  const urgent = n <= 1;
  const chosen = accounts.find((a) => a.id === accountId);

  const act = async (kind: 'pay' | 'mark' | 'later') => {
    if (!currentUser) return;
    recordActivity();
    setError(null);
    setBusy(kind);
    let failure: string | null = null;
    if (kind === 'pay') {
      if (!accountId) failure = "Aucun compte n'a un solde suffisant.";
      else failure = await pay(currentUser.id, d.id, accountId);
    } else if (kind === 'mark') failure = await markPaid(currentUser.id, d.id);
    else failure = await postpone(currentUser.id, d.id, 1);
    setBusy(null);
    if (failure) return setError(failure);
    await fetchWallet(currentUser.id);
    const repeat = d.recurrence !== 'NONE' ? ' La prochaine échéance est déjà planifiée.' : '';
    showToast(
      kind === 'pay'
        ? { kind: 'success', title: `${d.title} réglée`, message: `${formatFCFA(d.amount)} débités de ${chosen?.name}.${repeat}` }
        : kind === 'mark'
          ? { kind: 'success', title: 'Marquée comme réglée', message: `Aucune dépense ajoutée.${repeat}` }
          : { kind: 'info', title: 'Échéance repoussée', message: 'Reportée de 24 heures.' }
    );
    if (kind === 'later') return;
    leave();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Retour">
          <ArrowLeft size={24} color={colors.text.primary} />
        </Pressable>
        <View style={[styles.inline, { flex: 1 }]}>
          <TriangleAlert size={20} color={urgent ? colors.accent.danger : colors.text.primary} />
          <Text style={styles.headerTitle}>Détail de l'échéance</Text>
        </View>
        {urgent ? (
          <View style={styles.urgentPill}>
            <Clock size={12} color={colors.accent.danger} />
            <Text style={styles.urgentText}>{n < 0 ? 'EN RETARD' : 'URGENT'}</Text>
          </View>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.content} onTouchStart={recordActivity}>
        <View style={styles.notif}>
          <View style={styles.notifHead}>
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>G</Text>
            </View>
            <Text style={styles.notifApp}>Rappel GERETOU</Text>
            <BellRing size={16} color={colors.text.muted} />
          </View>
          <View style={styles.inlineTop}>
            <View style={[styles.notifIcon, { backgroundColor: bg }]}>
              <Icon size={20} color={fg} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.notifTitle}>Échéance {dueLabel(d.due_date, now).toLowerCase()} !</Text>
              <Text style={styles.notifText}>
                {d.title} (<Text style={styles.bold}>{formatFCFA(d.amount)}</Text>) {n < 0 ? 'est en retard' : n === 0 ? "arrive à échéance aujourd'hui" : 'arrive bientôt à échéance'}.
                {d.priority === 'VITAL' ? ' Risque de coupure si elle n’est pas réglée.' : ''}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.main}>
          <View style={styles.mainHead}>
            <View style={[styles.countPill, !urgent && { backgroundColor: colors.primary.subtle }]}>
              <Clock size={12} color={urgent ? colors.accent.danger : colors.primary.DEFAULT} />
              <Text style={[styles.countText, !urgent && { color: colors.primary.DEFAULT }]}>{countdown(dueAt, now)}</Text>
            </View>
          </View>
          <Text style={styles.mainTitle}>{d.title}</Text>
          <View style={styles.amountBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.amountLabel}>MONTANT À RÉGLER</Text>
              <Text style={styles.amount}>
                {formatFCFA(d.amount).replace(' FCFA', '')}
                <Text style={styles.amountUnit}> FCFA</Text>
              </Text>
            </View>
            <Text style={styles.dueText}>
              {parseDay(d.due_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              {'\n'}
              {d.remind_time}
            </Text>
          </View>
          <View style={styles.tags}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{KIND_LABELS[d.kind]}</Text>
            </View>
            {d.priority !== 'NORMAL' ? (
              <View style={[styles.tag, { backgroundColor: colors.accent.dangerBg }]}>
                <Text style={[styles.tagText, { color: colors.accent.danger }]}>{PRIORITY_LABELS[d.priority]}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Compte à débiter</Text>
          <Text style={styles.sectionHint}>En 1 geste</Text>
        </View>
        {accounts.map((a) => {
          const enough = a.balance >= d.amount;
          const on = a.id === accountId;
          const brand = ACCOUNT_BRAND[a.type];
          return (
            <Pressable
              key={a.id}
              onPress={() => enough && setAccountId(a.id)}
              disabled={!enough}
              accessibilityRole="radio"
              accessibilityState={{ checked: on, disabled: !enough }}
              accessibilityLabel={`${a.name}, ${formatFCFA(a.balance)}${enough ? '' : ', solde insuffisant'}`}
              style={[styles.account, on && styles.accountOn, !enough && { opacity: 0.55 }]}
            >
              <View style={[styles.accountIcon, { backgroundColor: brand.bg }]}>
                <Text style={[styles.accountInitial, { color: brand.fg }]}>{a.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.inline}>
                  <Text style={styles.accountName}>{a.name}</Text>
                  {a.id === d.account_id ? (
                    <View style={styles.plannedPill}>
                      <Text style={styles.plannedText}>PRÉVU</Text>
                    </View>
                  ) : null}
                  {!enough ? (
                    <View style={styles.missingPill}>
                      <Text style={styles.missingPillText}>MANQUE {formatFCFA(d.amount - a.balance).replace(' FCFA', ' F')}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.accountBalance}>Solde : {formatFCFA(a.balance)}</Text>
              </View>
              {enough ? <View style={[styles.radio, on && styles.radioOn]} /> : <Ban size={20} color={colors.text.muted} />}
            </Pressable>
          );
        })}

        {error ? (
          <View style={styles.error} accessibilityRole="alert">
            <TriangleAlert size={16} color={colors.accent.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Pressable onPress={() => act('pay')} disabled={busy !== null || !accountId} accessibilityRole="button" style={({ pressed }) => [styles.payBtn, (!accountId || busy !== null) && { opacity: 0.6 }, pressed && { opacity: 0.85 }]}>
          <View style={styles.payIcon}>
            {busy === 'pay' ? <ActivityIndicator color={colors.text.inverted} /> : <Icon size={20} color={colors.text.inverted} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.payTitle} numberOfLines={1}>Régler : {d.title}</Text>
            <Text style={styles.paySub}>{chosen ? `Via ${chosen.name} · ${formatFCFA(d.amount)}` : 'Aucun compte avec un solde suffisant'}</Text>
          </View>
          <ArrowRight size={22} color={colors.text.inverted} />
        </Pressable>

        <View style={styles.row}>
          <Pressable onPress={() => act('mark')} disabled={busy !== null} accessibilityRole="button" style={({ pressed }) => [styles.secondary, styles.secondaryGreen, pressed && { opacity: 0.7 }]}>
            {busy === 'mark' ? <ActivityIndicator color={colors.primary.DEFAULT} /> : <CheckCheck size={18} color={colors.primary.DEFAULT} />}
            <Text style={[styles.secondaryText, { color: colors.primary.DEFAULT }]}>Déjà réglé</Text>
          </Pressable>
          <Pressable onPress={() => act('later')} disabled={busy !== null} accessibilityRole="button" style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.7 }]}>
            {busy === 'later' ? <ActivityIndicator color={colors.text.primary} /> : <AlarmClockPlus size={18} color={colors.text.primary} />}
            <Text style={styles.secondaryText}>Repousser 24 h</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>« Déjà réglé » : payée en dehors de l'app, aucune dépense n'est ajoutée.</Text>

        <View style={styles.info}>
          <CircleCheck size={18} color={colors.primary.DEFAULT} />
          <Text style={styles.infoText}>Le rappel est calculé et déclenché par ce téléphone, sans connexion ni serveur.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.canvas },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.base, paddingVertical: spacing.md, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.surface.border },
  headerTitle: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text.primary },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  inlineTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  urgentPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.accent.dangerBg, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.full },
  urgentText: { fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, color: colors.accent.danger, letterSpacing: 0.5 },
  content: { padding: spacing.base, paddingBottom: spacing.xxl, gap: spacing.md },
  notif: { backgroundColor: colors.surface.card, borderRadius: radii.xl, padding: spacing.base, gap: spacing.sm, borderWidth: 1, borderColor: colors.surface.border },
  notifHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  notifBadge: { width: 26, height: 26, borderRadius: radii.sm, backgroundColor: colors.primary.DEFAULT, alignItems: 'center', justifyContent: 'center' },
  notifBadgeText: { color: colors.text.inverted, fontWeight: typography.weights.bold, fontSize: 12 },
  notifApp: { flex: 1, fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold, color: colors.text.primary },
  notifIcon: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  notifTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text.primary },
  notifText: { marginTop: 2, fontSize: typography.sizes.bodySm, lineHeight: 19, color: colors.text.secondary },
  bold: { fontWeight: typography.weights.bold, color: colors.text.primary },
  main: { backgroundColor: colors.surface.card, borderRadius: radii.xl, padding: spacing.base, gap: spacing.md, borderWidth: 1, borderColor: colors.surface.border },
  mainHead: { flexDirection: 'row' },
  countPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.accent.dangerBg, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.full },
  countText: { fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, color: colors.accent.danger, letterSpacing: 0.5 },
  mainTitle: { fontSize: typography.sizes.headline, fontWeight: typography.weights.bold, color: colors.text.primary },
  amountBox: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, backgroundColor: colors.brands.waveBg, borderRadius: radii.lg, padding: spacing.base },
  amountLabel: { fontSize: typography.sizes.caption, letterSpacing: 1, color: colors.text.secondary },
  amount: { fontSize: 34, fontWeight: typography.weights.extrabold, color: colors.primary.dark },
  amountUnit: { fontSize: typography.sizes.body, fontWeight: typography.weights.medium, color: colors.text.secondary },
  dueText: { fontSize: typography.sizes.bodySm, color: colors.text.secondary, textAlign: 'right' },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radii.full, backgroundColor: colors.brands.waveBg },
  tagText: { fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, color: colors.text.secondary },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  sectionTitle: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text.primary },
  sectionHint: { fontSize: typography.sizes.caption, color: colors.primary.DEFAULT, fontWeight: typography.weights.semibold },
  account: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface.card, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.surface.border, padding: spacing.md },
  accountOn: { borderWidth: 2, borderColor: colors.primary.DEFAULT },
  accountIcon: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  accountInitial: { fontSize: typography.sizes.title, fontWeight: typography.weights.bold },
  accountName: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text.primary },
  accountBalance: { fontSize: typography.sizes.bodySm, color: colors.text.secondary },
  plannedPill: { backgroundColor: colors.primary.DEFAULT, borderRadius: radii.sm, paddingHorizontal: 5, paddingVertical: 1 },
  plannedText: { color: colors.text.inverted, fontSize: 10, fontWeight: typography.weights.bold },
  missingPill: { backgroundColor: colors.accent.dangerBg, borderRadius: radii.sm, paddingHorizontal: 5, paddingVertical: 1 },
  missingPillText: { color: colors.accent.danger, fontSize: 10, fontWeight: typography.weights.bold },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.surface.border },
  radioOn: { borderWidth: 7, borderColor: colors.primary.DEFAULT },
  error: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.accent.dangerBg, borderColor: colors.accent.dangerBorder, borderWidth: 1, borderRadius: radii.md, padding: spacing.sm },
  errorText: { flex: 1, color: colors.accent.danger, fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold },
  payBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.primary.DEFAULT, borderRadius: radii.xl, padding: spacing.base, marginTop: spacing.sm },
  payIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary.light, alignItems: 'center', justifyContent: 'center' },
  payTitle: { color: colors.text.inverted, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold },
  paySub: { color: colors.primary.container, fontSize: typography.sizes.bodySm },
  row: { flexDirection: 'row', gap: spacing.sm },
  secondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 52, borderRadius: radii.lg, backgroundColor: colors.brands.waveBg },
  secondaryGreen: { backgroundColor: colors.primary.container },
  secondaryText: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text.primary },
  hint: { fontSize: typography.sizes.caption, color: colors.text.secondary, textAlign: 'center' },
  info: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.primary.subtle, borderRadius: radii.lg, padding: spacing.md },
  infoText: { flex: 1, fontSize: typography.sizes.bodySm, color: colors.text.secondary, lineHeight: 19 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  missingText: { fontSize: typography.sizes.body, color: colors.text.secondary, textAlign: 'center' },
});
