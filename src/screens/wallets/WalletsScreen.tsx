/**
 * Comptes & Mobile Money — GERETOU
 * Maquette Stitch « Portefeuilles & Mobile Money ».
 * Liste des comptes (coffres / épargnes rattachés), totaux, ajout, virement interne, clôture.
 */

import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, Pressable, StyleSheet, RefreshControl } from 'react-native';
import {
  Plus,
  ShieldCheck,
  CircleCheck,
  PiggyBank,
  ArrowLeftRight,
  Wallet,
  Smartphone,
  Landmark,
  Banknote,
  Lock,
  Archive,
  ShieldHalf,
} from 'lucide-react-native';
import { AddAccountModal } from '../../components/account/AddAccountModal';
import { TransferModal } from '../../components/account/TransferModal';
import { DeleteAccountModal } from '../settings/DeleteAccountModal';
import { useAuthStore } from '../../store/useAuthStore';
import { useWalletStore } from '../../store/useWalletStore';
import { ACCOUNT_TYPE_LABELS, groupAccountsWithChildren } from '../../services/dashboard/dashboardData';
import { ACCOUNT_BRAND } from '../../theme/brand';
import { Account, AccountType } from '../../types/database';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

const TYPE_ICON: Record<AccountType, typeof Wallet> = {
  WAVE: Wallet,
  MOMO: Smartphone,
  ORANGE: Smartphone,
  BANK: Landmark,
  CASH: Banknote,
  VAULT: Lock,
};

function amountParts(amount: number) {
  return formatFCFA(amount).replace(' FCFA', '');
}

