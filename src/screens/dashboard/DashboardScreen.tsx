/**
 * Accueil & Tableau de bord — GERETOU
 * Maquette Stitch « Accueil & Tableau de Bord » — uniquement avec des données réelles.
 */

import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, Pressable, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import {
  Lock,
  Bell,
  UserRound,
  Wallet,
  Minus,
  Plus,
  CloudUpload,
  RefreshCw,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  ReceiptText,
  ChevronRight,
  CircleDashed,
  Gauge,
  Target,
} from 'lucide-react-native';
import { CategoryIcon, PROVENANCE_ICONS } from '../../components/common/AppIcons';
import { useAuthStore } from '../../store/useAuthStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useNavStore } from '../../store/useNavStore';
import { showToast } from '../../store/useToastStore';
import { greetingName } from '../../services/auth/identity';
import { describeTransaction } from '../../services/transaction/labels';
import { ACCOUNT_TYPE_LABELS, groupAccountsForCards, relativeDate } from '../../services/dashboard/dashboardData';
import { getOpenDebtBalances } from '../../services/debt/debtService';
import { GoogleSession, isTokenValid, loadSession } from '../../services/google/googleSession';
import { SyncInfo, getLastSync, syncNow } from '../../services/backup/syncService';
import { formatSyncDate } from '../settings/BackupScreen';
import { DeleteAccountModal } from '../settings/DeleteAccountModal';
import { TransferModal } from '../../components/account/TransferModal';
import { BudgetGauge, STATUS_COLORS } from '../../components/budget/BudgetGauge';
import { useBudgetStore } from '../../store/useBudgetStore';
import { Account, Transaction } from '../../types/database';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';
import { ACCOUNT_BRAND } from '../../theme/brand';

const RECENT_COLLAPSED = 5;

const BRAND = ACCOUNT_BRAND;

/** « 485 000 FCFA » → { value: '485 000', unit: 'FCFA' } pour l'affichage en deux tailles. */
function splitAmount(amount: number): { value: string; unit: string } {
  const [value, unit] = formatFCFA(amount).split(' FCFA');
  return { value: value ?? '0', unit: unit === undefined ? '' : 'FCFA' };
}

/** Icône d'une transaction : sa catégorie, sinon sa provenance, sinon le sens du flux. */
const TxIcon: React.FC<{ tx: Transaction; color: string }> = ({ tx, color }) => {
  if (tx.type === 'TRANSFER') return <ArrowLeftRight size={20} color={color} />;
  if (tx.category_icon) return <CategoryIcon name={tx.category_icon} size={20} color={color} />;
  if (tx.type !== 'EXPENSE' && tx.provenance) {
    const ProvIcon = PROVENANCE_ICONS[tx.provenance];
    return <ProvIcon size={20} color={color} />;
  }
  return tx.type === 'EXPENSE' ? <ArrowUpRight size={20} color={color} /> : <ArrowDownLeft size={20} color={color} />;
};

