/**
 * Projets & Épargne dédiée — GERETOU
 * Maquettes Stitch « Projets & Épargne Dédiée » et « Projets d'Achat & Épargne Dédiée » (réunies).
 */

import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { ArrowLeft, Plus, PiggyBank, Lightbulb, Lock, CalendarDays, Target, CircleCheck, Clock, ArrowDownToLine, Ban, Database, Trophy } from 'lucide-react-native';
import { BudgetGauge } from '../../components/budget/BudgetGauge';
import { MoneyActionModal } from '../../components/common/MoneyActionModal';
import { ProjectEditorModal } from '../../components/projects/ProjectEditorModal';
import { useAuthStore } from '../../store/useAuthStore';
import { useCommitmentStore } from '../../store/useCommitmentStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useNavStore } from '../../store/useNavStore';
import { showToast } from '../../store/useToastStore';
import { PRIORITY_LABELS, STATUS_LABELS, ProjectStatus, daysLeft, pickAdviceProject, progress } from '../../services/projects/projectCore';
import { ProjectRecord } from '../../services/projects/projectRepo';
import { parseDay } from '../../services/agenda/deadlineCore';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

type Tab = 'ALL' | ProjectStatus;
const num = (n: number) => formatFCFA(n).replace(' FCFA', '');