export const WalletsScreen: React.FC = () => {
  const { currentUser, recordActivity } = useAuthStore();
  const { summary, fetchWallet, isLoading } = useWalletStore();
  const [showAdd, setShowAdd] = useState(false);
  const [transferFrom, setTransferFrom] = useState<string | null>(null);
  const [toClose, setToClose] = useState<Account | null>(null);

  useEffect(() => {
    if (currentUser?.id) fetchWallet(currentUser.id);
  }, [currentUser?.id]);

  const groups = groupAccountsWithChildren(summary.accounts);
  const activeCount = summary.accounts.filter((a) => !a.is_archived).length;
  const otherAccounts = toClose ? summary.accounts.filter((a) => a.id !== toClose.id && !a.is_archived) : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Comptes & Mobile Money</Text>
          <Text style={styles.subtitle}>Vos portefeuilles, coffres et épargnes</Text>
        </View>
        <Pressable onPress={() => setShowAdd(true)} accessibilityRole="button" style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}>
          <Plus size={18} color={colors.text.inverted} />
          <Text style={styles.addText}>Nouveau</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => {
          if (currentUser) fetchWallet(currentUser.id);
        }} />}
        onTouchStart={recordActivity}
      >
        {/* Totaux */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>PATRIMOINE TOTAL</Text>
            <View style={styles.countPill}>
              <ShieldCheck size={12} color={colors.primary.container} />
              <Text style={styles.countText}>
                {activeCount} compte{activeCount > 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <Text style={styles.heroAmount}>
            {amountParts(summary.totalBalance)}
            <Text style={styles.heroUnit}> FCFA</Text>
          </Text>
          <View style={styles.split}>
            <View style={styles.splitBox}>
              <View style={styles.splitHead}>
                <CircleCheck size={14} color={colors.primary.container} />
                <Text style={styles.splitLabel}>Immédiat</Text>
              </View>
              <Text style={styles.splitAmount}>{formatFCFA(summary.liquidBalance)}</Text>
              <Text style={styles.splitHint}>Libre pour dépenses</Text>
            </View>
            <View style={[styles.splitBox, styles.splitBoxWarm]}>
              <View style={styles.splitHead}>
                <PiggyBank size={14} color={colors.accent.warning} />
                <Text style={[styles.splitLabel, { color: colors.accent.warning }]}>Réservé / Épargne</Text>
              </View>
              <Text style={styles.splitAmount}>{formatFCFA(summary.lockedBalance)}</Text>
              <Text style={[styles.splitHint, { color: colors.accent.warningBorder }]}>Coffres & épargnes</Text>
            </View>
          </View>
          <View style={styles.heroFoot}>
            <Text style={styles.heroFootText}>Équilibrer vos soldes sans impacter le budget</Text>
            <Pressable
              onPress={() => setTransferFrom('')}
              accessibilityRole="button"
              style={({ pressed }) => [styles.transferBtn, pressed && { opacity: 0.85 }]}
            >
              <ArrowLeftRight size={16} color={colors.primary.DEFAULT} />
              <Text style={styles.transferText}>Virement interne</Text>
            </Pressable>
          </View>
        </View>

        {/* Liste */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mes portefeuilles actifs</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{activeCount}</Text>
          </View>
        </View>

        {groups.length === 0 ? (
          <View style={styles.empty}>
            <Wallet size={32} color={colors.text.muted} />
            <Text style={styles.emptyText}>Aucun compte actif. Ajoutez votre premier portefeuille.</Text>
          </View>
        ) : null}

        {groups.map(({ account, children }) => {
          const brand = ACCOUNT_BRAND[account.type];
          const Icon = TYPE_ICON[account.type];
          const locked = account.sub_type !== 'MAIN';
          return (
            <View key={account.id} style={styles.card}>
              <View style={styles.cardHead}>
                <View style={[styles.cardIcon, { backgroundColor: brand.bg }]}>
                  <Icon size={24} color={brand.fg} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName} numberOfLines={1}>{account.name}</Text>
                  <View style={[styles.pill, { backgroundColor: brand.bg }]}>
                    <Text style={[styles.pillText, { color: brand.fg }]}>{ACCOUNT_TYPE_LABELS[account.type]}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.cardAmount, account.balance < 0 && { color: colors.accent.danger }]}>
                    {amountParts(account.balance)}
                    <Text style={styles.cardUnit}> FCFA</Text>
                  </Text>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, locked && { backgroundColor: colors.accent.warning }]} />
                    <Text style={[styles.statusText, locked && { color: colors.accent.warning }]}>{locked ? 'Bloqué' : 'Dispo direct'}</Text>
                  </View>
                </View>
              </View>

              {children.map((child) => (
                <View key={child.id} style={styles.child}>
                  <View style={styles.childIcon}>
                    {child.sub_type === 'VAULT' ? <Lock size={16} color={colors.accent.warning} /> : <PiggyBank size={16} color={colors.accent.warning} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.childName} numberOfLines={1}>{child.name}</Text>
                    <Text style={styles.childHint}>{child.sub_type === 'VAULT' ? 'Coffre · hors dépenses' : 'Épargne'}</Text>
                  </View>
                  <Text style={styles.childAmount}>{formatFCFA(child.balance)}</Text>
                  <Pressable onPress={() => setTransferFrom(child.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Virer depuis ${child.name}`} style={styles.childAction}>
                    <ArrowLeftRight size={16} color={colors.primary.DEFAULT} />
                  </Pressable>
                  <Pressable onPress={() => setToClose(child)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Clôturer ${child.name}`} style={styles.childAction}>
                    <Archive size={16} color={colors.text.secondary} />
                  </Pressable>
                </View>
              ))}

              <View style={styles.actions}>
                <Pressable onPress={() => setTransferFrom(account.id)} accessibilityRole="button" accessibilityLabel={`Virement depuis ${account.name}`} style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}>
                  <ArrowLeftRight size={15} color={colors.primary.DEFAULT} />
                  <Text style={styles.actionText}>Virement</Text>
                </Pressable>
                <Pressable onPress={() => setToClose(account)} accessibilityRole="button" accessibilityLabel={`Clôturer ${account.name}`} style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}>
                  <Archive size={15} color={colors.text.secondary} />
                  <Text style={[styles.actionText, { color: colors.text.secondary }]}>Clôturer</Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        <View style={styles.info}>
          <ShieldHalf size={20} color={colors.primary.DEFAULT} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Virements neutres</Text>
            <Text style={styles.infoText}>
              Un virement entre vos comptes ne compte ni comme dépense ni comme revenu : vos bilans restent justes. Un compte
              clôturé est archivé, son historique est conservé.
            </Text>
          </View>
        </View>
      </ScrollView>

      <AddAccountModal visible={showAdd} onClose={() => setShowAdd(false)} />
      <TransferModal visible={transferFrom !== null} initialFromId={transferFrom || undefined} onClose={() => setTransferFrom(null)} />
      <DeleteAccountModal
        visible={!!toClose}
        account={toClose}
        otherAccounts={otherAccounts}
        onClose={() => setToClose(null)}
        onSuccess={() => {
          if (currentUser) fetchWallet(currentUser.id);
        }}
      />
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
  title: { fontSize: typography.sizes.title, fontWeight: typography.weights.extrabold, color: colors.primary.dark },
  subtitle: { fontSize: typography.sizes.bodySm, color: colors.text.secondary },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary.DEFAULT, borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  addText: { color: colors.text.inverted, fontWeight: typography.weights.bold, fontSize: typography.sizes.body },
  content: { padding: spacing.base, paddingBottom: spacing.xxl, gap: spacing.md },
  hero: { backgroundColor: colors.primary.DEFAULT, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.md },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { fontSize: typography.sizes.bodySm, letterSpacing: 1, color: colors.primary.container },
  countPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary.light, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.full },
  countText: { fontSize: typography.sizes.caption, color: colors.primary.container },
  heroAmount: { fontSize: 36, fontWeight: typography.weights.extrabold, color: colors.text.inverted, marginTop: -spacing.xs },
  heroUnit: { fontSize: typography.sizes.title, fontWeight: typography.weights.semibold, color: colors.primary.container },
  split: { flexDirection: 'row', gap: spacing.sm },
  splitBox: { flex: 1, backgroundColor: colors.primary.dark, borderRadius: radii.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.primary.light },
  splitBoxWarm: { borderColor: 'rgba(245, 158, 11, 0.45)' },
  splitHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  splitLabel: { fontSize: typography.sizes.caption, color: colors.primary.container, fontWeight: typography.weights.semibold },
  splitAmount: { marginTop: 4, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text.inverted },
  splitHint: { fontSize: typography.sizes.caption, color: colors.primary.container },
  heroFoot: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.primary.light, paddingTop: spacing.md },
  heroFootText: { flex: 1, fontSize: typography.sizes.caption, color: colors.primary.container },
  transferBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary.container, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md },
  transferText: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.bold, color: colors.primary.DEFAULT },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  sectionTitle: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text.primary },
  badge: { backgroundColor: colors.brands.waveBg, borderRadius: radii.full, minWidth: 24, paddingHorizontal: 6, alignItems: 'center' },
  badgeText: { fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, color: colors.text.primary },
  empty: { alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface.card, borderRadius: radii.lg, padding: spacing.xl },
  emptyText: { color: colors.text.secondary, textAlign: 'center' },
  card: { backgroundColor: colors.surface.card, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.surface.border, padding: spacing.base, gap: spacing.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardIcon: { width: 48, height: 48, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text.primary },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 1, borderRadius: radii.sm, marginTop: 2 },
  pillText: { fontSize: 10, fontWeight: typography.weights.bold },
  cardAmount: { fontSize: typography.sizes.title, fontWeight: typography.weights.extrabold, color: colors.text.primary },
  cardUnit: { fontSize: typography.sizes.caption, fontWeight: typography.weights.medium, color: colors.text.secondary },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary.DEFAULT },
  statusText: { fontSize: typography.sizes.caption, color: colors.primary.DEFAULT, fontWeight: typography.weights.semibold },
  child: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.brands.waveBg, borderRadius: radii.lg, padding: spacing.sm },
  childIcon: { width: 32, height: 32, borderRadius: radii.md, backgroundColor: colors.accent.warningBg, alignItems: 'center', justifyContent: 'center' },
  childName: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold, color: colors.text.primary },
  childHint: { fontSize: typography.sizes.caption, color: colors.text.secondary },
  childAmount: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.bold, color: colors.primary.DEFAULT },
  childAction: { padding: 6 },
  actions: { flexDirection: 'row', gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.surface.border, paddingTop: spacing.md },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.sm, borderRadius: radii.md, backgroundColor: colors.brands.waveBg },
  actionText: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold, color: colors.primary.DEFAULT },
  info: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.primary.subtle, borderRadius: radii.xl, padding: spacing.base, borderWidth: 1, borderColor: colors.primary.container },
  infoTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.primary.dark },
  infoText: { marginTop: 2, fontSize: typography.sizes.bodySm, lineHeight: 19, color: colors.text.secondary },
});
