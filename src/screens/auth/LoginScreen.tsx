/**
 * Connexion — GERETOU (« J'ai déjà un coffre »)
 * Maquette Stitch « Connexion & Synchronisation Google ».
 * Connexion Google → recherche de la sauvegarde Drive → résumé → (PIN choisi à l'étape suivante).
 */

import React, { useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { ArrowLeft, Wallet, ShieldCheck, CloudDownload, CircleCheck, TriangleAlert, CloudOff, ArrowRight, FolderLock, Wrench } from 'lucide-react-native';
import { useGoogleSignIn } from '../../hooks/useGoogleSignIn';
import { GoogleSession } from '../../services/google/googleSession';
import { fetchRemoteBackup, IS_SYNC_UNDER_MAINTENANCE } from '../../services/backup/syncService';
import { BackupFile, summarizeBackup } from '../../services/backup/backupFormat';
import { formatSyncDate } from '../settings/BackupScreen';
import { colors, radii, spacing, typography } from '../../theme/tokens';

type State =
  | { kind: 'idle' }
  | { kind: 'busy'; label: string }
  | { kind: 'found'; session: GoogleSession; backup: BackupFile }
  | { kind: 'notFound'; session: GoogleSession }
  | { kind: 'error'; message: string };

interface LoginScreenProps {
  onBack: () => void;
  /** Sauvegarde trouvée et choisie : passer à la définition du PIN. */
  onRestore: (backup: BackupFile) => void;
  /** Aucun coffre : créer un compte (e-mail Google pré-rempli si connu). */
  onCreateAccount: (email?: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onBack, onRestore, onCreateAccount }) => {
  const { configured, signIn } = useGoogleSignIn();
  const [state, setState] = useState<State>({ kind: 'idle' });

  const connect = async () => {
    try {
      setState({ kind: 'busy', label: 'Connexion à Google…' });
      const session = await signIn();
      if (!session) return setState({ kind: 'idle' });
      setState({ kind: 'busy', label: 'Recherche de votre sauvegarde…' });
      const found = await fetchRemoteBackup(session.accessToken);
      setState(found ? { kind: 'found', session, backup: found.backup } : { kind: 'notFound', session });
    } catch (e) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  const busy = state.kind === 'busy';
  const summary = state.kind === 'found' ? summarizeBackup(state.backup) : null;
  const ownerName = state.kind === 'found' ? (state.backup.tables.users[0]?.display_name as string | undefined) : undefined;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={onBack} disabled={busy} hitSlop={12} accessibilityRole="button" accessibilityLabel="Retour" style={({ pressed }) => pressed && { opacity: 0.6 }}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Connexion</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoWrap}>
          <View style={styles.logo}>
            <Wallet size={36} color={colors.primary.container} />
            <View style={styles.logoBadge}>
              <ShieldCheck size={14} color={colors.primary.DEFAULT} />
            </View>
          </View>
          <Text style={styles.brand}>GERETOU</Text>
          <Text style={styles.title}>Ravi de vous revoir</Text>
          <Text style={styles.subtitle}>
            Connectez le compte Google utilisé pour vos sauvegardes : vos comptes, transactions et stocks reviennent sur ce téléphone.
          </Text>
        </View>

        {IS_SYNC_UNDER_MAINTENANCE ? (
          <View style={[styles.notice, styles.noticeWarn]}>
            <Wrench size={18} color={colors.accent.warning} />
            <Text style={styles.noticeText}>
              Le service de synchronisation et de restauration Google Drive est actuellement en maintenance. Si vous commencez sur cet appareil, créez votre coffre local ci-dessous.
            </Text>
          </View>
        ) : !configured ? (
          <View style={[styles.notice, styles.noticeWarn]}>
            <TriangleAlert size={18} color={colors.accent.warning} />
            <Text style={styles.noticeText}>La connexion Google n'est pas encore disponible sur cet appareil.</Text>
          </View>
        ) : null}

        {state.kind === 'found' && summary ? (
          <View style={styles.foundCard}>
            <View style={styles.foundHeader}>
              <CircleCheck size={20} color={colors.primary.DEFAULT} />
              <Text style={styles.foundTitle}>Sauvegarde trouvée</Text>
            </View>
            <Text style={styles.foundLine}>
              {ownerName ? `${ownerName} · ` : ''}{state.session.email}
            </Text>
            <Text style={styles.foundLine}>Dernière sauvegarde : {formatSyncDate(state.backup.created_at)}</Text>
            <Text style={styles.foundLine}>
              {summary.accounts} compte(s) · {summary.transactions} transaction(s) · {summary.stocks} produit(s) · {summary.debts} dette(s)/créance(s)
            </Text>
            <Pressable
              onPress={() => onRestore(state.backup)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            >
              <CloudDownload size={20} color={colors.text.inverted} />
              <Text style={styles.ctaText}>Restaurer et choisir mon PIN</Text>
            </Pressable>
          </View>
        ) : state.kind === 'notFound' ? (
          <View style={[styles.notice, styles.noticeWarn]}>
            <CloudOff size={18} color={colors.accent.warning} />
            <Text style={styles.noticeText}>
              Aucune sauvegarde GERETOU sur {state.session.email}. Créez votre coffre : il sera sauvegardé sur ce compte.
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={connect}
            disabled={IS_SYNC_UNDER_MAINTENANCE || busy || !configured}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.googleBtn,
              (pressed || !configured || IS_SYNC_UNDER_MAINTENANCE) && { opacity: 0.6 },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={colors.text.primary} />
            ) : (
              <View style={styles.gMark}>
                <Text style={styles.gMarkText}>G</Text>
              </View>
            )}
            <Text style={styles.googleBtnText}>
              {IS_SYNC_UNDER_MAINTENANCE
                ? 'Restauration en maintenance'
                : busy
                ? state.label
                : 'Continuer avec Google'}
            </Text>
          </Pressable>
        )}

        {state.kind === 'error' ? (
          <View style={[styles.notice, styles.noticeError]}>
            <TriangleAlert size={18} color={colors.accent.danger} />
            <Text style={styles.noticeText}>{state.message}</Text>
          </View>
        ) : null}

        <View style={styles.infoCard}>
          <FolderLock size={18} color={colors.primary.DEFAULT} />
          <Text style={styles.infoText}>
            Votre code PIN n'est jamais sauvegardé : vous en choisirez un pour ce téléphone.
          </Text>
        </View>

        <View style={styles.newCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.newTitle}>Nouveau sur GERETOU ?</Text>
            <Text style={styles.newText}>Créez votre grand-livre sécurisé et autonome.</Text>
          </View>
          <Pressable
            onPress={() => onCreateAccount(state.kind === 'notFound' ? state.session.email : undefined)}
            disabled={busy}
            accessibilityRole="button"
            style={({ pressed }) => [styles.newBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.newBtnText}>Créer un coffre</Text>
            <ArrowRight size={16} color={colors.text.inverted} />
          </Pressable>
        </View>
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
  logoWrap: { alignItems: 'center', marginTop: spacing.base, marginBottom: spacing.sm },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { marginTop: spacing.md, fontSize: typography.sizes.title, fontWeight: typography.weights.extrabold, color: colors.primary.DEFAULT },
  title: { marginTop: spacing.xs, fontSize: 26, fontWeight: typography.weights.extrabold, color: colors.text.primary },
  subtitle: { marginTop: spacing.xs, fontSize: typography.sizes.body, lineHeight: 21, color: colors.text.secondary, textAlign: 'center' },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    minHeight: 56,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    backgroundColor: colors.surface.card,
  },
  googleBtnText: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.semibold, color: colors.text.primary },
  gMark: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  gMarkText: { fontSize: 20, fontWeight: typography.weights.extrabold, color: '#4285F4' },
  foundCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.xl,
    padding: spacing.base,
    borderWidth: 1.5,
    borderColor: colors.primary.container,
    gap: spacing.xs,
  },
  foundHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  foundTitle: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text.primary },
  foundLine: { fontSize: typography.sizes.bodySm, color: colors.text.secondary, lineHeight: 19 },
  cta: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: radii.lg,
    minHeight: 52,
  },
  ctaPressed: { backgroundColor: colors.primary.dark },
  ctaText: { color: colors.text.inverted, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderRadius: radii.lg, padding: spacing.md, borderWidth: 1 },
  noticeWarn: { backgroundColor: colors.accent.warningBg, borderColor: colors.accent.warningBorder },
  noticeError: { backgroundColor: colors.accent.dangerBg, borderColor: colors.accent.dangerBorder },
  noticeText: { flex: 1, fontSize: typography.sizes.bodySm, lineHeight: 19, color: colors.text.primary },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary.subtle,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  infoText: { flex: 1, fontSize: typography.sizes.bodySm, color: colors.text.secondary, lineHeight: 19 },
  newCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.brands.waveBg,
    borderRadius: radii.xl,
    padding: spacing.base,
  },
  newTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text.primary },
  newText: { fontSize: typography.sizes.bodySm, color: colors.text.secondary },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary.dark,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  newBtnText: { color: colors.text.inverted, fontWeight: typography.weights.bold, fontSize: typography.sizes.bodySm },
});
