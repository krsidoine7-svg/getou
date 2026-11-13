/**
 * Historique des alertes — GERETOU
 * Design épuré, éditorial et lisible (conforme aux principes de minimalist-skill).
 * Fini le surcharge visuelle « IA » : cartes aérées, typographie calme et filtres simples.
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
} from 'lucide-react-native';
import { BudgetGauge } from '../../components/budget/BudgetGauge';
import { useAuthStore } from '../../store/useAuthStore';
import { useAlertStore } from '../../store/useAlertStore';
import { useAgendaStore } from '../../store/useAgendaStore';
import { useNavStore } from '../../store/useNavStore';
import { AlertFilter, AlertKind, AlertRecord, AlertSection, RETENTION_DAYS, filterAlerts, sectionOf } from '../../services/alerts/alertCore';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

type FilterTab = 'ALL' | 'UNREAD' | 'BUDGET' | 'DEADLINE';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'ALL', label: 'Toutes' },
  { key: 'UNREAD', label: 'Non lues' },
  { key: 'BUDGET', label: 'Plafonds' },
  { key: 'DEADLINE', label: 'Échéances' },
];

const SECTIONS: { key: AlertSection; title: string }[] = [
  { key: 'today', title: "Aujourd'hui" },
  { key: 'week', title: 'Cette semaine' },
  { key: 'older', title: 'Plus ancien' },
];

const ICONS: Record<AlertKind, { Icon: typeof Info; fg: string; bg: string }> = {
  DEADLINE: { Icon: CalendarClock, fg: colors.accent.danger, bg: colors.accent.dangerBg },
  BUDGET: { Icon: TriangleAlert, fg: colors.accent.warning, bg: colors.accent.warningBg },
  BACKUP: { Icon: CloudUpload, fg: colors.primary.DEFAULT, bg: colors.primary.subtle },
  INFO: { Icon: Info, fg: colors.text.secondary, bg: colors.surface.muted },
};

function formatAlertTime(iso: string, now: Date): string {
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
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  useEffect(() => {
    if (currentUser?.id) refresh(currentUser.id);
  }, [currentUser?.id]);

  const now = new Date();
  const uid = currentUser?.id ?? '';

  // Mapping des tabs vers le filtre sous-jacent
  const kindFilter: AlertKind | 'ALL' = activeTab === 'BUDGET' || activeTab === 'DEADLINE' ? activeTab : 'ALL';
  const statusFilter: AlertFilter = activeTab === 'UNREAD' ? 'UNREAD' : 'ALL';
  const visible = filterAlerts(alerts, kindFilter, statusFilter);

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
      {/* En-tête épuré */}
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Retour" style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>Alertes</Text>
        {unread > 0 ? (
          <Pressable
            onPress={() => uid && markAllRead(uid)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Tout marquer comme lu"
            style={styles.actionBtn}
          >
            <CheckCheck size={18} color={colors.primary.DEFAULT} />
            <Text style={styles.actionBtnText}>Tout lire</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => navigate('NOTIF_SETTINGS')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Réglages des notifications"
          style={styles.iconBtn}
        >
          <SlidersHorizontal size={20} color={colors.text.secondary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => { if (uid) refresh(uid); }} />}
        onTouchStart={recordActivity}
      >
        {/* Barre de filtres unique et légère */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
          {TABS.map((t) => {
            const on = t.key === activeTab;
            const count =
              t.key === 'ALL'
                ? alerts.length
                : t.key === 'UNREAD'
                ? unread
                : alerts.filter((a) => a.kind === t.key).length;
            return (
              <Pressable
                key={t.key}
                onPress={() => setActiveTab(t.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={[styles.tab, on && styles.tabActive]}
              >
                <Text style={[styles.tabLabel, on && styles.tabLabelActive]}>{t.label}</Text>
                {count > 0 ? (
                  <View style={[styles.tabBadge, on && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, on && styles.tabBadgeTextActive]}>{count}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Liste des alertes ou état vide */}
        {visible.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <BellOff size={28} color={colors.text.muted} />
            </View>
            <Text style={styles.emptyTitle}>
              {alerts.length === 0 ? 'Aucune alerte' : 'Aucune alerte dans cette vue'}
            </Text>
            <Text style={styles.emptySubtitle}>
              Vous serez notifié ici des plafonds atteints et des échéances de paiement à venir.
            </Text>
          </View>
        ) : (
          SECTIONS.map(({ key, title }) => {
            const items = visible.filter((a) => sectionOf(a.created_at, now) === key);
            if (items.length === 0) return null;

            return (
              <View key={key} style={styles.section}>
                <Text style={styles.sectionHeader}>{title}</Text>
                {items.map((a) => {
                  const v = ICONS[a.kind];
                  const meta = a.meta ? (JSON.parse(a.meta) as { spent?: number; limit?: number; ratio?: number }) : null;
                  const isUnread = !a.read_at;

                  return (
                    <Pressable
                      key={a.id}
                      onPress={() => open(a)}
                      accessibilityRole="button"
                      accessibilityLabel={`${a.title}${isUnread ? ', non lue' : ''}`}
                      style={[styles.card, isUnread && styles.cardUnread]}
                    >
                      {/* Ligne haute : icône, titre et heure */}
                      <View style={styles.cardHeader}>
                        <View style={[styles.cardIcon, { backgroundColor: v.bg }]}>
                          <v.Icon size={16} color={v.fg} />
                        </View>
                        <View style={styles.cardHeaderMeta}>
                          <Text style={[styles.cardTitle, isUnread && styles.cardTitleUnread]} numberOfLines={1}>
                            {a.title}
                          </Text>
                          <Text style={styles.cardTime}>{formatAlertTime(a.created_at, now)}</Text>
                        </View>
                        {isUnread ? <View style={styles.unreadDot} /> : null}
                      </View>

                      {/* Corps du message */}
                      <Text style={styles.cardBody}>{a.body}</Text>

                      {/* Jauge discrète pour les budgets */}
                      {a.kind === 'BUDGET' && meta?.limit ? (
                        <View style={styles.gaugeWrap}>
                          <BudgetGauge ratio={meta.ratio ?? 0} status={(meta.ratio ?? 0) >= 1 ? 'over' : 'warning'} height={4} />
                          <View style={styles.gaugeLabelRow}>
                            <Text style={styles.gaugeLabel}>
                              {formatFCFA(meta.spent ?? 0)} dépensés sur {formatFCFA(meta.limit)}
                            </Text>
                          </View>
                        </View>
                      ) : null}

                      {/* Actions contextuelles légères */}
                      {a.resolved_at ? (
                        <View style={styles.resolvedRow}>
                          <CircleCheck size={14} color={colors.primary.DEFAULT} />
                          <Text style={styles.resolvedText}>{a.resolution ?? 'Résolue'}</Text>
                        </View>
                      ) : a.kind === 'DEADLINE' && a.ref_id ? (
                        <View style={styles.actionsRow}>
                          <Pressable onPress={() => pay(a)} accessibilityRole="button" style={styles.primaryAction}>
                            <Text style={styles.primaryActionText}>Régler</Text>
                            <ArrowRight size={14} color={colors.text.inverted} />
                          </Pressable>
                        </View>
                      ) : a.kind === 'BUDGET' ? (
                        <View style={styles.actionsRow}>
                          <Pressable onPress={() => adjustBudget(a)} accessibilityRole="button" style={styles.primaryAction}>
                            <Text style={styles.primaryActionText}>Ajuster le plafond</Text>
                          </Pressable>
                          <Pressable onPress={() => uid && resolve(uid, a.id, 'Ignorée')} accessibilityRole="button" style={styles.ghostAction}>
                            <Text style={styles.ghostActionText}>Ignorer</Text>
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

        {/* Note de bas de page discrète */}
        <Text style={styles.footerNote}>
          Historique conservé {RETENTION_DAYS} jours localement sur cet appareil.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
    gap: spacing.sm,
  },
  backBtn: {
    padding: spacing.xs,
    marginRight: 4,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    letterSpacing: -0.2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.primary.subtle,
  },
  actionBtnText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    color: colors.primary.DEFAULT,
  },
  iconBtn: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing.xxl,
    gap: spacing.base,
  },
  tabBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: 2,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.full,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  tabActive: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  tabLabel: {
    fontSize: typography.sizes.bodySm,
    color: colors.text.secondary,
    fontWeight: typography.weights.medium,
  },
  tabLabelActive: {
    color: colors.text.inverted,
    fontWeight: typography.weights.semibold,
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
    backgroundColor: colors.surface.muted,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.text.secondary,
  },
  tabBadgeTextActive: {
    color: colors.text.inverted,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.xs,
    marginBottom: 2,
  },
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: spacing.base,
    gap: spacing.sm,
  },
  cardUnread: {
    borderColor: colors.surface.borderFocus,
    backgroundColor: '#FFFFFF',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderMeta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  cardTitleUnread: {
    fontWeight: typography.weights.bold,
  },
  cardTime: {
    fontSize: typography.sizes.caption,
    color: colors.text.muted,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary.DEFAULT,
  },
  cardBody: {
    fontSize: typography.sizes.bodySm,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  gaugeWrap: {
    marginTop: 2,
    gap: 4,
  },
  gaugeLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gaugeLabel: {
    fontSize: typography.sizes.caption,
    color: colors.text.muted,
  },
  resolvedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  resolvedText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    color: colors.primary.DEFAULT,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.md,
    backgroundColor: colors.primary.DEFAULT,
  },
  primaryActionText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.text.inverted,
  },
  ghostAction: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.md,
  },
  ghostActionText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.surface.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  emptySubtitle: {
    fontSize: typography.sizes.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  footerNote: {
    marginTop: spacing.sm,
    textAlign: 'center',
    fontSize: typography.sizes.caption,
    color: colors.text.muted,
  },
});
