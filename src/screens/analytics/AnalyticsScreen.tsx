/**
 * Écran Analyses & Graphiques Financiers — GERETOU
 * Maquette Stitch « GERETOU - Analyses & Graphiques Financiers »
 * Bilan financier automatique, graphiques d'évolution, donut de catégories et diagnostic local.
 */

import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {
  ArrowLeft,
  TrendingUp,
  ArrowDown,
  ArrowUp,
  Lightbulb,
  Sparkles,
  ShieldCheck,
  ChartPie,
  Calendar,
} from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavStore } from '../../store/useNavStore';
import { getDatabase } from '../../services/db/database';
import {
  AnalyticsPeriod,
  AnalyticsSummary,
  DiagnosticResult,
} from '../../services/analytics/analyticsCore';
import {
  AnalyticsReport,
  fetchAnalyticsReport,
} from '../../services/analytics/analyticsRepo';
import { BarChart } from '../../components/analytics/BarChart';
import { DonutChart } from '../../components/analytics/DonutChart';
import { CategoryIcon } from '../../components/common/AppIcons';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

const PERIODS: { key: AnalyticsPeriod; label: string }[] = [
  { key: '7D', label: '7 Jours' },
  { key: 'MONTH', label: 'Ce Mois' },
  { key: '3M', label: '3 Mois' },
  { key: 'YEAR', label: 'Année' },
];

