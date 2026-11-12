/**
 * Dettes & Créances — GERETOU
 * Maquette Stitch « Dettes, Créances & Engagements ».
 */

import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, Pressable, StyleSheet, RefreshControl, Linking, Platform } from 'react-native';
import { ArrowLeft, Plus, Scale, ArrowDown, ArrowUp, CirclePlus, MessageCircle, MessageSquare, CircleCheck, TriangleAlert, ReceiptText, Trash2, HandCoins } from 'lucide-react-native';
import { MoneyActionModal } from '../../components/common/MoneyActionModal';
import { DebtEditorModal } from '../../components/debts/DebtEditorModal';
import { BudgetGauge } from '../../components/budget/BudgetGauge';
import { useAuthStore } from '../../store/useAuthStore';
import { useCommitmentStore } from '../../store/useCommitmentStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useNavStore } from '../../store/useNavStore';
import { showToast } from '../../store/useToastStore';
import { DebtType, initials, netBalance, normalizePhone, reminderMessage, repaidRatio, smsUrl, whatsappUrl } from '../../services/debts/debtCore';
import { DebtRecord } from '../../services/debts/debtRepo';
import { daysUntil, dueLabel } from '../../services/agenda/deadlineCore';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

type Tab = 'CREDIT' | 'DEBT' | 'SETTLED';
const num = (n: number) => formatFCFA(n).replace(' FCFA', '');

