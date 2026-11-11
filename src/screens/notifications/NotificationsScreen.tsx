/**
 * Historique des alertes — GERETOU
 * Maquette Stitch « Historique des Alertes & Notifications ».
 */

import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, Pressable, StyleSheet, RefreshControl } from 'react-native';
import {
  ArrowLeft,
  CheckCheck,
  SlidersHorizontal,
  CalendarClock,
  TriangleAlert,
  CloudUpload,
  Info,
  CircleCheck,
  BellOff,
  ArrowRight,
  Archive,
} from 'lucide-react-native';
import { BudgetGauge } from '../../components/budget/BudgetGauge';
import { useAuthStore } from '../../store/useAuthStore';
import { useAlertStore } from '../../store/useAlertStore';
import { useAgendaStore } from '../../store/useAgendaStore';
import { useNavStore } from '../../store/useNavStore';
import { AlertFilter, AlertKind, AlertRecord, AlertSection, RETENTION_DAYS, filterAlerts, needsAction, sectionOf } from '../../services/alerts/alertCore';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

const KIND_TABS: { key: AlertKind | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'Toutes' },
  { key: 'DEADLINE', label: 'Échéances' },
  { key: 'BUDGET', label: 'Budgets' },
  { key: 'BACKUP', label: 'Sauvegardes' },
];

const SECTIONS: { key: AlertSection; title: string }[] = [
  { key: 'today', title: "AUJOURD'HUI & RÉCENTES" },
  { key: 'week', title: 'CETTE SEMAINE' },
  { key: 'older', title: 'PLUS ANCIEN' },
];

const VISUAL: Record<AlertKind, { Icon: typeof Info; fg: string; bg: string }> = {
  DEADLINE: { Icon: CalendarClock, fg: colors.accent.danger, bg: colors.accent.dangerBg },
  BUDGET: { Icon: TriangleAlert, fg: '#B45309', bg: colors.accent.warningBg },
  BACKUP: { Icon: CloudUpload, fg: colors.primary.DEFAULT, bg: colors.primary.container },
  INFO: { Icon: Info, fg: colors.text.secondary, bg: colors.surface.muted },
};

function kindLabel(a: AlertRecord): string {
  if (a.kind === 'DEADLINE') return a.level === 'CRITICAL' ? 'ÉCHÉANCE IMMINENTE' : 'ÉCHÉANCE';
  if (a.kind === 'BUDGET') return a.level === 'CRITICAL' ? 'PLAFOND DÉPASSÉ' : 'ALERTE PLAFOND';
  if (a.kind === 'BACKUP') return 'SAUVEGARDE GOOGLE DRIVE';
  return 'INFORMATION';
}

