/**
 * Budgets & Limites — GERETOU
 * Maquette Stitch « Budgets & Plafonds en direct ».
 */

import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { Plus, TriangleAlert, ArrowRight, CalendarDays, Gauge, CircleCheck, CircleAlert, ShieldCheck, Info, Target } from 'lucide-react-native';
import { BudgetGauge, STATUS_COLORS } from '../../components/budget/BudgetGauge';
import { BudgetEditorModal } from '../../components/budget/BudgetEditorModal';
import { CategoryIcon } from '../../components/common/AppIcons';
import { useAuthStore } from '../../store/useAuthStore';
import { useBudgetStore } from '../../store/useBudgetStore';
import { BudgetView } from '../../services/budget/budgetRepo';
import { severity, statusLabel } from '../../services/budget/budgetCalc';
import { categoryDisplay } from '../../services/transaction/labels';
import { BudgetPeriod } from '../../types/database';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

const num = (n: number) => formatFCFA(n).replace(' FCFA', '');

export const BudgetsScreen: React.FC = () => {
  const { currentUser, recordActivity } = useAuthStore();
  const { budgets, refresh, isLoading } = useBudgetStore();
  const [editor, setEditor] = useState<{ editing?: BudgetView | null; scope?: 'global' | 'category'; period?: BudgetPeriod } | null>(null);

  useEffect(() => {
    if (currentUser?.id) refresh(currentUser.id);
  }, [currentUser?.id]);

  const monthLabel = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const globalMonth = budgets.find((b) => !b.category_id && b.period === 'MONTH');
  const globalDay = budgets.find((b) => !b.category_id && b.period === 'DAY');
  const byCategory = budgets.filter((b) => b.category_id);
  const alert = [...budgets].filter((b) => severity(b.progress.status) > 0).sort((a, b) => severity(b.progress.status) - severity(a.progress.status) || b.progress.ratio - a.progress.ratio)[0];

  const open = (cfg: NonNullable<typeof editor>) => {
    recordActivity();
    setEditor(cfg);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.strip}>
        <View style={styles.stripDot} />
        <Text style={styles.stripText}>Calcul instantané, même sans connexion</Text>
      </View>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Budgets & Limites</Text>
          <Text style={styles.subtitle}>Recalcul en direct · {monthLabel}</Text>
        </View>
        <Pressable onPress={() => open({ scope: 'category' })} accessibilityRole="button" style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}>
          <Plus size={18} color={colors.primary.DEFAULT} />
          <Text style={styles.addText}>Plafond</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => { if (currentUser) refresh(currentUser.id); }} />}
        onTouchStart={recordActivity}
      >
        {/* Bandeau d'alerte : le plafond le plus critique */}
        {alert ? (
          <View style={[styles.alert, { backgroundColor: STATUS_COLORS[alert.progress.status].bg, borderColor: STATUS_COLORS[alert.progress.status].border }]} accessibilityRole="alert">
            <View style={styles.alertHead}>
              <View style={styles.alertIcon}>
                <TriangleAlert size={20} color={STATUS_COLORS[alert.progress.status].fg} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>
                  {statusLabel(alert.progress, alert.alert_threshold).replace(/ \(.*\)$/, '')} : {alert.category_id ? categoryDisplay({ id: alert.category_id, name: alert.category_name ?? '' }).short : 'budget global'} ({alert.progress.percent} %)
                </Text>
                <Text style={[styles.alertText, { color: STATUS_COLORS[alert.progress.status].fg }]}>
                  {num(alert.progress.spent)} / {formatFCFA(alert.progress.limit)} consommés {alert.period === 'DAY' ? "aujourd'hui" : 'ce mois-ci'}.
                </Text>
              </View>
            </View>
            <View style={styles.alertFoot}>
              <Pressable onPress={() => open({ editing: alert })} accessibilityRole="button" style={styles.alertLink}>
                <Text style={styles.alertLinkText}>Ajuster le plafond</Text>
                <ArrowRight size={16} color={colors.primary.DEFAULT} />
              </Pressable>
              <Text style={[styles.alertRest, { color: STATUS_COLORS[alert.progress.status].fg }]}>
                {alert.progress.remaining >= 0 ? `Reste ${formatFCFA(alert.progress.remaining)}` : `Déficit ${formatFCFA(-alert.progress.remaining)}`}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Budget mensuel global */}
        {globalMonth ? (
          <Pressable onPress={() => open({ editing: globalMonth })} accessibilityRole="button" accessibilityHint="Modifier le budget mensuel" style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardLabel}>BUDGET MENSUEL GLOBAL</Text>
              <View style={styles.monthPill}>
                <Text style={styles.monthPillText}>{monthLabel}</Text>
              </View>
            </View>
            <View style={styles.bigRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.big}>
                  {num(globalMonth.progress.spent)}
                  <Text style={styles.bigUnit}> FCFA</Text>
                </Text>
                <Text style={styles.bigSub}>
                  consommés sur <Text style={styles.bold}>{formatFCFA(globalMonth.progress.limit)}</Text>
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.percent, { color: STATUS_COLORS[globalMonth.progress.status].fg }]}>{globalMonth.progress.percent} %</Text>
                <Text style={styles.bigSub}>Utilisé</Text>
              </View>
            </View>
            <BudgetGauge ratio={globalMonth.progress.ratio} status={globalMonth.progress.status} height={10} />
            <View style={styles.divider} />
            <View style={styles.bigRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bigSub}>{globalMonth.progress.remaining >= 0 ? 'Restant disponible' : 'Dépassement'}</Text>
                <Text style={[styles.rest, { color: globalMonth.progress.remaining >= 0 ? colors.primary.DEFAULT : colors.accent.danger }]}>
                  {formatFCFA(Math.abs(globalMonth.progress.remaining))}
                </Text>
              </View>
              <View style={styles.daysBox}>
                <CalendarDays size={18} color={colors.text.secondary} />
                <View>
                  <Text style={styles.daysTop}>{globalMonth.progress.daysLeft} j. restants</Text>
                  <Text style={styles.daysBottom}>~{num(globalMonth.progress.perDay)} F/jour</Text>
                </View>
              </View>
            </View>
          </Pressable>
        ) : (
          <Pressable onPress={() => open({ scope: 'global', period: 'MONTH' })} accessibilityRole="button" style={[styles.card, styles.cta]}>
            <Target size={24} color={colors.primary.DEFAULT} />
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaTitle}>Définir un budget mensuel global</Text>
              <Text style={styles.bigSub}>Un plafond pour toutes vos dépenses du mois, avec le montant conseillé par jour.</Text>
            </View>
            <Plus size={20} color={colors.primary.DEFAULT} />
          </Pressable>
        )}

        {/* Plafond journalier */}
        {globalDay ? (
          <Pressable onPress={() => open({ editing: globalDay })} accessibilityRole="button" accessibilityHint="Modifier le plafond journalier" style={styles.card}>
            <View style={styles.cardHead}>
              <View style={styles.inline}>
                <Gauge size={18} color={colors.text.primary} />
                <Text style={styles.cardTitle}>Plafond journalier</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: STATUS_COLORS[globalDay.progress.status].bg, borderColor: STATUS_COLORS[globalDay.progress.status].border }]}>
                <Text style={[styles.pillText, { color: STATUS_COLORS[globalDay.progress.status].fg }]}>
                  {globalDay.progress.status === 'healthy' ? 'Rythme stable' : statusLabel(globalDay.progress, globalDay.alert_threshold)}
                </Text>
              </View>
            </View>
            <View style={styles.bigRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bigSub}>Dépensé aujourd'hui</Text>
                <Text style={styles.mid}>
                  {num(globalDay.progress.spent)} <Text style={styles.bigSub}>/ {formatFCFA(globalDay.progress.limit)}</Text>
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.bigSub}>Reste pour ce soir</Text>
                <Text style={[styles.mid, { color: globalDay.progress.remaining >= 0 ? colors.primary.DEFAULT : colors.accent.danger }]}>
                  {globalDay.progress.remaining >= 0 ? '+' : '-'}
                  {formatFCFA(Math.abs(globalDay.progress.remaining))}
                </Text>
              </View>
            </View>
            <BudgetGauge ratio={globalDay.progress.ratio} status={globalDay.progress.status} />
          </Pressable>
        ) : (
          <Pressable onPress={() => open({ scope: 'global', period: 'DAY' })} accessibilityRole="button" style={styles.smallCta}>
            <Gauge size={18} color={colors.primary.DEFAULT} />
            <Text style={styles.smallCtaText}>Ajouter un plafond journalier</Text>
            <Plus size={16} color={colors.primary.DEFAULT} />
          </Pressable>
        )}

        {/* Par catégorie */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Plafonds par catégorie</Text>
          <View style={styles.countPill}>
            <Text style={styles.countText}>{byCategory.length} actif{byCategory.length > 1 ? 's' : ''}</Text>
          </View>
        </View>

        {byCategory.length === 0 ? (
          <Pressable onPress={() => open({ scope: 'category' })} accessibilityRole="button" style={styles.empty}>
            <Target size={28} color={colors.text.muted} />
            <Text style={styles.emptyText}>Aucun plafond par catégorie. Exemple : 50 000 FCFA par mois pour l'alimentation.</Text>
            <Text style={styles.emptyLink}>Ajouter un plafond</Text>
          </Pressable>
        ) : (
          byCategory.map((b) => {
            const p = b.progress;
            const c = STATUS_COLORS[p.status];
            const display = categoryDisplay({ id: b.category_id!, name: b.category_name ?? 'Catégorie' });
            const hot = p.status !== 'healthy';
            return (
              <Pressable
                key={b.id}
                onPress={() => open({ editing: b })}
                accessibilityRole="button"
                accessibilityLabel={`${b.category_name}, ${p.percent} %`}
                style={[styles.card, hot && { borderColor: c.border, borderWidth: p.status === 'over' ? 2 : 1.5 }]}
              >
                <View style={styles.catHead}>
                  <View style={[styles.catIcon, { backgroundColor: hot ? c.bg : colors.brands.waveBg }]}>
                    <CategoryIcon name={b.category_icon} size={20} color={hot ? c.fg : b.category_color || colors.text.secondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catName} numberOfLines={2}>{b.category_name}</Text>
                    <Text style={styles.catHint} numberOfLines={1}>
                      {display.hint} · {b.period === 'DAY' ? 'par jour' : 'par mois'}
                    </Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: c.bg, borderColor: c.border }, p.status === 'over' && { backgroundColor: c.fg }]}>
                    {p.status === 'over' ? (
                      <CircleAlert size={12} color={colors.text.inverted} />
                    ) : p.status === 'healthy' ? (
                      <CircleCheck size={12} color={c.fg} />
                    ) : (
                      <TriangleAlert size={12} color={c.fg} />
                    )}
                    <Text style={[styles.pillText, { color: p.status === 'over' ? colors.text.inverted : c.fg }]}>{statusLabel(p, b.alert_threshold)}</Text>
                  </View>
                </View>
                <View style={styles.catAmounts}>
                  <Text style={[styles.mid, p.status === 'over' && { color: colors.accent.danger }]}>
                    {num(p.spent)} <Text style={styles.bigSub}>/ {formatFCFA(p.limit)}</Text>
                  </Text>
                  <Text style={[styles.catRest, { color: p.remaining >= 0 ? (hot ? c.fg : colors.text.primary) : colors.accent.danger }]}>
                    {p.remaining >= 0 ? `Reste ${formatFCFA(p.remaining)}` : `Déficit : -${formatFCFA(-p.remaining)}`}
                  </Text>
                </View>
                <BudgetGauge ratio={p.ratio} status={p.status} />
                {p.status === 'over' ? (
                  <View style={styles.inline}>
                    <CircleAlert size={14} color={colors.accent.danger} />
                    <Text style={styles.overNote}>Ce dépassement réduit d'autant votre argent disponible.</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })
        )}

        <View style={styles.info}>
          <ShieldCheck size={20} color={colors.primary.DEFAULT} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Calculé sur ce téléphone</Text>
            <Text style={styles.infoText}>
              Les jauges se mettent à jour à chaque dépense, même sans connexion. Les virements entre vos comptes ne comptent pas.
            </Text>
          </View>
        </View>
        <View style={styles.soon}>
          <Info size={16} color={colors.text.secondary} />
          <Text style={styles.soonText}>Bientôt : une notification sur le téléphone quand un seuil est atteint.</Text>
        </View>
      </ScrollView>

      <BudgetEditorModal
        visible={!!editor}
        editing={editor?.editing ?? null}
        defaultScope={editor?.scope}
        defaultPeriod={editor?.period}
        onClose={() => setEditor(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.canvas },
  strip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary.DEFAULT, paddingHorizontal: spacing.base, paddingVertical: 6 },
  stripDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent.success },
  stripText: { fontSize: typography.sizes.caption, color: colors.primary.container, fontWeight: typography.weights.semibold },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
  },
  title: { fontSize: typography.sizes.title, fontWeight: typography.weights.extrabold, color: colors.primary.dark },
  subtitle: { fontSize: typography.sizes.bodySm, color: colors.text.secondary },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary.container, borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  addText: { color: colors.primary.DEFAULT, fontWeight: typography.weights.bold, fontSize: typography.sizes.body },
  content: { padding: spacing.base, paddingBottom: spacing.xxl, gap: spacing.md },
  alert: { borderRadius: radii.xl, borderWidth: 1.5, padding: spacing.base, gap: spacing.md },
  alertHead: { flexDirection: 'row', gap: spacing.md },
  alertIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.surface.card, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text.primary },
  alertText: { marginTop: 2, fontSize: typography.sizes.bodySm, lineHeight: 19 },
  alertFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.08)', paddingTop: spacing.sm },
  alertLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  alertLinkText: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.bold, color: colors.primary.DEFAULT },
  alertRest: { fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  card: { backgroundColor: colors.surface.card, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.surface.border, padding: spacing.base, gap: spacing.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  cardLabel: { fontSize: typography.sizes.caption, letterSpacing: 1, color: colors.text.secondary, fontWeight: typography.weights.semibold },
  cardTitle: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text.primary },
  monthPill: { backgroundColor: colors.brands.waveBg, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.sm },
  monthPillText: { fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, color: colors.text.primary, textTransform: 'capitalize' },
  bigRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  big: { fontSize: 32, fontWeight: typography.weights.extrabold, color: colors.text.primary },
  bigUnit: { fontSize: typography.sizes.body, fontWeight: typography.weights.medium, color: colors.text.secondary },
  bigSub: { fontSize: typography.sizes.bodySm, color: colors.text.secondary },
  bold: { fontWeight: typography.weights.bold, color: colors.text.primary },
  percent: { fontSize: typography.sizes.headline, fontWeight: typography.weights.extrabold },
  divider: { height: 1, backgroundColor: colors.surface.border },
  rest: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold },
  daysBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.brands.waveBg, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  daysTop: { fontSize: typography.sizes.caption, color: colors.text.secondary },
  daysBottom: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.bold, color: colors.text.primary },
  cta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderStyle: 'dashed', borderWidth: 1.5, borderColor: colors.primary.container },
  ctaTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.primary.DEFAULT },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.full, flexShrink: 1 },
  pillText: { fontSize: typography.sizes.caption, fontWeight: typography.weights.bold },
  mid: { fontSize: typography.sizes.title, fontWeight: typography.weights.extrabold, color: colors.text.primary },
  smallCta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary.subtle, borderRadius: radii.lg, padding: spacing.md },
  smallCtaText: { flex: 1, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.primary.DEFAULT },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  sectionTitle: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text.primary },
  countPill: { backgroundColor: colors.primary.DEFAULT, borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  countText: { fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, color: colors.text.inverted },
  empty: { alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface.card, borderRadius: radii.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.surface.border },
  emptyText: { fontSize: typography.sizes.bodySm, color: colors.text.secondary, textAlign: 'center' },
  emptyLink: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.primary.DEFAULT },
  catHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  catIcon: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text.primary },
  catHint: { fontSize: typography.sizes.caption, color: colors.text.secondary },
  catAmounts: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  catRest: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.bold },
  overNote: { fontSize: typography.sizes.caption, color: colors.accent.danger, flex: 1 },
  info: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.primary.subtle, borderRadius: radii.xl, padding: spacing.base, borderWidth: 1, borderColor: colors.primary.container },
  infoTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.primary.dark },
  infoText: { marginTop: 2, fontSize: typography.sizes.bodySm, lineHeight: 19, color: colors.text.secondary },
  soon: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },
  soonText: { flex: 1, fontSize: typography.sizes.caption, color: colors.text.secondary },
});