export const AnalyticsScreen: React.FC = () => {
  const { currentUser, recordActivity } = useAuthStore();
  const { goBack } = useNavStore();

  const [period, setPeriod] = useState<AnalyticsPeriod>('MONTH');
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const uid = currentUser?.id ?? '';

  const loadData = async (selectedPeriod: AnalyticsPeriod) => {
    if (!uid) return;
    setIsLoading(true);
    try {
      const rawDb = await getDatabase();
      const adapter = {
        all: <T,>(sql: string, p: unknown[] = []) => rawDb.getAllAsync<T>(sql, p as never[]),
        get: <T,>(sql: string, p: unknown[] = []) => rawDb.getFirstAsync<T>(sql, p as never[]),
        run: async (sql: string, p: unknown[] = []) => {
          await rawDb.runAsync(sql, p as never[]);
        },
      };
      const rep = await fetchAnalyticsReport(adapter, uid, selectedPeriod);
      setReport(rep);
    } catch (e) {
      console.error('[GERETOU] Erreur chargement analyses:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(period);
  }, [uid, period]);

  const summary = report?.summary;
  const diagnostic = report?.diagnostic;

  const netSavings = summary?.netSavings ?? 0;
  const isPositive = netSavings >= 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* En-tête */}
      <View style={styles.header}>
        <Pressable
          onPress={goBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          style={styles.backBtn}
        >
          <ArrowLeft size={22} color={colors.text.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Analyses & Bilan</Text>
          <Text style={styles.subtitle}>Bilan financier automatique & prévisions</Text>
        </View>
        <View style={styles.certifiedBadge}>
          <ShieldCheck size={14} color={colors.primary.DEFAULT} />
          <Text style={styles.certifiedText}>100% Local</Text>
        </View>
      </View>

      {/* Sélecteur de période */}
      <View style={styles.periodRow}>
        {PERIODS.map((p) => {
          const on = period === p.key;
          return (
            <Pressable
              key={p.key}
              onPress={() => {
                setPeriod(p.key);
                recordActivity();
              }}
              style={[styles.periodBtn, on && styles.periodBtnOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.periodText, on && styles.periodTextOn]}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              recordActivity();
              loadData(period);
            }}
          />
        }
        onTouchStart={recordActivity}
      >
        {isLoading && !report ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
            <Text style={styles.loadingText}>Calcul du bilan financier…</Text>
          </View>
        ) : summary ? (
          <>
            {/* HERO CARD : BILAN NET */}
            <View style={styles.hero}>
              <View style={styles.heroTop}>
                <View style={styles.inline}>
                  <Calendar size={14} color={colors.primary.container} />
                  <Text style={styles.heroPeriodLabel}>
                    BILAN · {summary.periodLabel.toUpperCase()}
                  </Text>
                </View>
                <View
                  style={[
                    styles.heroTag,
                    !isPositive && {
                      backgroundColor: colors.accent.dangerBg,
                      borderColor: colors.accent.dangerBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.heroTagText,
                      !isPositive && { color: colors.accent.danger },
                    ]}
                  >
                    {isPositive ? 'Épargne conservée' : 'Déficit de période'}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.heroAmount,
                  !isPositive && { color: colors.accent.dangerBorder },
                ]}
              >
                {isPositive ? '+' : ''}
                {formatFCFA(netSavings).replace(' FCFA', '')}
                <Text style={styles.heroUnit}> FCFA</Text>
              </Text>

              <View style={styles.savingsPill}>
                <TrendingUp size={14} color={colors.primary.DEFAULT} />
                <Text style={styles.savingsPillText}>
                  Taux d'épargne :{' '}
                  <Text style={{ fontWeight: typography.weights.extrabold }}>
                    {summary.savingsRate} %
                  </Text>{' '}
                  des revenus
                </Text>
              </View>

              {/* Split Revenus / Dépenses */}
              <View style={styles.heroSplit}>
                <View style={styles.splitBox}>
                  <View style={styles.splitHead}>
                    <Text style={styles.splitLabel}>Revenus encaissés</Text>
                    <ArrowDown size={14} color={colors.primary.container} />
                  </View>
                  <Text style={styles.splitAmount}>
                    +{formatFCFA(summary.incomeTotal).replace(' FCFA', '')}{' '}
                    <Text style={styles.splitUnit}>F</Text>
                  </Text>
                </View>

                <View style={styles.splitBox}>
                  <View style={styles.splitHead}>
                    <Text style={styles.splitLabel}>Dépenses réelles</Text>
                    <ArrowUp size={14} color={colors.accent.warning} />
                  </View>
                  <Text style={[styles.splitAmount, { color: colors.accent.warning }]}>
                    -{formatFCFA(summary.expenseTotal).replace(' FCFA', '')}{' '}
                    <Text style={styles.splitUnit}>F</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* SECTION 1 : ÉVOLUTION DANS LE TEMPS */}
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Évolution des dépenses</Text>
                <Text style={styles.sectionSubtitle}>
                  Moyenne journalière :{' '}
                  <Text style={{ fontWeight: typography.weights.bold, color: colors.primary.DEFAULT }}>
                    {formatFCFA(summary.dailyAverage)} / jour
                  </Text>
                </Text>
              </View>
            </View>

            <BarChart
              data={summary.timeline}
              dailyAverage={summary.dailyAverage}
              height={190}
            />

            {/* SECTION 2 : RÉPARTITION PAR CATÉGORIE */}
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Répartition par Catégorie</Text>
                <Text style={styles.sectionSubtitle}>
                  Total dépensé : {formatFCFA(summary.expenseTotal)}
                </Text>
              </View>
            </View>

            <View style={styles.donutCard}>
              <DonutChart
                categories={summary.categories}
                totalAmount={summary.expenseTotal}
                size={180}
              />

              {summary.topExpenseCategory ? (
                <View style={styles.topCatBox}>
                  <View style={styles.inline}>
                    <ChartPie size={16} color={colors.primary.DEFAULT} />
                    <Text style={styles.topCatBadge}>Poste n°1</Text>
                  </View>
                  <Text style={styles.topCatName}>
                    {summary.topExpenseCategory.categoryName}
                  </Text>
                  <Text style={styles.topCatValue}>
                    {formatFCFA(summary.topExpenseCategory.amount)} ·{' '}
                    <Text style={{ color: colors.primary.DEFAULT }}>
                      {summary.topExpenseCategory.percentage}%
                    </Text>
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Liste détaillée des catégories */}
            <View style={styles.categoriesList}>
              {summary.categories.map((c) => (
                <View key={c.categoryId} style={styles.categoryItem}>
                  <View style={styles.catLeft}>
                    <View style={[styles.catIconWrap, { backgroundColor: c.color + '20' }]}>
                      <CategoryIcon name={c.icon} color={c.color} size={18} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.catNameRow}>
                        <Text style={styles.catName}>{c.categoryName}</Text>
                        <Text style={styles.catAmount}>{formatFCFA(c.amount)}</Text>
                      </View>
                      <View style={styles.catProgressTrack}>
                        <View
                          style={[
                            styles.catProgressBar,
                            {
                              width: `${Math.max(4, c.percentage)}%`,
                              backgroundColor: c.color || colors.primary.DEFAULT,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.catPct}>{c.percentage}% des sorties</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* SECTION 3 : DIAGNOSTIC INTELLIGENT GERETOU */}
            {diagnostic ? (
              <View
                style={[
                  styles.diagCard,
                  diagnostic.tone === 'alert' && styles.diagCardAlert,
                  diagnostic.tone === 'warning' && styles.diagCardWarning,
                  diagnostic.tone === 'excellent' && styles.diagCardExcellent,
                ]}
              >
                <View style={styles.diagHead}>
                  <View style={styles.inline}>
                    <Lightbulb size={18} color={colors.primary.dark} />
                    <Text style={styles.diagHeadLabel}>DIAGNOSTIC GERETOU · IA LOCALE</Text>
                  </View>
                  <Sparkles size={16} color={colors.primary.DEFAULT} />
                </View>

                <Text style={styles.diagTitle}>{diagnostic.headline}</Text>
                <Text style={styles.diagSummary}>{diagnostic.summaryText}</Text>

                <View style={styles.diagTipBox}>
                  <Text style={styles.diagTip}>{diagnostic.actionableTip}</Text>
                </View>
              </View>
            ) : null}

            {/* Mention de souveraineté des données */}
            <View style={styles.privacyBox}>
              <ShieldCheck size={16} color={colors.text.muted} />
              <Text style={styles.privacyText}>
                Tous les agrégats sont calculés instantanément et localement en SQLite. Vos données ne transitent par aucun serveur externe.
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.canvas },
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.extrabold,
    color: colors.primary.dark,
  },
  subtitle: {
    fontSize: typography.sizes.bodySm,
    color: colors.text.secondary,
  },
  certifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary.subtle,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  certifiedText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.primary.DEFAULT,
  },
  periodRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
  },
  periodBtnOn: {
    backgroundColor: colors.primary.DEFAULT,
  },
  periodText: {
    fontSize: typography.sizes.bodySm,
    color: colors.text.secondary,
    fontWeight: typography.weights.medium,
  },
  periodTextOn: {
    color: colors.text.inverted,
    fontWeight: typography.weights.bold,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  loadingContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.sizes.body,
    color: colors.text.secondary,
  },
  hero: {
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroPeriodLabel: {
    fontSize: typography.sizes.caption,
    letterSpacing: 1,
    color: colors.primary.container,
    fontWeight: typography.weights.semibold,
  },
  heroTag: {
    borderWidth: 1,
    borderColor: colors.primary.light,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  heroTagText: {
    fontSize: typography.sizes.caption,
    color: colors.primary.container,
    fontWeight: typography.weights.semibold,
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: typography.weights.extrabold,
    color: colors.text.inverted,
  },
  heroUnit: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.medium,
    color: colors.primary.container,
  },
  savingsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary.container,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  savingsPillText: {
    fontSize: typography.sizes.caption,
    color: colors.primary.dark,
    fontWeight: typography.weights.medium,
  },
  heroSplit: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  splitBox: {
    flex: 1,
    backgroundColor: colors.primary.dark,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary.light,
  },
  splitHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  splitLabel: {
    fontSize: typography.sizes.caption,
    color: colors.primary.container,
    flexShrink: 1,
  },
  splitAmount: {
    marginTop: 4,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.text.inverted,
  },
  splitUnit: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
  },
  sectionHeader: {
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    color: colors.primary.dark,
  },
  sectionSubtitle: {
    fontSize: typography.sizes.bodySm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  donutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.card,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
    gap: spacing.md,
  },
  topCatBox: {
    flex: 1,
    gap: 4,
  },
  topCatBadge: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.primary.DEFAULT,
  },
  topCatName: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  topCatValue: {
    fontSize: typography.sizes.bodySm,
    color: colors.text.secondary,
    fontWeight: typography.weights.medium,
  },
  categoriesList: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  catIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catName: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  catAmount: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.extrabold,
    color: colors.text.primary,
  },
  catProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface.muted,
    marginVertical: 4,
    overflow: 'hidden',
  },
  catProgressBar: {
    height: 6,
    borderRadius: 3,
  },
  catPct: {
    fontSize: typography.sizes.caption,
    color: colors.text.secondary,
  },
  diagCard: {
    backgroundColor: colors.primary.subtle,
    borderRadius: radii.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.primary.container,
    gap: spacing.sm,
  },
  diagCardAlert: {
    backgroundColor: colors.accent.dangerBg,
    borderColor: colors.accent.dangerBorder,
  },
  diagCardWarning: {
    backgroundColor: colors.accent.warningBg,
    borderColor: colors.accent.warningBorder,
  },
  diagCardExcellent: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  diagHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diagHeadLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.primary.dark,
    letterSpacing: 0.5,
  },
  diagTitle: {
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  diagSummary: {
    fontSize: typography.sizes.bodySm,
    lineHeight: 20,
    color: colors.text.primary,
  },
  diagTipBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginTop: 2,
  },
  diagTip: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    color: colors.primary.dark,
    lineHeight: 18,
  },
  privacyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  privacyText: {
    flex: 1,
    fontSize: typography.sizes.caption,
    color: colors.text.muted,
    lineHeight: 16,
  },
});