function timeLabel(iso: string, now: Date): string {
  const d = new Date(iso);
  const hhmm = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return hhmm;
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `Hier · ${hhmm}`;
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · ${hhmm}`;
}

export const NotificationsScreen: React.FC = () => {
  const { currentUser, recordActivity } = useAuthStore();
  const { alerts, unread, refresh, isLoading, markRead, markAllRead, resolve } = useAlertStore();
  const { setFocus } = useAgendaStore();
  const { goBack, navigate, switchTab } = useNavStore();
  const [kind, setKind] = useState<AlertKind | 'ALL'>('ALL');
  const [filter, setFilter] = useState<AlertFilter>('ALL');

  useEffect(() => {
    if (currentUser?.id) refresh(currentUser.id);
  }, [currentUser?.id]);

  const now = new Date();
  const visible = filterAlerts(alerts, kind, filter);
  const counts = (k: AlertKind | 'ALL') => (k === 'ALL' ? alerts.length : alerts.filter((a) => a.kind === k).length);
  const actionCount = alerts.filter(needsAction).length;

  const toggleFilter = (f: AlertFilter) => setFilter(filter === f ? 'ALL' : f);
  const uid = currentUser?.id ?? '';

  const open = (a: AlertRecord) => {
    recordActivity();
    if (!a.read_at) markRead(uid, a.id);
  };

  const pay = (a: AlertRecord) => {
    open(a);
    if (!a.ref_id) return;
    setFocus(a.ref_id);
    navigate('DEADLINE_ALERT');
  };

  const adjustBudget = (a: AlertRecord) => {
    open(a);
    switchTab('BUDGETS');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Retour">
          <ArrowLeft size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>Historique des alertes</Text>
        <Pressable onPress={() => uid && markAllRead(uid)} disabled={unread === 0} hitSlop={8} accessibilityRole="button" accessibilityLabel="Tout marquer comme lu" style={[styles.iconBtn, unread === 0 && { opacity: 0.4 }]}>
          <CheckCheck size={20} color={colors.primary.DEFAULT} />
        </Pressable>
        <Pressable onPress={() => navigate('NOTIF_SETTINGS')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Réglages des notifications" style={styles.iconBtn}>
          <SlidersHorizontal size={20} color={colors.text.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => { if (uid) refresh(uid); }} />}
        onTouchStart={recordActivity}
      >
        <View style={styles.summary}>
          <View style={styles.summaryTop}>
            <View style={styles.inline}>
              <View style={styles.dot} />
              <Text style={styles.summaryTitle}>JOURNAL LOCAL DES ALERTES</Text>
            </View>
            <View style={styles.countPill}>
              <Text style={styles.countText}>{alerts.length} alerte{alerts.length > 1 ? 's' : ''}</Text>
            </View>
          </View>
          <View style={styles.summaryBottom}>
            <Archive size={14} color={colors.text.secondary} />
            <Text style={styles.summarySub}>Purge automatique après {RETENTION_DAYS} jours</Text>
            <Pressable onPress={() => uid && markAllRead(uid)} disabled={unread === 0} accessibilityRole="button">
              <Text style={[styles.link, unread === 0 && { color: colors.text.muted }]}>Tout marquer lu</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {KIND_TABS.map((t) => {
            const on = t.key === kind;
            return (
              <Pressable key={t.key} onPress={() => setKind(t.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.tab, on && styles.tabOn]}>
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
                <View style={[styles.tabCount, on && { backgroundColor: colors.primary.light }]}>
                  <Text style={[styles.tabCountText, on && { color: colors.text.inverted }]}>{counts(t.key)}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.filters}>
          {[
            { f: 'UNREAD' as const, label: 'Non lues', n: unread, Icon: null },
            { f: 'ACTION' as const, label: 'Action requise', n: actionCount, Icon: TriangleAlert },
            { f: 'RESOLVED' as const, label: 'Résolues', n: null, Icon: CircleCheck },
          ].map(({ f, label, n, Icon }) => {
            const on = filter === f;
            return (
              <Pressable key={f} onPress={() => toggleFilter(f)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.filter, on && styles.filterOn]}>
                {Icon ? <Icon size={13} color={on ? colors.text.inverted : colors.text.secondary} /> : <View style={[styles.redDot, on && { backgroundColor: colors.text.inverted }]} />}
                <Text style={[styles.filterText, on && { color: colors.text.inverted }]}>{label}</Text>
                {n !== null ? <Text style={[styles.filterCount, on && { color: colors.text.inverted }]}>{n}</Text> : null}
              </Pressable>
            );
          })}
        </View>

        {visible.length === 0 ? (
          <View style={styles.empty}>
            <BellOff size={32} color={colors.text.muted} />
            <Text style={styles.emptyTitle}>{alerts.length === 0 ? 'Aucune alerte pour le moment' : 'Aucune alerte pour ce filtre'}</Text>
            <Text style={styles.emptyText}>
              Vous serez prévenu ici quand un plafond de budget est atteint, qu'une échéance approche ou qu'une sauvegarde est faite.
            </Text>
          </View>
        ) : (
          SECTIONS.map(({ key, title }) => {
            const items = visible.filter((a) => sectionOf(a.created_at, now) === key);
            if (items.length === 0) return null;
            const critical = items.filter((a) => a.level === 'CRITICAL' && !a.resolved_at).length;
            return (
              <View key={key} style={{ gap: spacing.md }}>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>{title}</Text>
                  <Text style={[styles.sectionHint, critical > 0 && { color: colors.accent.danger }]}>
                    {critical > 0 ? `${critical} alerte${critical > 1 ? 's' : ''} critique${critical > 1 ? 's' : ''}` : `${items.length} événement${items.length > 1 ? 's' : ''}`}
                  </Text>
                </View>
                {items.map((a) => {
                  const v = VISUAL[a.kind];
                  const meta = a.meta ? (JSON.parse(a.meta) as { spent?: number; limit?: number; ratio?: number }) : null;
                  const accent = a.resolved_at ? null : a.level === 'CRITICAL' ? colors.accent.danger : a.level === 'WARNING' ? colors.accent.warning : null;
                  return (
                    <Pressable key={a.id} onPress={() => open(a)} accessibilityRole="button" accessibilityLabel={`${a.title}${a.read_at ? '' : ', non lue'}`} style={[styles.card, accent && { borderLeftWidth: 4, borderLeftColor: accent }]}>
                      <View style={styles.cardHead}>
                        <View style={[styles.cardIcon, { backgroundColor: v.bg }]}>
                          <v.Icon size={20} color={v.fg} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.cardTop}>
                            <Text style={[styles.cardKind, { color: v.fg }]}>{kindLabel(a)}</Text>
                            <View style={styles.inline}>
                              {!a.read_at ? <View style={styles.unreadDot} /> : null}
                              <Text style={styles.cardTime}>{timeLabel(a.created_at, now)}</Text>
                            </View>
                          </View>
                          <Text style={[styles.cardTitle, !a.read_at && { fontWeight: typography.weights.extrabold }]}>{a.title}</Text>
                        </View>
                      </View>
                      <Text style={styles.cardBody}>{a.body}</Text>
                      {a.kind === 'BUDGET' && meta?.limit ? (
                        <View style={styles.metaBox}>
                          <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Dépenses cumulées</Text>
                            <Text style={styles.metaValue}>
                              {formatFCFA(meta.spent ?? 0).replace(' FCFA', '')} / {formatFCFA(meta.limit)}
                            </Text>
                          </View>
                          <BudgetGauge ratio={meta.ratio ?? 0} status={(meta.ratio ?? 0) >= 1 ? 'over' : 'warning'} height={6} />
                        </View>
                      ) : null}
                      {a.resolved_at ? (
                        <View style={styles.resolved}>
                          <CircleCheck size={14} color={colors.primary.DEFAULT} />
                          <Text style={styles.resolvedText}>{a.resolution ?? 'Résolue'}</Text>
                        </View>
                      ) : a.kind === 'DEADLINE' && a.ref_id ? (
                        <Pressable onPress={() => pay(a)} accessibilityRole="button" style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}>
                          <Text style={styles.primaryText}>Régler maintenant</Text>
                          <ArrowRight size={16} color={colors.text.inverted} />
                        </Pressable>
                      ) : a.kind === 'BUDGET' ? (
                        <View style={styles.actions}>
                          <Pressable onPress={() => adjustBudget(a)} accessibilityRole="button" style={({ pressed }) => [styles.primary, { flex: 1 }, pressed && { opacity: 0.85 }]}>
                            <SlidersHorizontal size={16} color={colors.text.inverted} />
                            <Text style={styles.primaryText}>Ajuster le plafond</Text>
                          </Pressable>
                          <Pressable onPress={() => uid && resolve(uid, a.id, 'Ignorée')} accessibilityRole="button" style={({ pressed }) => [styles.ghost, pressed && { opacity: 0.7 }]}>
                            <Text style={styles.ghostText}>Ignorer</Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            );
          })
        )}

        <View style={styles.footer}>
          <Archive size={20} color={colors.primary.DEFAULT} />
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Text style={styles.footerTitle}>Confidentialité</Text>
            <Text style={styles.footerText}>
              Les alertes sont enregistrées uniquement sur ce téléphone et supprimées automatiquement après {RETENTION_DAYS} jours.
            </Text>
            <Pressable onPress={() => navigate('NOTIF_SETTINGS')} accessibilityRole="button" style={styles.settingsBtn}>
              <SlidersHorizontal size={16} color={colors.primary.DEFAULT} />
              <Text style={styles.settingsText}>Paramètres des notifications</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.canvas },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.base, paddingVertical: spacing.md, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.surface.border },
  title: { flex: 1, fontSize: typography.sizes.title, fontWeight: typography.weights.bold, color: colors.text.primary },
  iconBtn: { padding: 6 },
  content: { padding: spacing.base, paddingBottom: spacing.xxl, gap: spacing.md },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summary: { backgroundColor: colors.brands.waveBg, borderRadius: radii.xl, padding: spacing.base, gap: spacing.sm },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary.DEFAULT },
  summaryTitle: { fontSize: typography.sizes.caption, letterSpacing: 0.8, fontWeight: typography.weights.semibold, color: colors.text.primary },
  countPill: { backgroundColor: colors.primary.container, borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  countText: { fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, color: colors.primary.DEFAULT },
  summaryBottom: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summarySub: { flex: 1, fontSize: typography.sizes.caption, color: colors.text.secondary },
  link: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.bold, color: colors.primary.DEFAULT },
  tabs: { gap: spacing.sm, paddingRight: spacing.base },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.full, backgroundColor: colors.brands.waveBg },
  tabOn: { backgroundColor: colors.primary.dark },
  tabText: { fontSize: typography.sizes.bodySm, color: colors.text.primary },
  tabTextOn: { color: colors.text.inverted, fontWeight: typography.weights.bold },
  tabCount: { backgroundColor: colors.surface.card, borderRadius: radii.full, minWidth: 22, paddingHorizontal: 5, alignItems: 'center' },
  tabCountText: { fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, color: colors.text.primary },
  filters: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  filter: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.full, borderWidth: 1, borderColor: colors.surface.border, backgroundColor: colors.surface.card },
  filterOn: { backgroundColor: colors.primary.DEFAULT, borderColor: colors.primary.DEFAULT },
  filterText: { fontSize: typography.sizes.caption, color: colors.text.primary, fontWeight: typography.weights.medium },
  filterCount: { fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, color: colors.accent.danger },
  redDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent.danger },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  sectionTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, letterSpacing: 0.5, color: colors.text.primary },
  sectionHint: { fontSize: typography.sizes.caption, color: colors.text.secondary, fontWeight: typography.weights.semibold },
  card: { backgroundColor: colors.surface.card, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.surface.border, padding: spacing.base, gap: spacing.sm },
  cardHead: { flexDirection: 'row', gap: spacing.md },
  cardIcon: { width: 42, height: 42, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  cardKind: { flexShrink: 1, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, letterSpacing: 0.5 },
  cardTime: { fontSize: typography.sizes.caption, color: colors.text.secondary },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent.danger },
  cardTitle: { marginTop: 2, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text.primary },
  cardBody: { fontSize: typography.sizes.bodySm, lineHeight: 19, color: colors.text.secondary },
  metaBox: { backgroundColor: colors.brands.waveBg, borderRadius: radii.md, padding: spacing.sm, gap: 6 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { fontSize: typography.sizes.caption, color: colors.text.secondary },
  metaValue: { fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, color: colors.text.primary },
  resolved: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.primary.subtle, borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: 4 },
  resolvedText: { fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, color: colors.primary.DEFAULT },
  actions: { flexDirection: 'row', gap: spacing.sm },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 42, paddingHorizontal: spacing.md, borderRadius: radii.md, backgroundColor: colors.primary.DEFAULT },
  primaryText: { color: colors.text.inverted, fontWeight: typography.weights.bold, fontSize: typography.sizes.bodySm },
  ghost: { alignItems: 'center', justifyContent: 'center', minHeight: 42, paddingHorizontal: spacing.md, borderRadius: radii.md, backgroundColor: colors.brands.waveBg },
  ghostText: { color: colors.text.primary, fontWeight: typography.weights.semibold, fontSize: typography.sizes.bodySm },
  empty: { alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface.card, borderRadius: radii.xl, padding: spacing.xl },
  emptyTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text.primary },
  emptyText: { fontSize: typography.sizes.bodySm, color: colors.text.secondary, textAlign: 'center', lineHeight: 19 },
  footer: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.brands.waveBg, borderRadius: radii.xl, padding: spacing.base, marginTop: spacing.sm },
  footerTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text.primary },
  footerText: { fontSize: typography.sizes.bodySm, lineHeight: 19, color: colors.text.secondary },
  settingsBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface.card, borderRadius: radii.md, padding: spacing.md },
  settingsText: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.bold, color: colors.primary.DEFAULT },
});
