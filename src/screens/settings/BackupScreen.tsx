/**
 * Sauvegarde & Synchronisation Google Drive — GERETOU
 * Maquette Stitch « Synchronisation & Sauvegarde Google Drive ».
 */

import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import {
  ArrowLeft,
  CloudUpload,
  CloudDownload,
  CircleCheck,
  TriangleAlert,
  LogOut,
  FolderLock,
  History,
  HardDrive,
  Wrench,
  ShieldCheck,
} from 'lucide-react-native';
import { useNavStore } from '../../store/useNavStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAlertStore } from '../../store/useAlertStore';
import { useGoogleSignIn } from '../../hooks/useGoogleSignIn';
import { GoogleSession, clearSession, isTokenValid, loadSession } from '../../services/google/googleSession';
import { SyncInfo, fetchRemoteBackup, getLastSync, restoreBackup, syncNow, IS_SYNC_UNDER_MAINTENANCE } from '../../services/backup/syncService';
import { BackupFile, summarizeBackup } from '../../services/backup/backupFormat';
import { DriveAuthError } from '../../services/backup/driveClient';
import { getDatabase } from '../../services/db/database';
import { realEmail } from '../../services/auth/identity';
import { colors, radii, spacing, typography } from '../../theme/tokens';

type Busy = null | 'signin' | 'sync' | 'check' | 'restore';

