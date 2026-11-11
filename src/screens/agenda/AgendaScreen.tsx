/**
 * Agenda & Échéances — GERETOU
 * Maquette Stitch « Agenda & Échéancier Financier ».
 */

import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { ArrowLeft, Plus, CalendarDays, ChevronLeft, ChevronRight, CalendarClock, TriangleAlert, Repeat, Wallet, Pencil, CalendarCheck } from 'lucide-react-native';
import { DeadlineEditorModal } from '../../components/agenda/DeadlineEditorModal';
import { KIND_VISUALS } from '../../components/agenda/deadlineVisuals';
import { useAuthStore } from '../../store/useAuthStore';
import { useAgendaStore } from '../../store/useAgendaStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useNavStore } from '../../store/useNavStore';
import {
  DeadlineBucket,
  DeadlineKind,
  KIND_LABELS,
  RECURRENCE_LABELS,
  bucketOf,
  daysUntil,
  dueLabel,
  parseDay,
  toDayString,
  weekDays,
} from '../../services/agenda/deadlineCore';
import { Deadline } from '../../services/agenda/deadlineRepo';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

const SECTIONS: { bucket: DeadlineBucket; title: string; dot: string }[] = [
  { bucket: 'overdue', title: 'En retard', dot: colors.accent.danger },
  { bucket: 'urgent', title: 'Urgent & prioritaire (sous 48 h)', dot: colors.accent.danger },
  { bucket: 'upcoming', title: 'À venir', dot: colors.primary.DEFAULT },
];

