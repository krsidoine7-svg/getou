/**
 * Réglages des notifications — GERETOU
 * Maquette Stitch « Notifications Push & Centre d'Alertes ».
 */

import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, Pressable, Switch, StyleSheet, ActivityIndicator } from 'react-native';
import { ArrowLeft, BellRing, Lock, ReceiptText, ChartPie, CloudUpload, EyeOff, Send, ShieldCheck, Smartphone, Sparkles } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useAlertStore } from '../../store/useAlertStore';
import { useAgendaStore } from '../../store/useAgendaStore';
import { useNavStore } from '../../store/useNavStore';
import { showToast } from '../../store/useToastStore';
import { AlertPrefs, maskAmounts } from '../../services/alerts/alertCore';
import { notificationPermission, notificationsSupported, notifyNow, requestNotificationPermission } from '../../services/agenda/deadlineNotifications';
import { colors, radii, spacing, typography } from '../../theme/tokens';

type Permission = Awaited<ReturnType<typeof notificationPermission>>;

const GROUPS: { title: string; Icon: typeof BellRing; items: { key: keyof AlertPrefs; label: string; hint: string }[] }[] = [
  {
    title: 'Factures & échéances',
    Icon: ReceiptText,
    items: [{ key: 'deadlineReminders', label: "Rappels d'échéances", hint: "À l'heure et au moment choisis pour chaque échéance (jour J, veille…)" }],
  },
  {
    title: 'Dépenses & plafonds',
    Icon: ChartPie,
    items: [
      { key: 'budgetThreshold', label: "Alerte au seuil d'un plafond", hint: 'Dès que 80, 85 ou 90 % du plafond est atteint' },
      { key: 'budgetOver', label: 'Alerte de dépassement 100 %', hint: 'Dès qu’un plafond est dépassé' },
    ],
  },
  {
    title: 'Coach Financier Nouchi (Motivation & Rappels)',
    Icon: Sparkles,
    items: [
      {
        key: 'coachIncome',
        label: "Rappels d'épargne après entrée de djaï",
        hint: 'Conseils nouchi motivants dès qu’une entrée d’argent est enregistrée',
      },
      {
        key: 'coachStaleProjects',
        label: 'Rappels projets sans avancement',
        hint: 'Notification stimulante quand un projet actif dort depuis plusieurs jours',
      },
      {
        key: 'coachShoppingList',
        label: 'Rappels courses & réapprovisionnements',
        hint: 'Alerte pour ravitailler la maison avant d’être à sec',
      },
    ],
  },
  {
    title: 'Sauvegardes',
    Icon: CloudUpload,
    items: [{ key: 'backupSuccess', label: 'Sauvegarde Google Drive réussie', hint: 'Notification discrète après chaque synchronisation' }],
  },
];