export function formatSyncDate(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return `Aujourd'hui, ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Hier, ${time}`;
  return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}, ${time}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(2).replace('.', ',')} Mo`;
}

const GoogleMark: React.FC = () => (
  <View style={styles.gMark}>
    <Text style={styles.gMarkText}>G</Text>
  </View>
);

export const BackupScreen: React.FC = () => {
  const goBack = useNavStore((s) => s.goBack);
  const { currentUser, recordActivity, initAuth, linkGoogleAccount } = useAuthStore();
  const { configured, signIn } = useGoogleSignIn();

  const [session, setSession] = useState<GoogleSession | null>(null);
  const [lastSync, setLastSync] = useState<SyncInfo | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [remote, setRemote] = useState<BackupFile | null>(null);

  useEffect(() => {
    loadSession().then(setSession);
    getLastSync().then(setLastSync);
  }, []);

  const fail = (e: unknown) => setMessage({ kind: 'error', text: e instanceof Error ? e.message : String(e) });

  /** Renvoie une session au jeton valide, en reconnectant si nécessaire. */
  const ensureSession = async (): Promise<GoogleSession | null> => {
    if (isTokenValid(session)) return session;
    setBusy('signin');
    const s = await signIn();
    if (s) {
      setSession(s);
      await linkGoogleAccount(s.email);
    }
    return s;
  };

  const connect = async () => {
    if (IS_SYNC_UNDER_MAINTENANCE) {
      setMessage({ kind: 'error', text: 'Le service de synchronisation Google Drive est actuellement en maintenance.' });
      return;
    }
    recordActivity();
    setMessage(null);
    try {
      setBusy('signin');
      const s = await signIn();
      if (s) {
        setSession(s);
        // Le profil local (invité ou non) est désormais rattaché à ce compte Google.
        await linkGoogleAccount(s.email);
        setMessage({ kind: 'ok', text: `Connecté à ${s.email}. Vous pouvez synchroniser.` });
      }
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const sync = async () => {
    if (IS_SYNC_UNDER_MAINTENANCE) {
      setMessage({ kind: 'error', text: 'Le service de synchronisation Google Drive est actuellement en maintenance.' });
      return;
    }
    recordActivity();
    setMessage(null);
    try {
      const s = await ensureSession();
      if (!s) return;
      setBusy('sync');
      await linkGoogleAccount(s.email);
      const info = await syncNow(s.accessToken, s.email);
      if (currentUser) await useAlertStore.getState().afterBackup(currentUser.id, s.email, info.bytes);
      setLastSync(info);
      setMessage({ kind: 'ok', text: 'Sauvegarde envoyée sur Google Drive.' });
    } catch (e) {
      if (e instanceof DriveAuthError) {
        await clearSession();
        setSession((prev) => (prev ? { ...prev, expiresAt: 0 } : prev));
      }
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const checkRemote = async () => {
    if (IS_SYNC_UNDER_MAINTENANCE) {
      setMessage({ kind: 'error', text: 'Le service de synchronisation Google Drive est actuellement en maintenance.' });
      return;
    }
    recordActivity();
    setMessage(null);
    try {
      const s = await ensureSession();
      if (!s) return;
      setBusy('check');
      const found = await fetchRemoteBackup(s.accessToken);
      if (!found) setMessage({ kind: 'error', text: 'Aucune sauvegarde trouvée sur ce compte Google.' });
      setRemote(found?.backup ?? null);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const confirmRestore = async () => {
    if (!remote) return;
    recordActivity();
    setMessage(null);
    try {
      setBusy('restore');
      // Même appareil : on conserve le PIN actuel (son empreinte dépend d'un secret local).
      const db = await getDatabase();
      const row = await db.getFirstAsync<{ pin_hash: string }>('SELECT pin_hash FROM users LIMIT 1;');
      if (!row) throw new Error('Aucun compte local trouvé.');
      await restoreBackup(remote, row.pin_hash);
      setRemote(null);
      // Recharge l'utilisateur restauré ; l'app se reverrouille par sécurité.
      await initAuth();
    } catch (e) {
      fail(e);
      setBusy(null);
    }
  };

  const disconnect = async () => {
    await clearSession();
    setSession(null);
    setRemote(null);
    setMessage({ kind: 'ok', text: 'Compte Google déconnecté de cet appareil. Vos données locales sont conservées.' });
  };

  const tokenValid = isTokenValid(session);
  const remoteSummary = remote ? summarizeBackup(remote) : null;
  const otherOwner =
    realEmail(remote?.owner_email) && realEmail(currentUser?.email) && remote?.owner_email !== currentUser?.email;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Retour" style={({ pressed }) => pressed && { opacity: 0.6 }}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Sauvegarde</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} onTouchStart={recordActivity}>
        <Text style={styles.title}>Sauvegarde & Synchronisation</Text>
        <Text style={styles.subtitle}>Copie de vos données dans votre Google Drive, récupérable sur un autre téléphone.</Text>

        {IS_SYNC_UNDER_MAINTENANCE ? (
          <View style={styles.maintenanceCard}>
            <View style={styles.maintenanceHeader}>
              <View style={styles.maintenanceIconBox}>
                <Wrench size={22} color={colors.accent.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.maintenanceBadge}>
                  <Text style={styles.maintenanceBadgeText}>SERVICE EN MAINTENANCE</Text>
                </View>
                <Text style={styles.maintenanceTitle}>Synchronisation Google Drive suspendue</Text>
              </View>
            </View>
            <Text style={styles.maintenanceText}>
              Le service de synchronisation distante fait l’objet d’une maintenance technique préventive. L’envoi et la restauration de sauvegardes cloud sont temporairement suspendus.
            </Text>
            <View style={styles.maintenanceFooter}>
              <ShieldCheck size={16} color={colors.primary.DEFAULT} />
              <Text style={styles.maintenanceFooterText}>
                Vos données locales restent 100 % intactes, souveraines et sécurisées sur cet appareil.
              </Text>
            </View>
          </View>
        ) : null}

        {!configured ? (
          <View style={[styles.notice, styles.noticeWarn]}>
            <TriangleAlert size={18} color={colors.accent.warning} />
            <Text style={styles.noticeText}>
              La connexion Google n'est pas encore disponible sur cet appareil (identifiant OAuth manquant).
            </Text>
          </View>
        ) : !session ? (
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <CloudUpload size={28} color={colors.primary.DEFAULT} />
            </View>
            <Text style={styles.cardTitle}>Protégez vos données</Text>
            <Text style={styles.cardText}>
              Connectez votre compte Google pour sauvegarder vos données dans votre Drive et pouvoir les
              récupérer en cas de perte ou de changement de téléphone.
            </Text>
            <Pressable
              onPress={connect}
              disabled={IS_SYNC_UNDER_MAINTENANCE || busy !== null}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.googleBtn,
                IS_SYNC_UNDER_MAINTENANCE && styles.disabledBtn,
                pressed && { opacity: 0.8 },
              ]}
            >
              {busy === 'signin' ? (
                <ActivityIndicator color={colors.text.primary} />
              ) : (
                <GoogleMark />
              )}
              <Text style={styles.googleBtnText}>
                {IS_SYNC_UNDER_MAINTENANCE ? 'Connexion en maintenance' : 'Continuer avec Google'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.accountCard}>
              <View style={styles.accountRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(session.name || session.email).slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.accountEmail} numberOfLines={1}>{session.email}</Text>
                  <Text style={styles.accountStatus}>
                    {tokenValid ? 'Connecté à Google Drive' : 'Session expirée — reconnexion au prochain envoi'}
                  </Text>
                </View>
              </View>
              <View style={styles.stats}>
                <View style={styles.stat}>
                  <History size={14} color={colors.primary.container} />
                  <Text style={styles.statLabel}>Dernière synchro</Text>
                  <Text style={styles.statValue}>{lastSync ? formatSyncDate(lastSync.syncedAt) : 'Jamais'}</Text>
                </View>
                <View style={styles.stat}>
                  <HardDrive size={14} color={colors.primary.container} />
                  <Text style={styles.statLabel}>Taille</Text>
                  <Text style={styles.statValue}>{lastSync ? formatBytes(lastSync.bytes) : '—'}</Text>
                </View>
              </View>
            </View>

            <Pressable
              onPress={sync}
              disabled={IS_SYNC_UNDER_MAINTENANCE || busy !== null}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.syncBtn,
                IS_SYNC_UNDER_MAINTENANCE && styles.disabledBtn,
                (pressed || busy !== null) && { opacity: 0.85 },
              ]}
            >
              <View style={styles.syncIcon}>
                {busy === 'sync' || busy === 'signin' ? (
                  <ActivityIndicator color={colors.text.inverted} />
                ) : (
                  <CloudUpload size={22} color={colors.text.inverted} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.syncTitle}>
                  {IS_SYNC_UNDER_MAINTENANCE
                    ? 'Synchronisation en pause'
                    : busy === 'sync'
                    ? 'Envoi en cours…'
                    : 'Synchroniser maintenant'}
                </Text>
                <Text style={styles.syncText}>
                  {IS_SYNC_UNDER_MAINTENANCE
                    ? 'Service temporairement suspendu pour maintenance'
                    : "Envoie l'état actuel de vos comptes sur Google Drive"}
                </Text>
              </View>
            </Pressable>
          </>
        )}

        {message ? (
          <View style={[styles.notice, message.kind === 'ok' ? styles.noticeOk : styles.noticeError]}>
            {message.kind === 'ok' ? (
              <CircleCheck size={18} color={colors.primary.DEFAULT} />
            ) : (
              <TriangleAlert size={18} color={colors.accent.danger} />
            )}
            <Text style={styles.noticeText}>{message.text}</Text>
          </View>
        ) : null}

        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <FolderLock size={18} color={colors.primary.DEFAULT} />
            <Text style={styles.infoTitle}>Où vont vos données ?</Text>
          </View>
          <Text style={styles.infoText}>
            Dans un dossier caché de votre Google Drive, réservé à GERETOU : il n'apparaît pas dans vos fichiers et
            aucune autre application ne peut le lire. Votre code PIN n'est jamais envoyé.
          </Text>
        </View>

        {session ? (
          remote && remoteSummary ? (
            <View style={[styles.card, styles.restoreCard]}>
              <Text style={styles.cardTitle}>Sauvegarde du {formatSyncDate(remote.created_at)}</Text>
              <Text style={styles.cardText}>
                {remoteSummary.accounts} compte(s), {remoteSummary.transactions} transaction(s), {remoteSummary.stocks} produit(s) en
                stock, {remoteSummary.debts} dette(s)/créance(s).
              </Text>
              {otherOwner ? (
                <Text style={styles.warnText}>Attention : cette sauvegarde appartient à {remote.owner_email}.</Text>
              ) : null}
              <Text style={styles.warnText}>Vos données actuelles sur ce téléphone seront remplacées.</Text>
              <Pressable
                onPress={confirmRestore}
                disabled={busy !== null}
                accessibilityRole="button"
                style={({ pressed }) => [styles.dangerBtn, pressed && { opacity: 0.85 }]}
              >
                {busy === 'restore' ? <ActivityIndicator color={colors.text.inverted} /> : <CloudDownload size={18} color={colors.text.inverted} />}
                <Text style={styles.dangerBtnText}>Remplacer mes données par cette sauvegarde</Text>
              </Pressable>
              <Pressable onPress={() => setRemote(null)} accessibilityRole="button" style={styles.linkBtn}>
                <Text style={styles.linkText}>Annuler</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={checkRemote}
              disabled={IS_SYNC_UNDER_MAINTENANCE || busy !== null}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.secondaryBtn,
                IS_SYNC_UNDER_MAINTENANCE && styles.disabledBtn,
                pressed && { opacity: 0.8 },
              ]}
            >
              {busy === 'check' ? (
                <ActivityIndicator color={colors.text.primary} />
              ) : (
                <CloudDownload size={18} color={colors.text.primary} />
              )}
              <Text style={styles.secondaryText}>
                {IS_SYNC_UNDER_MAINTENANCE ? 'Restauration en maintenance' : 'Restaurer depuis Google Drive'}
              </Text>
            </Pressable>
          )
        ) : null}

        {session ? (
          <Pressable onPress={disconnect} disabled={busy !== null} accessibilityRole="button" style={styles.logout}>
            <LogOut size={16} color={colors.accent.danger} />
            <Text style={styles.logoutText}>Déconnecter le compte Google</Text>
          </Pressable>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
  },
  headerTitle: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text.primary },
  content: { padding: spacing.base, paddingBottom: spacing.xxl, gap: spacing.md },
  title: { fontSize: typography.sizes.headline, fontWeight: typography.weights.extrabold, color: colors.text.primary },
  subtitle: { fontSize: typography.sizes.body, color: colors.text.secondary, marginTop: -spacing.sm },
  card: { backgroundColor: colors.surface.card, borderRadius: radii.xl, padding: spacing.lg, alignItems: 'center' },
  restoreCard: { alignItems: 'stretch', borderWidth: 1, borderColor: colors.accent.warningBorder },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary.container,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text.primary },
  cardText: { marginTop: spacing.xs, fontSize: typography.sizes.bodySm, lineHeight: 19, color: colors.text.secondary, textAlign: 'center' },
  googleBtn: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    minHeight: 52,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    backgroundColor: colors.surface.card,
  },
  googleBtnText: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.semibold, color: colors.text.primary },
  gMark: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  gMarkText: { fontSize: 18, fontWeight: typography.weights.extrabold, color: '#4285F4' },
  accountCard: { backgroundColor: colors.primary.DEFAULT, borderRadius: radii.xl, padding: spacing.base, gap: spacing.md },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.text.inverted, fontWeight: typography.weights.bold, fontSize: typography.sizes.body },
  accountEmail: { color: colors.text.inverted, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
  accountStatus: { color: colors.primary.container, fontSize: typography.sizes.bodySm },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.primary.light, borderRadius: radii.lg, padding: spacing.md, gap: 2 },
  statLabel: { color: colors.primary.container, fontSize: typography.sizes.caption },
  statValue: { color: colors.text.inverted, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary.dark,
    borderRadius: radii.xl,
    padding: spacing.base,
  },
  syncIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncTitle: { color: colors.text.inverted, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold },
  syncText: { color: colors.primary.container, fontSize: typography.sizes.bodySm },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderRadius: radii.lg, padding: spacing.md, borderWidth: 1 },
  noticeOk: { backgroundColor: colors.primary.subtle, borderColor: colors.primary.container },
  noticeError: { backgroundColor: colors.accent.dangerBg, borderColor: colors.accent.dangerBorder },
  noticeWarn: { backgroundColor: colors.accent.warningBg, borderColor: colors.accent.warningBorder },
  noticeText: { flex: 1, fontSize: typography.sizes.bodySm, lineHeight: 19, color: colors.text.primary },
  infoCard: { backgroundColor: colors.primary.subtle, borderRadius: radii.xl, padding: spacing.base, gap: spacing.xs },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text.primary },
  infoText: { fontSize: typography.sizes.bodySm, lineHeight: 19, color: colors.text.secondary },
  warnText: { marginTop: spacing.sm, fontSize: typography.sizes.bodySm, color: colors.accent.danger, fontWeight: typography.weights.semibold },
  dangerBtn: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.accent.danger,
    paddingHorizontal: spacing.base,
  },
  dangerBtnText: { color: colors.text.inverted, fontWeight: typography.weights.bold, fontSize: typography.sizes.body, flexShrink: 1 },
  linkBtn: { alignItems: 'center', paddingVertical: spacing.sm, marginTop: spacing.xs },
  linkText: { color: colors.text.secondary, fontWeight: typography.weights.semibold },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.brands.waveBg,
  },
  secondaryText: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text.primary },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  logoutText: { color: colors.accent.danger, fontWeight: typography.weights.semibold },
  maintenanceCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.accent.warningBorder,
    padding: spacing.base,
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  maintenanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  maintenanceIconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.accent.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  maintenanceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent.warningBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    marginBottom: 4,
  },
  maintenanceBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.accent.warning,
    letterSpacing: 0.5,
  },
  maintenanceTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  maintenanceText: {
    fontSize: typography.sizes.bodySm,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  maintenanceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
  },
  maintenanceFooterText: {
    flex: 1,
    fontSize: typography.sizes.caption,
    color: colors.primary.DEFAULT,
    fontWeight: typography.weights.medium,
  },
  disabledBtn: {
    opacity: 0.55,
  },
});