export const DebtsScreen: React.FC = () => {
  const { currentUser, recordActivity } = useAuthStore();
  const { debts, refresh, isLoading, repay, removeDebt } = useCommitmentStore();
  const { summary, fetchWallet } = useWalletStore();
  const { goBack } = useNavStore();
  const [tab, setTab] = useState<Tab>('CREDIT');
  const [editorType, setEditorType] = useState<DebtType | null>(null);
  const [paying, setPaying] = useState<DebtRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const uid = currentUser?.id ?? '';
  const accounts = summary.accounts.filter((a) => !a.is_archived);

  useEffect(() => {
    if (!uid) return;
    refresh(uid);
    fetchWallet(uid);
  }, [uid]);

  const open = debts.filter((d) => d.status !== 'SETTLED');
  const credits = open.filter((d) => d.type === 'CREDIT');
  const owed = open.filter((d) => d.type === 'DEBT');
  const settled = debts.filter((d) => d.status === 'SETTLED');
  const { owedToMe, iOwe, net } = netBalance(debts);
  const list = tab === 'CREDIT' ? credits : tab === 'DEBT' ? owed : settled;
  const now = new Date();

  const remind = async (d: DebtRecord, channel: 'whatsapp' | 'sms') => {
    recordActivity();
    const phone = normalizePhone(d.phone_number);
    if (!phone) return showToast({ kind: 'error', title: 'Numéro manquant', message: 'Ajoutez un numéro valide pour relancer.' });
    const msg = reminderMessage(d.person_name, d.remaining_amount, d.due_date);
    const url = channel === 'whatsapp' ? whatsappUrl(phone, msg) : smsUrl(phone, msg, Platform.OS === 'ios');
    try {
      await Linking.openURL(url);
    } catch {
      showToast({ kind: 'error', title: 'Ouverture impossible', message: channel === 'whatsapp' ? "WhatsApp n'est pas disponible sur cet appareil." : "Les SMS ne sont pas disponibles sur cet appareil." });
    }
  };

  const remove = async (d: DebtRecord) => {
    if (confirmDelete !== d.id) return setConfirmDelete(d.id);
    const failure = await removeDebt(uid, d.id);
    setConfirmDelete(null);
    showToast(failure ? { kind: 'error', title: 'Suppression impossible', message: failure } : { kind: 'info', title: 'Engagement supprimé', message: "Les mouvements d'argent déjà faits ne sont pas annulés." });
  };

  const renderCard = (d: DebtRecord) => {
    const isCredit = d.type === 'CREDIT';
    const days = d.due_date ? daysUntil(d.due_date, now) : null;
    const urgent = d.status !== 'SETTLED' && days !== null && days <= 5;
    const late = days !== null && days < 0 && d.status !== 'SETTLED';
    const ratio = repaidRatio(d.initial_amount, d.remaining_amount);
    const repaid = d.initial_amount - d.remaining_amount;
    const color = isCredit ? colors.primary.DEFAULT : colors.accent.danger;
    const statusText =
      d.status === 'SETTLED'
        ? 'Soldé'
        : late
          ? `En retard · ${dueLabel(d.due_date!, now)}`
          : d.due_date
            ? `${urgent ? 'Urgent' : 'En cours'} · ${dueLabel(d.due_date, now)}`
            : d.status === 'PARTIAL'
              ? 'Remboursement en cours'
              : 'En attente';
    return (
      <View key={d.id} style={[styles.card, (urgent || late) && !isCredit && styles.cardUrgent]}>
        <View style={styles.cardHead}>
          <View style={[styles.avatar, { backgroundColor: isCredit ? colors.primary.container : colors.accent.dangerBg }]}>
            <Text style={[styles.avatarText, { color }]}>{initials(d.person_name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {isCredit ? 'Prêt à' : 'Dû à'} {d.person_name}
            </Text>
            {d.notes ? <Text style={styles.cardSub} numberOfLines={2}>{d.notes}</Text> : null}
          </View>
          <View style={[styles.statusPill, { backgroundColor: d.status === 'SETTLED' ? colors.primary.container : urgent || late ? colors.accent.dangerBg : colors.accent.warningBg }]}>
            <Text style={[styles.statusText, { color: d.status === 'SETTLED' ? colors.primary.DEFAULT : urgent || late ? colors.accent.danger : '#B45309' }]} numberOfLines={2}>
              {statusText}
            </Text>
          </View>
        </View>
        <View style={styles.amountBox}>
          <View style={styles.amountRow}>
            <Text style={[styles.amountLabel, !isCredit && { color: colors.accent.danger }]}>{d.status === 'SETTLED' ? 'Montant total' : isCredit ? 'Reste dû' : 'Reste à verser'}</Text>
            <Text style={[styles.amount, { color }]}>
              {!isCredit && d.status !== 'SETTLED' ? '-' : ''}
              {num(d.status === 'SETTLED' ? d.initial_amount : d.remaining_amount)}
              <Text style={styles.amountUnit}> FCFA</Text>
            </Text>
          </View>
          <BudgetGauge ratio={ratio} status={isCredit || ratio >= 1 ? 'healthy' : 'warning'} height={8} />
          <View style={styles.amountRow}>
            <Text style={styles.small}>
              {isCredit ? 'Remboursé' : 'Versé'} : {formatFCFA(repaid)} ({Math.round(ratio * 100)} %)
            </Text>
            <Text style={styles.small}>Total : {formatFCFA(d.initial_amount)}</Text>
          </View>
        </View>
        {d.status !== 'SETTLED' ? (
          <View style={styles.actions}>
            <Pressable onPress={() => setPaying(d)} accessibilityRole="button" accessibilityLabel={isCredit ? `Encaisser un retour de ${d.person_name}` : `Verser à ${d.person_name}`} style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}>
              {isCredit ? <CirclePlus size={16} color={colors.text.inverted} /> : <HandCoins size={16} color={colors.text.inverted} />}
              <Text style={styles.primaryText}>{isCredit ? 'Encaisser un retour' : 'Faire un versement'}</Text>
            </Pressable>
            {isCredit ? (
              <>
                <Pressable onPress={() => remind(d, 'whatsapp')} accessibilityRole="button" accessibilityLabel={`Relancer ${d.person_name} sur WhatsApp`} style={({ pressed }) => [styles.icon, pressed && { opacity: 0.7 }]}>
                  <MessageCircle size={18} color={colors.primary.DEFAULT} />
                </Pressable>
                <Pressable onPress={() => remind(d, 'sms')} accessibilityRole="button" accessibilityLabel={`Relancer ${d.person_name} par SMS`} style={({ pressed }) => [styles.icon, pressed && { opacity: 0.7 }]}>
                  <MessageSquare size={18} color={colors.primary.DEFAULT} />
                </Pressable>
              </>
            ) : null}
            {d.remaining_amount === d.initial_amount ? (
              <Pressable onPress={() => remove(d)} accessibilityRole="button" accessibilityLabel={confirmDelete === d.id ? 'Confirmer la suppression' : 'Supprimer'} style={[styles.icon, confirmDelete === d.id && { backgroundColor: colors.accent.danger }]}>
                <Trash2 size={18} color={confirmDelete === d.id ? colors.text.inverted : colors.accent.danger} />
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.settled}>
            <CircleCheck size={14} color={colors.primary.DEFAULT} />
            <Text style={styles.settledText}>Entièrement {isCredit ? 'remboursé' : 'réglée'}</Text>
          </View>
        )}
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
          <Text style={styles.title}>Dettes & Créances</Text>
          <Text style={styles.subtitle}>Engagements et argent prêté</Text>
        </View>
        <Pressable onPress={() => setEditorType(tab === 'DEBT' ? 'DEBT' : 'CREDIT')} accessibilityRole="button" style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}>
          <Plus size={18} color={colors.text.inverted} />
          <Text style={styles.addText}>Nouveau</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => { if (uid) refresh(uid); }} />} onTouchStart={recordActivity}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.inline}>
              <Scale size={16} color={colors.primary.container} />
              <Text style={styles.heroLabel}>SOLDE NET ENGAGÉ</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>{net >= 0 ? 'En votre faveur' : 'Vous devez plus'}</Text>
            </View>
          </View>
          <Text style={styles.heroAmount}>
            {net > 0 ? '+' : net < 0 ? '-' : ''}
            {num(Math.abs(net))}
            <Text style={styles.heroUnit}> FCFA</Text>
          </Text>
          <View style={styles.split}>
            <View style={styles.splitBox}>
              <View style={styles.splitHead}>
                <Text style={styles.splitLabel}>Créances (dû à vous)</Text>
                <ArrowDown size={14} color={colors.primary.container} />
              </View>
              <Text style={styles.splitAmount}>+{num(owedToMe)} <Text style={styles.splitUnit}>FCFA</Text></Text>
              <Text style={styles.splitHint}>{credits.length} personne{credits.length > 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.splitBox}>
              <View style={styles.splitHead}>
                <Text style={styles.splitLabel}>Dettes (vous devez)</Text>
                <ArrowUp size={14} color={colors.primary.container} />
              </View>
              <Text style={styles.splitAmount}>{iOwe > 0 ? '-' : ''}{num(iOwe)} <Text style={styles.splitUnit}>FCFA</Text></Text>
              <Text style={styles.splitHint}>{owed.length} créancier{owed.length > 1 ? 's' : ''}</Text>
            </View>
          </View>
        </View>

        <View style={styles.tabs}>
          {([
            { k: 'CREDIT', l: `Créances (${credits.length})` },
            { k: 'DEBT', l: `Dettes (${owed.length})` },
            { k: 'SETTLED', l: `Soldées (${settled.length})` },
          ] as const).map(({ k, l }) => (
            <Pressable key={k} onPress={() => setTab(k)} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} style={[styles.tab, tab === k && styles.tabOn]}>
              <Text style={[styles.tabText, tab === k && styles.tabTextOn]}>{l}</Text>
            </Pressable>
          ))}
        </View>

        {list.length === 0 ? (
          <View style={styles.empty}>
            <HandCoins size={30} color={colors.text.muted} />
            <Text style={styles.emptyText}>
              {tab === 'CREDIT' ? "Personne ne vous doit d'argent." : tab === 'DEBT' ? 'Aucune dette en cours.' : 'Aucun engagement soldé pour le moment.'}
            </Text>
            {tab !== 'SETTLED' ? (
              <Pressable onPress={() => setEditorType(tab)} accessibilityRole="button">
                <Text style={styles.emptyLink}>{tab === 'CREDIT' ? 'Enregistrer un prêt' : 'Enregistrer une dette'}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          list.map(renderCard)
        )}

        <View style={styles.info}>
          <ReceiptText size={20} color={colors.primary.DEFAULT} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Principe de transparence</Text>
            <Text style={styles.infoText}>
              Prêter, emprunter et rembourser ne sont ni des dépenses ni des revenus : vos budgets et bilans restent justes. Seuls vos
              soldes de comptes bougent, au moment des mouvements réels.
            </Text>
          </View>
        </View>
      </ScrollView>

      <DebtEditorModal visible={editorType !== null} initialType={editorType ?? 'CREDIT'} onClose={() => setEditorType(null)} />
      <MoneyActionModal
        visible={!!paying}
        title={paying?.type === 'CREDIT' ? `Encaisser · ${paying?.person_name}` : `Verser · ${paying?.person_name}`}
        subtitle={paying ? `Reste ${formatFCFA(paying.remaining_amount)}` : undefined}
        amountLabel={paying?.type === 'CREDIT' ? 'Montant reçu' : 'Montant versé'}
        max={paying?.remaining_amount}
        presets={[1000, 5000, 10000, 25000]}
        accounts={accounts}
        accountLabel={paying?.type === 'CREDIT' ? "Sur quel compte arrive l'argent ?" : "Depuis quel compte payez-vous ?"}
        debit={paying?.type === 'DEBT'}
        allowNoAccount
        confirmLabel={(a) => (paying?.type === 'CREDIT' ? `Encaisser ${a > 0 ? formatFCFA(a) : ''}` : `Verser ${a > 0 ? formatFCFA(a) : ''}`)}
        onConfirm={async (amount, accountId) => {
          if (!paying) return null;
          const failure = await repay(uid, paying.id, amount, accountId);
          if (!failure) {
            const left = paying.remaining_amount - amount;
            showToast({ kind: 'success', title: left <= 0 ? 'Engagement soldé' : 'Remboursement enregistré', message: left <= 0 ? `${paying.person_name} : plus rien à ${paying.type === 'CREDIT' ? 'recevoir' : 'verser'}.` : `Reste ${formatFCFA(left)}.` });
          }
          return failure;
        }}
        onClose={() => setPaying(null)}
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
  hero: { backgroundColor: colors.primary.DEFAULT, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.md },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { fontSize: typography.sizes.caption, letterSpacing: 1, color: colors.primary.container, fontWeight: typography.weights.semibold },
  heroPill: { borderWidth: 1, borderColor: colors.primary.light, borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  heroPillText: { fontSize: typography.sizes.caption, color: colors.primary.container },
  heroAmount: { fontSize: 34, fontWeight: typography.weights.extrabold, color: colors.text.inverted },
  heroUnit: { fontSize: typography.sizes.title, fontWeight: typography.weights.medium, color: colors.primary.container },
  split: { flexDirection: 'row', gap: spacing.sm },
  splitBox: { flex: 1, backgroundColor: colors.primary.dark, borderRadius: radii.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.primary.light },
  splitHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  splitLabel: { fontSize: typography.sizes.caption, color: colors.primary.container, flexShrink: 1 },
  splitAmount: { marginTop: 4, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text.inverted },
  splitUnit: { fontSize: typography.sizes.caption, fontWeight: typography.weights.medium },
  splitHint: { fontSize: typography.sizes.caption, color: colors.primary.container },
  tabs: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.full, backgroundColor: colors.brands.waveBg },
  tabOn: { backgroundColor: colors.primary.DEFAULT },
  tabText: { fontSize: typography.sizes.bodySm, color: colors.text.primary },
  tabTextOn: { color: colors.text.inverted, fontWeight: typography.weights.bold },
  card: { backgroundColor: colors.surface.card, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.surface.border, padding: spacing.base, gap: spacing.md },
  cardUrgent: { borderLeftWidth: 4, borderLeftColor: colors.accent.danger },
  cardHead: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
  cardTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text.primary },
  cardSub: { fontSize: typography.sizes.bodySm, color: colors.text.secondary },
  statusPill: { maxWidth: 130, borderRadius: radii.md, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  statusText: { fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  amountBox: { borderWidth: 1, borderColor: colors.surface.border, borderRadius: radii.lg, padding: spacing.md, gap: spacing.sm },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  amountLabel: { fontSize: typography.sizes.bodySm, color: colors.text.secondary },
  amount: { fontSize: 28, fontWeight: typography.weights.extrabold },
  amountUnit: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.medium },
  small: { fontSize: typography.sizes.caption, color: colors.text.secondary },
  actions: { flexDirection: 'row', gap: spacing.sm },
  primary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, borderRadius: radii.md, backgroundColor: colors.primary.DEFAULT, paddingHorizontal: spacing.sm },
  primaryText: { color: colors.text.inverted, fontWeight: typography.weights.bold, fontSize: typography.sizes.bodySm },
  icon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.brands.waveBg, alignItems: 'center', justifyContent: 'center' },
  settled: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.primary.subtle, borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: 4 },
  settledText: { fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, color: colors.primary.DEFAULT },
  empty: { alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface.card, borderRadius: radii.xl, padding: spacing.xl },
  emptyText: { fontSize: typography.sizes.bodySm, color: colors.text.secondary, textAlign: 'center' },
  emptyLink: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.primary.DEFAULT },
  info: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.brands.waveBg, borderRadius: radii.xl, padding: spacing.base },
  infoTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text.primary },
  infoText: { marginTop: 2, fontSize: typography.sizes.bodySm, lineHeight: 19, color: colors.text.secondary },
});