export const NotificationSettingsScreen: React.FC = () => {
  const { currentUser, recordActivity } = useAuthStore();
  const { prefs, loadPrefs, updatePrefs, alerts, refresh } = useAlertStore();
  const { rescheduleAll } = useAgendaStore();
  const { goBack } = useNavStore();
  const [permission, setPermission] = useState<Permission>('unsupported');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadPrefs();
    notificationPermission().then(setPermission).catch(() => setPermission('unsupported'));
    if (currentUser?.id) refresh(currentUser.id);
  }, [currentUser?.id]);

  const toggle = async (key: keyof AlertPrefs, value: boolean) => {
    recordActivity();
    await updatePrefs({ [key]: value });
    // Les rappels déjà programmés suivent le nouveau réglage (activation, texte masqué)
    if ((key === 'deadlineReminders' || key === 'hideAmounts') && currentUser) await rescheduleAll(currentUser.id);
  };

  const allow = async () => {
    const ok = await requestNotificationPermission();
    setPermission(await notificationPermission());
    if (!ok) showToast({ kind: 'error', title: 'Notifications refusées', message: 'Activez-les dans les réglages du téléphone pour GERETOU.' });
  };

  const sendTest = async () => {
    setBusy(true);
    const ok = await notifyNow(
      'Coach Nouchi : Test de notification 💰',
      'Tu as eu le djaï ! Tu ne vas pas garder quoi ? Ou bien tu veux faire paiya inconscient là ?'
    );
    setBusy(false);
    showToast(ok ? { kind: 'success', title: 'Notification envoyée', message: 'Regardez la barre de notifications du téléphone.' } : { kind: 'error', title: 'Envoi impossible', message: "Autorisez d'abord les notifications." });
  };

  const preview = alerts.slice(0, 3);
  const permissionOn = permission === 'granted';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Retour">
          <ArrowLeft size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>Notifications & alertes</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} onTouchStart={recordActivity}>
        <View style={styles.hero}>
          <View style={styles.heroHead}>
            <View style={styles.heroIcon}>
              <BellRing size={20} color={colors.primary.container} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroKicker}>NOTIFICATIONS LOCALES</Text>
              <Text style={styles.heroTitle}>Sans serveur, même hors connexion</Text>
            </View>
            <View style={[styles.statePill, !permissionOn && { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <View style={[styles.stateDot, !permissionOn && { backgroundColor: colors.accent.warning }]} />
              <Text style={styles.stateText}>{permission === 'unsupported' ? 'Téléphone' : permissionOn ? 'Actif' : 'Inactif'}</Text>
            </View>
          </View>
          <Text style={styles.heroText}>
            Les rappels sont programmés et déclenchés par votre téléphone : aucune donnée ne passe par un serveur.
          </Text>
          <View style={styles.heroFoot}>
            <Text style={styles.heroFootText}>Autoriser les notifications</Text>
            {permission === 'unsupported' ? (
              <View style={styles.inline}>
                <Smartphone size={14} color={colors.primary.container} />
                <Text style={styles.heroNote}>Sur téléphone uniquement</Text>
              </View>
            ) : (
              <Switch
                value={permissionOn}
                onValueChange={(v) => {
                  if (v) allow();
                }}
                disabled={permissionOn}
                trackColor={{ false: 'rgba(255,255,255,0.25)', true: colors.accent.success }}
                accessibilityLabel="Autoriser les notifications"
              />
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Aperçu (écran verrouillé)</Text>
        <View style={styles.lock}>
          <Lock size={16} color="rgba(255,255,255,0.6)" />
          <Text style={styles.lockTime}>{new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>
          {preview.length === 0 ? (
            <Text style={styles.lockEmpty}>Vos prochaines alertes apparaîtront ainsi.</Text>
          ) : (
            preview.map((a) => (
              <View key={a.id} style={styles.lockCard}>
                <View style={styles.lockHead}>
                  <View style={styles.gBadge}>
                    <Text style={styles.gText}>G</Text>
                  </View>
                  <Text style={styles.lockApp}>GERETOU</Text>
                  {a.level === 'CRITICAL' ? <Text style={styles.lockUrgent}>Urgent</Text> : null}
                </View>
                <Text style={styles.lockTitle} numberOfLines={1}>{maskAmounts(a.title, prefs.hideAmounts)}</Text>
                <Text style={styles.lockBody} numberOfLines={2}>{maskAmounts(a.body, prefs.hideAmounts)}</Text>
              </View>
            ))
          )}
        </View>

        <Text style={styles.sectionTitle}>Alertes à recevoir</Text>
        {GROUPS.map(({ title, Icon, items }) => (
          <View key={title} style={styles.group}>
            <View style={styles.groupHead}>
              <View style={styles.groupIcon}>
                <Icon size={18} color={colors.primary.DEFAULT} />
              </View>
              <Text style={styles.groupTitle}>{title}</Text>
            </View>
            {items.map((it, i) => (
              <View key={it.key} style={[styles.item, i < items.length - 1 && styles.itemDivider]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemLabel}>{it.label}</Text>
                  <Text style={styles.itemHint}>{it.hint}</Text>
                </View>
                <Switch value={prefs[it.key]} onValueChange={(v) => toggle(it.key, v)} trackColor={{ false: colors.surface.border, true: colors.primary.DEFAULT }} accessibilityLabel={it.label} />
              </View>
            ))}
          </View>
        ))}

        <View style={styles.group}>
          <View style={styles.groupHead}>
            <View style={styles.groupIcon}>
              <EyeOff size={18} color={colors.primary.DEFAULT} />
            </View>
            <Text style={styles.groupTitle}>Confidentialité</Text>
          </View>
          <View style={styles.item}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemLabel}>Masquer les montants sur l'écran verrouillé</Text>
              <Text style={styles.itemHint}>Affiche « ••• » au lieu de « 28 000 FCFA » dans les notifications</Text>
            </View>
            <Switch value={prefs.hideAmounts} onValueChange={(v) => toggle('hideAmounts', v)} trackColor={{ false: colors.surface.border, true: colors.primary.DEFAULT }} accessibilityLabel="Masquer les montants" />
          </View>
        </View>

        <Pressable onPress={sendTest} disabled={!notificationsSupported || busy} accessibilityRole="button" style={({ pressed }) => [styles.test, (!notificationsSupported || busy) && { opacity: 0.5 }, pressed && { opacity: 0.8 }]}>
          {busy ? <ActivityIndicator color={colors.primary.DEFAULT} /> : <Send size={18} color={colors.primary.DEFAULT} />}
          <Text style={styles.testText}>{notificationsSupported ? 'Envoyer une notification de test' : 'Notification de test : sur téléphone uniquement'}</Text>
        </Pressable>

        <View style={styles.info}>
          <ShieldCheck size={18} color={colors.primary.DEFAULT} />
          <Text style={styles.infoText}>
            Le journal des alertes reste disponible dans l'app même si les notifications sont désactivées.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.canvas },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.base, paddingVertical: spacing.md, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.surface.border },
  title: { flex: 1, fontSize: typography.sizes.title, fontWeight: typography.weights.bold, color: colors.text.primary },
  content: { padding: spacing.base, paddingBottom: spacing.xxl, gap: spacing.md },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hero: { backgroundColor: colors.primary.DEFAULT, borderRadius: radii.xl, padding: spacing.base, gap: spacing.md },
  heroHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.primary.light, alignItems: 'center', justifyContent: 'center' },
  heroKicker: { fontSize: typography.sizes.caption, letterSpacing: 0.8, color: colors.primary.container, fontWeight: typography.weights.semibold },
  heroTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text.inverted },
  statePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary.light, borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  stateDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent.success },
  stateText: { fontSize: typography.sizes.caption, color: colors.text.inverted, fontWeight: typography.weights.semibold },
  heroText: { fontSize: typography.sizes.bodySm, lineHeight: 19, color: colors.primary.container },
  heroFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.primary.light, paddingTop: spacing.md },
  heroFootText: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text.inverted },
  heroNote: { fontSize: typography.sizes.caption, color: colors.primary.container },
  sectionTitle: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text.primary, marginTop: spacing.sm },
  lock: { backgroundColor: '#1E293B', borderRadius: radii.xl, padding: spacing.base, gap: spacing.sm, alignItems: 'stretch' },
  lockTime: { alignSelf: 'center', fontSize: 32, fontWeight: typography.weights.bold, color: colors.text.inverted },
  lockEmpty: { color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontSize: typography.sizes.bodySm, paddingVertical: spacing.md },
  lockCard: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: radii.lg, padding: spacing.md, gap: 2 },
  lockHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gBadge: { width: 20, height: 20, borderRadius: 5, backgroundColor: colors.primary.DEFAULT, alignItems: 'center', justifyContent: 'center' },
  gText: { color: colors.text.inverted, fontSize: 11, fontWeight: typography.weights.bold },
  lockApp: { flex: 1, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, color: colors.text.secondary },
  lockUrgent: { fontSize: 10, fontWeight: typography.weights.bold, color: colors.accent.danger, backgroundColor: colors.accent.dangerBg, paddingHorizontal: 6, borderRadius: radii.sm },
  lockTitle: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.bold, color: colors.text.primary },
  lockBody: { fontSize: typography.sizes.caption, color: colors.text.secondary },
  group: { backgroundColor: colors.surface.card, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.surface.border, padding: spacing.base },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  groupIcon: { width: 34, height: 34, borderRadius: radii.md, backgroundColor: colors.primary.subtle, alignItems: 'center', justifyContent: 'center' },
  groupTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text.primary },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  itemDivider: { borderBottomWidth: 1, borderBottomColor: colors.surface.border },
  itemLabel: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text.primary },
  itemHint: { fontSize: typography.sizes.caption, color: colors.text.secondary, marginTop: 2 },
  test: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 52, borderRadius: radii.lg, backgroundColor: colors.primary.container },
  testText: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.primary.DEFAULT },
  info: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.brands.waveBg, borderRadius: radii.lg, padding: spacing.md },
  infoText: { flex: 1, fontSize: typography.sizes.bodySm, color: colors.text.secondary, lineHeight: 19 },
});