export const AgendaScreen: React.FC = () => {
  const { currentUser, recordActivity } = useAuthStore();
  const { deadlines, refresh, isLoading, setFocus } = useAgendaStore();
  const { fetchWallet } = useWalletStore();
  const { goBack, navigate } = useNavStore();

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<DeadlineKind | 'ALL'>('ALL');
  const [editor, setEditor] = useState<{ editing?: Deadline | null } | null>(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    refresh(currentUser.id);
    fetchWallet(currentUser.id);
  }, [currentUser?.id]);

  const now = new Date();
  const today = toDayString(now);
  const days = weekDays(new Date(now.getFullYear(), now.getMonth(), now.getDate() + weekOffset * 7));
  const rangeLabel = (() => {
    const a = parseDay(days[0]);
    const b = parseDay(days[6]);
    const ma = a.toLocaleDateString('fr-FR', { month: 'long' });
    const mb = b.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return a.getMonth() === b.getMonth() ? mb : `${ma} — ${mb}`;
  })();

  const next7 = deadlines.filter((d) => {
    const n = daysUntil(d.due_date, now);
    return n >= 0 && n < 7;
  });
  const next7Total = next7.reduce((s, d) => s + d.amount, 0);
  const kindsPresent = Array.from(new Set(deadlines.map((d) => d.kind)));

  const visible = useMemo(
    () => deadlines.filter((d) => (kindFilter === 'ALL' || d.kind === kindFilter) && (!selectedDay || d.due_date === selectedDay)),
    [deadlines, kindFilter, selectedDay]
  );

  const openPay = (d: Deadline) => {
    recordActivity();
    setFocus(d.id);
    navigate('DEADLINE_ALERT');
  };

  const renderCard = (d: Deadline) => {
    const { Icon, fg, bg } = KIND_VISUALS[d.kind];
    const bucket = bucketOf(d.due_date, now);
    const hot = bucket !== 'upcoming';
    return (
      <View key={d.id} style={[styles.card, hot && styles.cardHot]}>
        <View style={styles.cardHead}>
          <View style={[styles.cardIcon, { backgroundColor: bg }]}>
            <Icon size={22} color={fg} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={2}>{d.title}</Text>
            <Text style={[styles.cardDue, { color: hot ? colors.accent.danger : colors.text.secondary }]}>{dueLabel(d.due_date, now)} · {d.remind_time}</Text>
          </View>
          <Text style={styles.cardAmount}>
            {formatFCFA(d.amount).replace(' FCFA', '')}
            {'\n'}
            <Text style={styles.cardUnit}>FCFA</Text>
          </Text>
        </View>
        <View style={styles.tags}>
          {d.priority === 'VITAL' ? (
            <View style={[styles.tag, styles.tagDanger]}>
              <TriangleAlert size={12} color={colors.accent.danger} />
              <Text style={[styles.tagText, { color: colors.accent.danger }]}>Coupure possible</Text>
            </View>
          ) : d.priority === 'HIGH' ? (
            <View style={[styles.tag, styles.tagWarn]}>
              <Text style={[styles.tagText, { color: '#B45309' }]}>Important</Text>
            </View>
          ) : null}
          {d.recurrence !== 'NONE' ? (
            <View style={styles.tag}>
              <Repeat size={12} color={colors.text.secondary} />
              <Text style={styles.tagText}>{RECURRENCE_LABELS[d.recurrence]}</Text>
            </View>
          ) : null}
          {d.account_name ? (
            <View style={styles.tag}>
              <Wallet size={12} color={colors.text.secondary} />
              <Text style={styles.tagText}>{d.account_name}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.actions}>
          <Pressable onPress={() => openPay(d)} accessibilityRole="button" accessibilityLabel={`Régler ${d.title}`} style={({ pressed }) => [styles.payBtn, pressed && { opacity: 0.85 }]}>
            <CalendarCheck size={16} color={colors.text.inverted} />
            <Text style={styles.payText}>Régler</Text>
          </Pressable>
          <Pressable onPress={() => setEditor({ editing: d })} accessibilityRole="button" accessibilityLabel={`Modifier ${d.title}`} style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.7 }]}>
            <Pencil size={16} color={colors.primary.DEFAULT} />
            <Text style={styles.editText}>Modifier</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Retour">
          <ArrowLeft size={24} color={colors.text.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Agenda & Échéances</Text>
          <Text style={styles.subtitle}>Factures, loyers et tontines à venir</Text>
        </View>
        <Pressable onPress={() => setEditor({})} accessibilityRole="button" style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}>
          <Plus size={18} color={colors.text.inverted} />
          <Text style={styles.addText}>Échéance</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => { if (currentUser) refresh(currentUser.id); }} />}
        onTouchStart={recordActivity}
      >
        {/* Semaine */}
        <View style={styles.weekCard}>
          <View style={styles.weekHead}>
            <View style={styles.inline}>
              <CalendarDays size={18} color={colors.text.primary} />
              <Text style={styles.weekTitle}>{rangeLabel.charAt(0).toUpperCase() + rangeLabel.slice(1)}</Text>
            </View>
            <View style={styles.inline}>
              <Pressable onPress={() => setWeekOffset(weekOffset - 1)} accessibilityRole="button" accessibilityLabel="Semaine précédente" style={styles.navBtn}>
                <ChevronLeft size={18} color={colors.text.primary} />
              </Pressable>
              <Pressable onPress={() => setWeekOffset(weekOffset + 1)} accessibilityRole="button" accessibilityLabel="Semaine suivante" style={styles.navBtn}>
                <ChevronRight size={18} color={colors.text.primary} />
              </Pressable>
            </View>
          </View>
          <View style={styles.days}>
            {days.map((day) => {
              const d = parseDay(day);
              const items = deadlines.filter((x) => x.due_date === day);
              const isToday = day === today;
              const selected = day === selectedDay;
              const hot = items.some((x) => x.priority !== 'NORMAL' || bucketOf(x.due_date, now) !== 'upcoming');
              return (
                <Pressable
                  key={day}
                  onPress={() => setSelectedDay(selected ? null : day)}
                  accessibilityRole="button"
                  accessibilityLabel={`${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}, ${items.length} échéance(s)`}
                  style={[styles.day, isToday && styles.dayToday, selected && styles.daySelected]}
                >
                  <Text style={[styles.dayName, (isToday || selected) && styles.dayTextOn]}>
                    {d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}
                  </Text>
                  <Text style={[styles.dayNum, (isToday || selected) && styles.dayTextOn]}>{d.getDate()}</Text>
                  <View style={[styles.dayDot, items.length > 0 && { backgroundColor: hot ? colors.accent.danger : colors.accent.warning }]} />
                </Pressable>
              );
            })}
          </View>
          <View style={styles.summary}>
            <CalendarClock size={20} color={colors.primary.DEFAULT} />
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle}>
                {next7.length} échéance{next7.length > 1 ? 's' : ''} sous 7 jours
              </Text>
              <Text style={styles.summarySub}>{selectedDay ? `Filtré sur le ${parseDay(selectedDay).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} (touchez à nouveau pour tout voir)` : "D'aujourd'hui à dans 6 jours"}</Text>
            </View>
            <Text style={styles.summaryAmount}>
              {formatFCFA(next7Total).replace(' FCFA', '')} <Text style={styles.summaryUnit}>FCFA</Text>
            </Text>
          </View>
        </View>

        {/* Filtres */}
        {kindsPresent.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {(['ALL', ...kindsPresent] as const).map((k) => {
              const on = k === kindFilter;
              const count = k === 'ALL' ? deadlines.length : deadlines.filter((d) => d.kind === k).length;
              return (
                <Pressable key={k} onPress={() => setKindFilter(k)} accessibilityRole="button" style={[styles.filter, on && styles.filterOn]}>
                  <Text style={[styles.filterText, on && styles.filterTextOn]}>
                    {k === 'ALL' ? 'Tous' : KIND_LABELS[k]} ({count})
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {deadlines.length === 0 ? (
          <View style={styles.empty}>
            <CalendarClock size={32} color={colors.text.muted} />
            <Text style={styles.emptyTitle}>Aucune échéance à venir</Text>
            <Text style={styles.emptyText}>Ajoutez vos factures, loyer ou cotisations de tontine : GERETOU vous prévient avant la date.</Text>
          </View>
        ) : visible.length === 0 ? (
          <Text style={styles.emptyText}>Aucune échéance pour ce filtre.</Text>
        ) : (
          SECTIONS.map(({ bucket, title, dot }) => {
            const items = visible.filter((d) => bucketOf(d.due_date, now) === bucket);
            if (items.length === 0) return null;
            return (
              <View key={bucket} style={{ gap: spacing.md }}>
                <View style={styles.sectionHead}>
                  <View style={styles.inline}>
                    <View style={[styles.sectionDot, { backgroundColor: dot }]} />
                    <Text style={styles.sectionTitle}>{title}</Text>
                  </View>
                  <Text style={[styles.sectionCount, bucket !== 'upcoming' && { color: colors.accent.danger }]}>
                    {items.length} échéance{items.length > 1 ? 's' : ''}
                  </Text>
                </View>
                {items.map(renderCard)}
              </View>
            );
          })
        )}

        <Pressable onPress={() => setEditor({})} accessibilityRole="button" style={({ pressed }) => [styles.bigCta, pressed && { opacity: 0.85 }]}>
          <Plus size={20} color={colors.text.inverted} />
          <Text style={styles.bigCtaText}>Ajouter une échéance ou un rappel</Text>
        </Pressable>
      </ScrollView>

      <DeadlineEditorModal visible={!!editor} editing={editor?.editing ?? null} initialDay={selectedDay && selectedDay >= today ? selectedDay : null} onClose={() => setEditor(null)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.canvas },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.base, paddingVertical: spacing.md, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.surface.border },
  title: { fontSize: typography.sizes.title, fontWeight: typography.weights.extrabold, color: colors.text.primary },
  subtitle: { fontSize: typography.sizes.bodySm, color: colors.text.secondary },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary.dark, borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  addText: { color: colors.text.inverted, fontWeight: typography.weights.bold, fontSize: typography.sizes.bodySm },
  content: { padding: spacing.base, paddingBottom: spacing.xxl, gap: spacing.md },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  weekCard: { backgroundColor: colors.surface.card, borderRadius: radii.xl, padding: spacing.base, gap: spacing.md, borderWidth: 1, borderColor: colors.surface.border },
  weekHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weekTitle: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text.primary },
  navBtn: { width: 36, height: 36, borderRadius: radii.md, backgroundColor: colors.brands.waveBg, alignItems: 'center', justifyContent: 'center' },
  days: { flexDirection: 'row', gap: 4 },
  day: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surface.muted, gap: 2 },
  dayToday: { backgroundColor: colors.primary.DEFAULT },
  daySelected: { backgroundColor: colors.primary.dark, borderWidth: 2, borderColor: colors.accent.warning },
  dayName: { fontSize: typography.sizes.caption, color: colors.text.secondary, textTransform: 'capitalize' },
  dayNum: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text.primary },
  dayTextOn: { color: colors.text.inverted },
  dayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'transparent' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.primary.container, borderRadius: radii.lg, padding: spacing.md },
  summaryTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.primary.dark },
  summarySub: { fontSize: typography.sizes.caption, color: colors.primary.dark },
  summaryAmount: { fontSize: typography.sizes.title, fontWeight: typography.weights.extrabold, color: colors.primary.dark },
  summaryUnit: { fontSize: typography.sizes.caption, fontWeight: typography.weights.medium },
  filters: { gap: spacing.sm, paddingRight: spacing.base },
  filter: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.full, backgroundColor: colors.brands.waveBg },
  filterOn: { backgroundColor: colors.primary.dark },
  filterText: { fontSize: typography.sizes.bodySm, color: colors.text.primary },
  filterTextOn: { color: colors.text.inverted, fontWeight: typography.weights.bold },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  sectionDot: { width: 10, height: 10, borderRadius: 5 },
  sectionTitle: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text.primary },
  sectionCount: { fontSize: typography.sizes.bodySm, color: colors.text.secondary },
  card: { backgroundColor: colors.surface.card, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.surface.border, padding: spacing.base, gap: spacing.md },
  cardHot: { borderColor: colors.accent.dangerBorder, borderWidth: 1.5 },
  cardHead: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  cardIcon: { width: 46, height: 46, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text.primary },
  cardDue: { marginTop: 2, fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold },
  cardAmount: { fontSize: typography.sizes.title, fontWeight: typography.weights.extrabold, color: colors.text.primary, textAlign: 'right' },
  cardUnit: { fontSize: typography.sizes.caption, fontWeight: typography.weights.medium, color: colors.text.secondary },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.full, backgroundColor: colors.surface.muted },
  tagDanger: { backgroundColor: colors.accent.dangerBg },
  tagWarn: { backgroundColor: colors.accent.warningBg },
  tagText: { fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, color: colors.text.secondary },
  actions: { flexDirection: 'row', gap: spacing.sm },
  payBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, borderRadius: radii.md, backgroundColor: colors.primary.DEFAULT },
  payText: { color: colors.text.inverted, fontWeight: typography.weights.bold },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, borderRadius: radii.md, backgroundColor: colors.brands.waveBg },
  editText: { color: colors.primary.DEFAULT, fontWeight: typography.weights.semibold },
  empty: { alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface.card, borderRadius: radii.xl, padding: spacing.xl },
  emptyTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text.primary },
  emptyText: { fontSize: typography.sizes.bodySm, color: colors.text.secondary, textAlign: 'center' },
  bigCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 56, borderRadius: radii.lg, backgroundColor: colors.primary.dark, marginTop: spacing.sm },
  bigCtaText: { color: colors.text.inverted, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
});