export const ProjectsScreen: React.FC = () => {
  const { currentUser, recordActivity } = useAuthStore();
  const { projects, refresh, isLoading, fund, withdraw, abandon } = useCommitmentStore();
  const { summary, fetchWallet } = useWalletStore();
  const { goBack } = useNavStore();
  const [tab, setTab] = useState<Tab>('ALL');
  const [creating, setCreating] = useState(false);
  const [money, setMoney] = useState<{ project: ProjectRecord; mode: 'fund' | 'withdraw' } | null>(null);
  const [confirmAbandon, setConfirmAbandon] = useState<string | null>(null);
  const uid = currentUser?.id ?? '';

  useEffect(() => {
    if (!uid) return;
    refresh(uid);
    fetchWallet(uid);
  }, [uid]);

  const now = new Date();
  const saved = projects.reduce((s, p) => s + p.locked_amount, 0);
  const targets = projects.reduce((s, p) => s + p.target_amount, 0);
  const ratio = progress(saved, targets);
  const count = (s: ProjectStatus) => projects.filter((p) => p.status === s).length;
  const list = tab === 'ALL' ? projects : projects.filter((p) => p.status === tab);
  const advice = pickAdviceProject(projects, now);
  const mainAccounts = summary.accounts.filter((a) => !a.is_archived && a.id !== money?.project.account_vault_id);

  const doAbandon = async (p: ProjectRecord) => {
    if (confirmAbandon !== p.id) return setConfirmAbandon(p.id);
    const failure = await abandon(uid, p.id);
    setConfirmAbandon(null);
    showToast(failure ? { kind: 'error', title: 'Action impossible', message: failure } : { kind: 'info', title: 'Projet abandonné', message: p.locked_amount > 0 ? `${formatFCFA(p.locked_amount)} restent dans ${p.vault_name}.` : undefined });
  };

  const renderCard = (p: ProjectRecord) => {
    const r = progress(p.locked_amount, p.target_amount);
    const left = daysLeft(p.target_date, now);
    const done = p.status === 'COMPLETED';
    const planned = p.status === 'IDEA';
    const tone = done || r >= 0.5 ? colors.primary.DEFAULT : r > 0 ? colors.accent.warning : colors.text.muted;
    const prioColor = p.priority === 'CRITICAL' || p.priority === 'HIGH' ? colors.accent.danger : colors.text.secondary;
    return (
      <View key={p.id} style={[styles.card, planned && styles.cardPlanned]}>
        <View style={styles.cardHead}>
          <View style={styles.cardIcon}>{done ? <Trophy size={22} color={colors.primary.DEFAULT} /> : <Target size={22} color={colors.text.primary} />}</View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{p.title}</Text>
            <View style={styles.tags}>
              <View style={[styles.prio, { backgroundColor: p.priority === 'CRITICAL' || p.priority === 'HIGH' ? colors.accent.dangerBg : colors.brands.waveBg }]}>
                <Text style={[styles.prioText, { color: prioColor }]}>{PRIORITY_LABELS[p.priority]}</Text>
              </View>
              <Text style={styles.status}>· {STATUS_LABELS[p.status]}</Text>
            </View>
          </View>
        </View>
        <View style={styles.amountRow}>
          <Text style={[styles.amount, { color: tone }]}>
            {num(p.locked_amount)} <Text style={styles.amountOf}>/ {formatFCFA(p.target_amount)}</Text>
          </Text>
          <Text style={[styles.percent, { color: tone }]}>{Math.round(r * 100)} %</Text>
        </View>
        <BudgetGauge ratio={r} status={done || r >= 0.5 ? 'healthy' : 'warning'} height={8} />
        <View style={styles.metaRow}>
          <View style={styles.meta}>
            <Lock size={14} color={colors.text.secondary} />
            <Text style={styles.metaText} numberOfLines={1}>{p.vault_name ?? 'Aucun coffre'}</Text>
          </View>
          {p.target_date ? (
            <View style={styles.meta}>
              <CalendarDays size={14} color={colors.text.secondary} />
              <Text style={styles.metaText}>
                {parseDay(p.target_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                {left !== null && !done ? (left >= 0 ? ` (dans ${left} j)` : ' (dépassée)') : ''}
              </Text>
            </View>
          ) : null}
        </View>
        {done ? (
          <View style={styles.doneBox}>
            <CircleCheck size={16} color={colors.primary.DEFAULT} />
            <Text style={styles.doneText}>Objectif atteint ! L'argent est prêt dans {p.vault_name}.</Text>
          </View>
        ) : null}
        <View style={styles.actions}>
          {!done ? (
            <Pressable onPress={() => setMoney({ project: p, mode: 'fund' })} accessibilityRole="button" accessibilityLabel={`Alimenter ${p.title}`} style={({ pressed }) => [styles.primary, planned && styles.primaryOutline, pressed && { opacity: 0.85 }]}>
              <Plus size={16} color={planned ? colors.primary.DEFAULT : colors.text.inverted} />
              <Text style={[styles.primaryText, planned && { color: colors.primary.DEFAULT }]}>{planned ? 'Démarrer l’épargne' : 'Alimenter le coffre'}</Text>
            </Pressable>
          ) : null}
          {p.locked_amount > 0 ? (
            <Pressable onPress={() => setMoney({ project: p, mode: 'withdraw' })} accessibilityRole="button" accessibilityLabel={`Retirer de ${p.title}`} style={({ pressed }) => [styles.secondary, done && { flex: 1 }, pressed && { opacity: 0.7 }]}>
              <ArrowDownToLine size={16} color={colors.text.primary} />
              <Text style={styles.secondaryText}>Retirer</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => doAbandon(p)} accessibilityRole="button" accessibilityLabel={confirmAbandon === p.id ? 'Confirmer l’abandon' : `Abandonner ${p.title}`} style={[styles.icon, confirmAbandon === p.id && { backgroundColor: colors.accent.danger }]}>
            <Ban size={16} color={confirmAbandon === p.id ? colors.text.inverted : colors.text.secondary} />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Retour" style={styles.back}>
          <ArrowLeft size={22} color={colors.text.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Projets & Épargne</Text>
          <Text style={styles.subtitle}>Anticiper sans toucher à la trésorerie</Text>
        </View>
        <Pressable onPress={() => setCreating(true)} accessibilityRole="button" style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}>
          <Plus size={18} color={colors.text.inverted} />
          <Text style={styles.addText}>Projet</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => { if (uid) refresh(uid); }} />} onTouchStart={recordActivity}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.inline}>
              <PiggyBank size={16} color={colors.primary.container} />
              <Text style={styles.heroLabel}>ÉPARGNE DÉDIÉE</Text>
            </View>
            <View style={styles.heroPill}>
              <Lock size={12} color={colors.primary.container} />
              <Text style={styles.heroPillText}>Bloquée en coffre</Text>
            </View>
          </View>
          <Text style={styles.heroAmount}>
            {num(saved)}
            <Text style={styles.heroUnit}> FCFA</Text>
          </Text>
          <Text style={styles.heroSub}>
            Sur {formatFCFA(targets)} d'objectifs cumulés ({Math.round(ratio * 100)} % atteint)
          </Text>
          <BudgetGauge ratio={ratio} status="healthy" height={8} />
          <View style={styles.heroCounts}>
            <View style={styles.countPill}>
              <CircleCheck size={13} color={colors.primary.container} />
              <Text style={styles.countText}>{count('ACTIVE')} en cours</Text>
            </View>
            <View style={styles.countPill}>
              <Clock size={13} color={colors.primary.container} />
              <Text style={styles.countText}>{count('IDEA')} planifié{count('IDEA') > 1 ? 's' : ''}</Text>
            </View>
          </View>
          <View style={styles.rule}>
            <Lightbulb size={16} color={colors.accent.warning} />
            <Text style={styles.ruleText}>
              <Text style={[styles.bold, { color: colors.text.inverted }]}>Règle GERETOU :</Text> seul l'argent physiquement bloqué dans un coffre réduit votre solde disponible.
            </Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {([
            { k: 'ALL', l: `Tous (${projects.length})` },
            { k: 'ACTIVE', l: `En cours (${count('ACTIVE')})` },
            { k: 'IDEA', l: `Planifiés (${count('IDEA')})` },
            { k: 'COMPLETED', l: `Atteints (${count('COMPLETED')})` },
          ] as const).map(({ k, l }) => (
            <Pressable key={k} onPress={() => setTab(k)} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} style={[styles.tab, tab === k && styles.tabOn]}>
              <Text style={[styles.tabText, tab === k && styles.tabTextOn]}>{l}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {list.length === 0 ? (
          <View style={styles.empty}>
            <Target size={30} color={colors.text.muted} />
            <Text style={styles.emptyText}>{projects.length === 0 ? 'Aucun projet pour le moment. Un ordinateur, un voyage, une réserve d’urgence ?' : 'Aucun projet dans cette catégorie.'}</Text>
            {projects.length === 0 ? (
              <Pressable onPress={() => setCreating(true)} accessibilityRole="button">
                <Text style={styles.emptyLink}>Créer mon premier projet</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          list.map(renderCard)
        )}

        {advice ? (
          <View style={styles.advice}>
            <View style={styles.inline}>
              <Lightbulb size={18} color={colors.primary.DEFAULT} />
              <Text style={styles.adviceTitle}>Conseil d'épargne</Text>
            </View>
            <Text style={styles.adviceText}>
              Pour atteindre <Text style={styles.bold}>{advice.project.title}</Text>
              {advice.project.target_date ? ` avant le ${parseDay(advice.project.target_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : ''}, mettez de côté{' '}
              <Text style={styles.adviceStrong}>{formatFCFA(advice.advice.perWeek)} par semaine</Text> (environ {formatFCFA(advice.advice.perMonth)} par mois) sur{' '}
              {advice.project.vault_name}.
            </Text>
            <Pressable onPress={() => setMoney({ project: advice.project, mode: 'fund' })} accessibilityRole="button" style={styles.adviceLink}>
              <Text style={styles.adviceLinkText}>Verser {formatFCFA(advice.advice.perWeek)} maintenant</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.footNote}>
          <Database size={14} color={colors.text.secondary} />
          <Text style={styles.footNoteText}>Données enregistrées sur ce téléphone, même sans connexion.</Text>
        </View>
      </ScrollView>

      <ProjectEditorModal visible={creating} onClose={() => setCreating(false)} />
      <MoneyActionModal
        visible={!!money}
        title={money?.mode === 'fund' ? `Alimenter · ${money?.project.title}` : `Retirer · ${money?.project.title}`}
        subtitle={money ? (money.mode === 'fund' ? `Vers ${money.project.vault_name} · reste ${formatFCFA(Math.max(0, money.project.target_amount - money.project.locked_amount))} à épargner` : `Épargné : ${formatFCFA(money.project.locked_amount)}`) : undefined}
        amountLabel={money?.mode === 'fund' ? 'Montant à bloquer' : 'Montant à reprendre'}
        max={money ? (money.mode === 'fund' ? undefined : money.project.locked_amount) : undefined}
        presets={[5000, 10000, 25000, 50000]}
        accounts={mainAccounts}
        accountLabel={money?.mode === 'fund' ? 'Depuis quel compte ?' : 'Vers quel compte ?'}
        debit={money?.mode === 'fund'}
        confirmLabel={(a) => (money?.mode === 'fund' ? `Bloquer ${a > 0 ? formatFCFA(a) : ''}` : `Reprendre ${a > 0 ? formatFCFA(a) : ''}`)}
        onConfirm={async (amount, accountId) => {
          if (!money || !accountId) return 'Choisissez un compte.';
          if (money.mode === 'fund') {
            const r = await fund(uid, money.project.id, accountId, amount);
            if (!r.error) showToast(r.completed ? { kind: 'success', title: 'Objectif atteint !', message: `${money.project.title} : ${formatFCFA(money.project.target_amount)} épargnés.` } : { kind: 'success', title: 'Coffre alimenté', message: `${formatFCFA(amount)} bloqués pour ${money.project.title}.` });
            return r.error;
          }
          const failure = await withdraw(uid, money.project.id, accountId, amount);
          if (!failure) showToast({ kind: 'info', title: 'Montant repris', message: `${formatFCFA(amount)} remis sur votre compte.` });
          return failure;
        }}
        onClose={() => setMoney(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.canvas },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.base, paddingVertical: spacing.md, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.surface.border },
  back: { width: 40, height: 40, borderRadius: radii.md, borderWidth: 1, borderColor: colors.surface.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: typography.sizes.title, fontWeight: typography.weights.extrabold, color: colors.primary.dark },
  subtitle: { fontSize: typography.sizes.bodySm, color: colors.text.secondary },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary.DEFAULT, borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  addText: { color: colors.text.inverted, fontWeight: typography.weights.bold },
  content: { padding: spacing.base, paddingBottom: spacing.xxl, gap: spacing.md },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bold: { fontWeight: typography.weights.bold, color: colors.text.primary },
  hero: { backgroundColor: colors.primary.DEFAULT, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.sm },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { fontSize: typography.sizes.caption, letterSpacing: 1, color: colors.primary.container, fontWeight: typography.weights.semibold },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary.dark, borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  heroPillText: { fontSize: typography.sizes.caption, color: colors.primary.container },
  heroAmount: { fontSize: 36, fontWeight: typography.weights.extrabold, color: colors.text.inverted },
  heroUnit: { fontSize: typography.sizes.title, fontWeight: typography.weights.medium, color: colors.primary.container },
  heroSub: { fontSize: typography.sizes.bodySm, color: colors.primary.container },
  heroCounts: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  countPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.primary.light, borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  countText: { fontSize: typography.sizes.caption, color: colors.primary.container },
  rule: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', backgroundColor: colors.primary.dark, borderRadius: radii.md, padding: spacing.sm, marginTop: spacing.xs },
  ruleText: { flex: 1, fontSize: typography.sizes.caption, lineHeight: 17, color: colors.primary.container },
  tabs: { gap: spacing.sm, paddingRight: spacing.base },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.full, borderWidth: 1, borderColor: colors.surface.border, backgroundColor: colors.surface.card },
  tabOn: { backgroundColor: colors.primary.dark, borderColor: colors.primary.dark },
  tabText: { fontSize: typography.sizes.bodySm, color: colors.text.primary },
  tabTextOn: { color: colors.text.inverted, fontWeight: typography.weights.bold },
  card: { backgroundColor: colors.surface.card, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.surface.border, padding: spacing.base, gap: spacing.md },
  cardPlanned: { borderStyle: 'dashed', borderWidth: 1.5 },
  cardHead: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  cardIcon: { width: 46, height: 46, borderRadius: radii.lg, backgroundColor: colors.brands.waveBg, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text.primary },
  tags: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  prio: { borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  prioText: { fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  status: { fontSize: typography.sizes.caption, color: colors.text.secondary },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  amount: { fontSize: typography.sizes.title, fontWeight: typography.weights.extrabold },
  amountOf: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.medium, color: colors.text.secondary },
  percent: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: colors.surface.border, paddingTop: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  metaText: { fontSize: typography.sizes.caption, color: colors.text.secondary, flexShrink: 1 },
  doneBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary.subtle, borderRadius: radii.md, padding: spacing.sm },
  doneText: { flex: 1, fontSize: typography.sizes.bodySm, color: colors.primary.dark, fontWeight: typography.weights.semibold },
  actions: { flexDirection: 'row', gap: spacing.sm },
  primary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, borderRadius: radii.md, backgroundColor: colors.primary.DEFAULT },
  primaryOutline: { backgroundColor: colors.surface.card, borderWidth: 1.5, borderColor: colors.primary.DEFAULT },
  primaryText: { color: colors.text.inverted, fontWeight: typography.weights.bold, fontSize: typography.sizes.bodySm },
  secondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radii.md, backgroundColor: colors.brands.waveBg },
  secondaryText: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold, color: colors.text.primary },
  icon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.brands.waveBg, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface.card, borderRadius: radii.xl, padding: spacing.xl },
  emptyText: { fontSize: typography.sizes.bodySm, color: colors.text.secondary, textAlign: 'center' },
  emptyLink: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.primary.DEFAULT },
  advice: { backgroundColor: colors.primary.subtle, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.primary.container, padding: spacing.base, gap: spacing.sm },
  adviceTitle: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.primary.dark },
  adviceText: { fontSize: typography.sizes.bodySm, lineHeight: 20, color: colors.text.secondary },
  adviceStrong: { fontWeight: typography.weights.bold, color: colors.primary.DEFAULT },
  adviceLink: { alignSelf: 'flex-start' },
  adviceLinkText: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.bold, color: colors.primary.DEFAULT, textDecorationLine: 'underline' },
  footNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  footNoteText: { fontSize: typography.sizes.caption, color: colors.text.secondary },
});