interface DashboardScreenProps {
  onOpenNewExpense: () => void;
  onOpenNewIncome: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onOpenNewExpense, onOpenNewIncome }) => {
  const { currentUser, lockSession, recordActivity, linkGoogleAccount } = useAuthStore();
  const { summary, fetchWallet, isLoading: isWalletLoading } = useWalletStore();
  const { recentTransactions, fetchRecentTransactions, isLoading: isTxLoading } = useTransactionStore();
  const { navigate, switchTab } = useNavStore();
  const { budgets, refresh: refreshBudgets } = useBudgetStore();

  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [debts, setDebts] = useState({ owedToMe: 0, iOwe: 0 });
  const [session, setSession] = useState<GoogleSession | null>(null);
  const [lastSync, setLastSync] = useState<SyncInfo | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [showAllTx, setShowAllTx] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  const loadAll = async () => {
    if (!currentUser?.id) return;
    await Promise.all([
      fetchWallet(currentUser.id),
      fetchRecentTransactions(currentUser.id),
      getOpenDebtBalances(currentUser.id).then(setDebts).catch(() => {}),
      loadSession().then(setSession),
      getLastSync().then(setLastSync),
      refreshBudgets(currentUser.id),
    ]);
  };

  useEffect(() => {
    loadAll();
  }, [currentUser?.id]);

  const onRefresh = async () => {
    recordActivity();
    await loadAll();
  };

  const quickSync = async () => {
    recordActivity();
    // Session absente ou expirée : l'écran Sauvegarde gère la (re)connexion Google.
    if (!session || !isTokenValid(session)) return navigate('BACKUP');
    try {
      setSyncing(true);
      await linkGoogleAccount(session.email);
      const info = await syncNow(session.accessToken, session.email);
      setLastSync(info);
      showToast({ kind: 'success', title: 'Sauvegarde envoyée', message: 'Vos données sont à jour sur Google Drive.' });
    } catch (e) {
      showToast({ kind: 'error', title: 'Synchronisation impossible', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setSyncing(false);
    }
  };

  const cards = groupAccountsForCards(summary.accounts);
  const monthBudget = budgets.find((b) => !b.category_id && b.period === 'MONTH');
  const dayBudget = budgets.find((b) => !b.category_id && b.period === 'DAY');
  const firstName = greetingName(currentUser?.display_name, currentUser?.email);
  const hero = splitAmount(summary.liquidBalance);
  const txList = showAllTx ? recentTransactions : recentTransactions.slice(0, RECENT_COLLAPSED);
  const otherAccounts = accountToDelete
    ? summary.accounts.filter((a) => a.id !== accountToDelete.id && a.is_archived === 0)
    : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.statusStrip}>
        <View style={styles.statusItem}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Hors-ligne actif</Text>
        </View>
        <Text style={styles.statusMuted}>Stockage local</Text>
        <Pressable onPress={() => navigate('BACKUP')} accessibilityRole="button" style={styles.statusSync}>
          <RefreshCw size={12} color={colors.primary.DEFAULT} />
          <Text style={styles.statusSyncText}>
            {lastSync ? `Drive : ${formatSyncDate(lastSync.syncedAt).replace("Aujourd'hui, ", '')}` : 'Drive : jamais'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isWalletLoading || isTxLoading} onRefresh={onRefresh} />}
        onTouchStart={recordActivity}
      >
        {/* En-tête */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <UserRound size={22} color={colors.primary.DEFAULT} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello} numberOfLines={1}>Bonjour{firstName ? ` ${firstName}` : ''}</Text>
            <Text style={styles.helloSub}>Tableau de bord familial</Text>
          </View>
          <Pressable onPress={() => navigate('NOTIFICATIONS')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Notifications" style={styles.iconBtn}>
            <Bell size={20} color={colors.text.primary} />
          </Pressable>
          <Pressable onPress={lockSession} hitSlop={8} accessibilityRole="button" accessibilityLabel="Verrouiller" style={styles.iconBtn}>
            <Lock size={20} color={colors.text.primary} />
          </Pressable>
        </View>

        {/* Solde disponible + actions */}
        <View style={styles.hero}>
          <View style={styles.heroLabelRow}>
            <Wallet size={16} color={colors.primary.container} />
            <Text style={styles.heroLabel}>Solde total disponible</Text>
          </View>
          <Text style={styles.heroAmount}>
            {hero.value}
            <Text style={styles.heroUnit}> {hero.unit}</Text>
          </Text>
          <Text style={styles.heroHint}>
            Calculé hors-ligne sur {cards.length} portefeuille{cards.length > 1 ? 's' : ''} actif{cards.length > 1 ? 's' : ''}
            {summary.lockedBalance > 0 ? ` · ${formatFCFA(summary.lockedBalance)} en coffre / épargne` : ''}
          </Text>
          <View style={styles.heroActions}>
            <Pressable onPress={onOpenNewExpense} accessibilityRole="button" style={({ pressed }) => [styles.heroBtn, styles.heroBtnLight, pressed && { opacity: 0.85 }]}>
              <View style={[styles.heroBtnIcon, { backgroundColor: colors.primary.subtle }]}>
                <Minus size={18} color={colors.primary.DEFAULT} />
              </View>
              <Text style={[styles.heroBtnText, { color: colors.primary.DEFAULT }]}>Dépense</Text>
            </Pressable>
            <Pressable onPress={onOpenNewIncome} accessibilityRole="button" style={({ pressed }) => [styles.heroBtn, pressed && { opacity: 0.85 }]}>
              <View style={styles.heroBtnIcon}>
                <Plus size={18} color={colors.text.inverted} />
              </View>
              <Text style={styles.heroBtnText}>Entrée</Text>
            </Pressable>
            <Pressable onPress={() => setShowTransfer(true)} accessibilityRole="button" accessibilityLabel="Transfert entre comptes" style={({ pressed }) => [styles.heroBtn, pressed && { opacity: 0.85 }]}>
              <View style={styles.heroBtnIcon}>
                <ArrowLeftRight size={18} color={colors.text.inverted} />
              </View>
              <Text style={styles.heroBtnText}>Transfert</Text>
            </Pressable>
          </View>
        </View>

        {/* Sauvegarde Google Drive */}
        <View style={styles.driveCard}>
          <View style={styles.driveIcon}>
            <CloudUpload size={20} color={colors.primary.DEFAULT} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.driveTitleRow}>
              <Text style={styles.driveTitle}>Sauvegarde Google Drive</Text>
              {session ? (
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>ACTIVE</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.driveSub} numberOfLines={1}>
              {!session
                ? 'Non connectée — vos données restent sur ce téléphone'
                : lastSync
                  ? `Dernière synchro : ${formatSyncDate(lastSync.syncedAt)}`
                  : 'Connectée — jamais synchronisée'}
            </Text>
          </View>
          <Pressable onPress={quickSync} disabled={syncing} accessibilityRole="button" style={({ pressed }) => [styles.syncBtn, pressed && { opacity: 0.7 }]}>
            {syncing ? <ActivityIndicator size="small" color={colors.primary.DEFAULT} /> : <RefreshCw size={14} color={colors.primary.DEFAULT} />}
            <Text style={styles.syncBtnText}>{session ? 'Sync' : 'Activer'}</Text>
          </Pressable>
        </View>

        {/* Comptes */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Mes comptes</Text>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{cards.length}</Text>
            </View>
          </View>
          <Pressable onPress={() => switchTab('WALLETS')} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.link}>Voir tout</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountsRow}>
          {cards.map(({ account, savings, savingsLabel }) => {
            const brand = BRAND[account.type];
            return (
              <Pressable
                key={account.id}
                onLongPress={() => setAccountToDelete(account)}
                accessibilityRole="button"
                accessibilityHint="Appui long pour clôturer ce compte"
                style={styles.accountCard}
              >
                <View style={[styles.brandPill, { backgroundColor: brand.bg }]}>
                  <Text style={[styles.brandPillText, { color: brand.fg }]}>{ACCOUNT_TYPE_LABELS[account.type]}</Text>
                </View>
                <Text style={styles.accountName} numberOfLines={1}>{account.name}</Text>
                <Text style={styles.accountLabel}>Disponible</Text>
                <Text style={styles.accountBalance}>{formatFCFA(account.balance)}</Text>
                <View style={styles.accountFooter}>
                  <Text style={styles.accountFooterLabel}>{savingsLabel ?? 'Coffre'}</Text>
                  <Text style={styles.accountFooterValue}>{savings > 0 ? formatFCFA(savings) : '—'}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Suivi budgétaire */}
        {monthBudget || dayBudget ? (
          <Pressable onPress={() => switchTab('BUDGETS')} accessibilityRole="button" accessibilityHint="Ouvrir les budgets" style={styles.budgetCard}>
            <View style={styles.budgetHead}>
              <View style={styles.budgetTitleRow}>
                <CircleDashed size={18} color={colors.primary.DEFAULT} />
                <Text style={styles.budgetTitle}>Suivi budgétaire en direct</Text>
              </View>
              <View style={styles.budgetMonth}>
                <Text style={styles.budgetMonthText}>{new Date().toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</Text>
              </View>
            </View>
            {monthBudget ? (
              <>
                <View style={styles.budgetRow}>
                  <Text style={styles.budgetSub}>
                    Consommé : <Text style={styles.budgetStrong}>{monthBudget.progress.percent} %</Text> ({formatFCFA(monthBudget.progress.spent)})
                  </Text>
                  <Text style={styles.budgetStrong}>{formatFCFA(monthBudget.progress.limit)}</Text>
                </View>
                <BudgetGauge ratio={monthBudget.progress.ratio} status={monthBudget.progress.status} height={10} />
              </>
            ) : null}
            {dayBudget ? (
              <View style={[styles.budgetRow, monthBudget && styles.budgetDivider]}>
                <View style={styles.budgetTitleRow}>
                  <Gauge size={14} color={colors.text.secondary} />
                  <Text style={styles.budgetSub}>Plafond quotidien restant</Text>
                </View>
                <Text style={[styles.budgetStrong, { color: STATUS_COLORS[dayBudget.progress.status].fg }]}>
                  {formatFCFA(Math.max(0, dayBudget.progress.remaining)).replace(' FCFA', '')} / {formatFCFA(dayBudget.progress.limit)}
                </Text>
              </View>
            ) : null}
          </Pressable>
        ) : (
          <Pressable onPress={() => switchTab('BUDGETS')} accessibilityRole="button" style={styles.budgetCta}>
            <Target size={18} color={colors.primary.DEFAULT} />
            <Text style={styles.budgetCtaText}>Fixer un budget mensuel pour suivre vos dépenses</Text>
            <ChevronRight size={16} color={colors.primary.DEFAULT} />
          </Pressable>
        )}

        {/* Créances / Dettes */}
        <View style={styles.debtRow}>
          <Pressable onPress={() => navigate('DEBTS')} accessibilityRole="button" style={styles.debtCard}>
            <View style={styles.debtHead}>
              <Text style={styles.debtTitle}>Créances</Text>
              <View style={[styles.debtIcon, { backgroundColor: colors.accent.successBg }]}>
                <ArrowDown size={14} color={colors.primary.DEFAULT} />
              </View>
            </View>
            <Text style={styles.debtSub}>On vous doit</Text>
            <Text style={[styles.debtAmount, { color: debts.owedToMe > 0 ? colors.primary.DEFAULT : colors.text.primary }]}>{debts.owedToMe > 0 ? '+' : ''}{formatFCFA(debts.owedToMe)}</Text>
          </Pressable>
          <Pressable onPress={() => navigate('DEBTS')} accessibilityRole="button" style={styles.debtCard}>
            <View style={styles.debtHead}>
              <Text style={styles.debtTitle}>Dettes</Text>
              <View style={[styles.debtIcon, { backgroundColor: colors.accent.dangerBg }]}>
                <ArrowUp size={14} color={colors.accent.danger} />
              </View>
            </View>
            <Text style={styles.debtSub}>Vous devez</Text>
            <Text style={[styles.debtAmount, { color: debts.iOwe > 0 ? colors.accent.danger : colors.text.primary }]}>{debts.iOwe > 0 ? '-' : ''}{formatFCFA(debts.iOwe)}</Text>
          </Pressable>
        </View>

        {/* Dernières opérations */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dernières opérations</Text>
          {recentTransactions.length > RECENT_COLLAPSED ? (
            <Pressable onPress={() => setShowAllTx(!showAllTx)} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.link}>{showAllTx ? 'Réduire' : `Tout afficher (${recentTransactions.length})`}</Text>
            </Pressable>
          ) : null}
        </View>

        {recentTransactions.length === 0 ? (
          <View style={styles.empty}>
            <ReceiptText size={32} color={colors.text.muted} />
            <Text style={styles.emptyTitle}>Aucune opération pour l'instant</Text>
            <Text style={styles.emptyText}>Appuyez sur « Dépense » ou « Entrée » pour votre première saisie.</Text>
          </View>
        ) : (
          <View style={styles.txList}>
            {txList.map((tx, i) => {
              const isExp = tx.type === 'EXPENSE';
              const isTransfer = tx.type === 'TRANSFER';
              const color = isTransfer ? colors.text.secondary : isExp ? colors.accent.danger : colors.primary.DEFAULT;
              const { title, kind } = describeTransaction(tx);
              const brand = tx.account_type ? BRAND[tx.account_type] : null;
              return (
                <View key={tx.id} style={[styles.txRow, i < txList.length - 1 && styles.txDivider]}>
                  <View style={[styles.txIcon, { backgroundColor: isTransfer ? colors.surface.muted : isExp ? colors.accent.dangerBg : colors.accent.successBg }]}>
                    <TxIcon tx={tx} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txTitle} numberOfLines={1}>{title}</Text>
                    <View style={styles.txMeta}>
                      {brand && tx.account_type ? (
                        <View style={[styles.txPill, { backgroundColor: brand.bg }]}>
                          <Text style={[styles.txPillText, { color: brand.fg }]}>{ACCOUNT_TYPE_LABELS[tx.account_type]}</Text>
                        </View>
                      ) : null}
                      <Text style={styles.txDate} numberOfLines={1}>{relativeDate(tx.date)}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', maxWidth: '42%' }}>
                    <Text style={[styles.txAmount, { color }]} numberOfLines={1}>
                      {isTransfer ? '' : isExp ? '-' : '+'}{formatFCFA(tx.amount)}
                    </Text>
                    {kind ? <Text style={styles.txKind} numberOfLines={1}>{kind}</Text> : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <Pressable onPress={() => switchTab('MORE')} accessibilityRole="button" style={styles.moreLink}>
          <Text style={styles.moreLinkText}>Dettes, projets, agenda, analyses…</Text>
          <ChevronRight size={16} color={colors.text.secondary} />
        </Pressable>
      </ScrollView>

      {/* Saisie rapide */}
      <Pressable onPress={onOpenNewExpense} accessibilityRole="button" accessibilityLabel="Nouvelle dépense" style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.95 }] }]}>
        <Plus size={28} color={colors.accent.warning} strokeWidth={2.6} />
      </Pressable>

      <TransferModal visible={showTransfer} onClose={() => setShowTransfer(false)} onDone={loadAll} />

      <DeleteAccountModal
        visible={!!accountToDelete}
        account={accountToDelete}
        otherAccounts={otherAccounts}
        onClose={() => setAccountToDelete(null)}
        onSuccess={() => {
          setAccountToDelete(null);
          loadAll();
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.canvas },
  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: 6,
    backgroundColor: colors.primary.container,
  },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary.DEFAULT },
  statusText: { fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, color: colors.primary.dark },
  statusMuted: { flex: 1, fontSize: typography.sizes.caption, color: colors.primary.dark, opacity: 0.8 },
  statusSync: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  statusSyncText: { fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, color: colors.primary.dark },
  content: { padding: spacing.base, paddingBottom: 96, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hello: { fontSize: typography.sizes.title, fontWeight: typography.weights.bold, color: colors.text.primary },
  helloSub: { fontSize: typography.sizes.bodySm, color: colors.text.secondary },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface.card },
  hero: { backgroundColor: colors.primary.DEFAULT, borderRadius: radii.xl, padding: spacing.lg },
  heroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroLabel: { fontSize: typography.sizes.body, color: colors.primary.container },
  heroAmount: { marginTop: spacing.sm, fontSize: 38, fontWeight: typography.weights.extrabold, color: colors.text.inverted },
  heroUnit: { fontSize: typography.sizes.title, fontWeight: typography.weights.semibold, color: colors.primary.container },
  heroHint: { marginTop: spacing.xs, fontSize: typography.sizes.bodySm, color: colors.primary.container },
  heroActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  heroBtn: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.primary.light,
  },
  heroBtnLight: { backgroundColor: colors.surface.card },
  heroBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  heroBtnText: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text.inverted },
  driveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: spacing.md,
  },
  driveIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primary.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driveTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  driveTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text.primary },
  activePill: { backgroundColor: colors.primary.container, paddingHorizontal: 6, paddingVertical: 1, borderRadius: radii.sm },
  activePillText: { fontSize: 10, fontWeight: typography.weights.bold, color: colors.primary.DEFAULT, letterSpacing: 0.5 },
  driveSub: { fontSize: typography.sizes.caption, color: colors.text.secondary, marginTop: 2 },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brands.waveBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  syncBtnText: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.bold, color: colors.primary.DEFAULT },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text.primary },
  countPill: { backgroundColor: colors.brands.waveBg, borderRadius: radii.full, minWidth: 24, paddingHorizontal: 6, paddingVertical: 1, alignItems: 'center' },
  countPillText: { fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, color: colors.text.primary },
  link: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold, color: colors.primary.DEFAULT },
  accountsRow: { gap: spacing.sm, paddingRight: spacing.base },
  accountCard: {
    width: 176,
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: spacing.md,
  },
  brandPill: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.full },
  brandPillText: { fontSize: typography.sizes.caption, fontWeight: typography.weights.bold },
  accountName: { marginTop: spacing.sm, fontSize: typography.sizes.bodySm, color: colors.text.secondary },
  accountLabel: { marginTop: 2, fontSize: typography.sizes.caption, color: colors.text.muted },
  accountBalance: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text.primary },
  accountFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
  },
  accountFooterLabel: { fontSize: typography.sizes.caption, color: colors.text.secondary },
  accountFooterValue: { fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, color: colors.text.primary },
  budgetCard: { backgroundColor: colors.surface.card, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.surface.border, padding: spacing.md, gap: spacing.sm },
  budgetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  budgetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  budgetTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text.primary },
  budgetMonth: { backgroundColor: colors.primary.container, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.full },
  budgetMonthText: { fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, color: colors.primary.DEFAULT },
  budgetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  budgetDivider: { borderTopWidth: 1, borderTopColor: colors.surface.border, paddingTop: spacing.sm },
  budgetSub: { fontSize: typography.sizes.bodySm, color: colors.text.secondary, flexShrink: 1 },
  budgetStrong: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.bold, color: colors.text.primary },
  budgetCta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary.subtle, borderRadius: radii.lg, padding: spacing.md },
  budgetCtaText: { flex: 1, fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold, color: colors.primary.DEFAULT },
  debtRow: { flexDirection: 'row', gap: spacing.sm },
  debtCard: {
    flex: 1,
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: spacing.md,
  },
  debtHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  debtTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text.primary },
  debtIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  debtSub: { marginTop: spacing.xs, fontSize: typography.sizes.caption, color: colors.text.secondary },
  debtAmount: { marginTop: 2, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold },
  empty: { alignItems: 'center', gap: spacing.xs, backgroundColor: colors.surface.card, borderRadius: radii.lg, padding: spacing.xl },
  emptyTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text.primary },
  emptyText: { fontSize: typography.sizes.bodySm, color: colors.text.secondary, textAlign: 'center' },
  txList: { backgroundColor: colors.surface.card, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.surface.border },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  txDivider: { borderBottomWidth: 1, borderBottomColor: colors.surface.border },
  txIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  txTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text.primary },
  txMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  txPill: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: radii.sm },
  txPillText: { fontSize: 10, fontWeight: typography.weights.bold },
  txDate: { fontSize: typography.sizes.caption, color: colors.text.secondary, flexShrink: 1 },
  txAmount: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
  txKind: { fontSize: typography.sizes.caption, color: colors.text.secondary, marginTop: 2 },
  moreLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: spacing.sm },
  moreLinkText: { fontSize: typography.sizes.bodySm, color: colors.text.secondary },
  fab: {
    position: 'absolute',
    bottom: spacing.base,
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.surface.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
