/**
 * Écran Sécurité & Réglages — GERETOU
 * Maquette Stitch « GERETOU - Réglages Sécurité & Biométrie »
 * Gestion du profil, du code PIN, du capteur biométrique, accès à la corbeille et aux sauvegardes.
 */

import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  Switch,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  ArrowLeft,
  Shield,
  Fingerprint,
  KeyRound,
  Lock,
  UserRound,
  Trash2,
  Cloud,
  Check,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavStore } from '../../store/useNavStore';
import { showToast } from '../../store/useToastStore';
import { ChangePinModal } from '../../components/settings/ChangePinModal';
import { IS_SYNC_UNDER_MAINTENANCE } from '../../services/backup/syncService';
import { colors, radii, spacing, typography } from '../../theme/tokens';

export const SettingsScreen: React.FC = () => {
  const {
    currentUser,
    biometricAvailable,
    biometryType,
    toggleBiometrics,
    updateDisplayName,
    lockSession,
    recordActivity,
  } = useAuthStore();
  const { goBack, navigate } = useNavStore();

  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(currentUser?.display_name || '');
  const [busyBio, setBusyBio] = useState(false);
  const [busyName, setBusyName] = useState(false);

  const isBioOn = (currentUser?.biometric_enabled ?? 0) === 1;

  const handleToggleBio = async (val: boolean) => {
    recordActivity();
    setBusyBio(true);
    const res = await toggleBiometrics(val);
    setBusyBio(false);
    if (!res.success) {
      showToast({
        kind: 'error',
        title: 'Biométrie non activée',
        message: res.error ?? 'Échec de la configuration biométrique.',
      });
    } else {
      showToast({
        kind: 'success',
        title: val ? 'Biométrie activée' : 'Biométrie désactivée',
        message: val
          ? 'Vous pouvez désormais déverrouiller GERETOU avec votre empreinte.'
          : 'Le déverrouillage se fera exclusivement par code PIN.',
      });
    }
  };

  const handleSaveName = async () => {
    recordActivity();
    setBusyName(true);
    const ok = await updateDisplayName(nameInput);
    setBusyName(false);
    if (ok) {
      setEditingName(false);
      showToast({
        kind: 'success',
        title: 'Profil mis à jour',
        message: 'Votre nom d’affichage a été enregistré.',
      });
    } else {
      showToast({
        kind: 'error',
        title: 'Erreur',
        message: 'Impossible de mettre à jour le profil.',
      });
    }
  };

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
          <Text style={styles.title}>Sécurité & Réglages</Text>
          <Text style={styles.subtitle}>Protection du grand-livre et profil</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} onTouchStart={recordActivity}>
        {/* SECTION 1 : PROFIL & IDENTITÉ */}
        <Text style={styles.sectionHeader}>Profil & Identité</Text>
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <UserRound size={24} color={colors.primary.DEFAULT} />
            </View>
            <View style={{ flex: 1 }}>
              {editingName ? (
                <View style={styles.editRow}>
                  <TextInput
                    value={nameInput}
                    onChangeText={setNameInput}
                    placeholder="Votre nom ou pseudo"
                    placeholderTextColor={colors.text.muted}
                    maxLength={30}
                    style={styles.nameInput}
                    autoFocus
                  />
                  <Pressable
                    onPress={handleSaveName}
                    disabled={busyName}
                    style={styles.saveNameBtn}
                    accessibilityRole="button"
                  >
                    {busyName ? (
                      <ActivityIndicator size="small" color={colors.text.inverted} />
                    ) : (
                      <Check size={16} color={colors.text.inverted} />
                    )}
                  </Pressable>
                </View>
              ) : (
                <View style={styles.nameDisplayRow}>
                  <Text style={styles.displayName}>
                    {currentUser?.display_name || 'Utilisateur GERETOU'}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setNameInput(currentUser?.display_name || '');
                      setEditingName(true);
                    }}
                    style={styles.editPill}
                  >
                    <Text style={styles.editPillText}>Modifier</Text>
                  </Pressable>
                </View>
              )}
              <Text style={styles.userEmail} numberOfLines={1}>
                {currentUser?.email?.includes('@guest.geretou.local')
                  ? 'Compte invité (100% hors-ligne)'
                  : currentUser?.email || 'Compte local'}
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION 2 : SÉCURITÉ MATÉRIELLE & PIN */}
        <Text style={styles.sectionHeader}>Sécurité d'Accès</Text>
        <View style={styles.card}>
          {/* Biométrie */}
          <View style={styles.itemRow}>
            <View style={styles.iconWrap}>
              <Fingerprint size={20} color={colors.primary.DEFAULT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{biometryType}</Text>
              <Text style={styles.itemSub}>
                {biometricAvailable
                  ? 'Déverrouillage rapide sans saisir le PIN'
                  : 'Capteur biométrique non disponible'}
              </Text>
            </View>
            {busyBio ? (
              <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
            ) : (
              <Switch
                value={isBioOn}
                onValueChange={handleToggleBio}
                disabled={!biometricAvailable}
                trackColor={{ false: colors.surface.border, true: colors.primary.light }}
                thumbColor={isBioOn ? colors.primary.DEFAULT : colors.surface.card}
              />
            )}
          </View>

          <View style={styles.divider} />

          {/* Code PIN */}
          <Pressable
            onPress={() => setPinModalOpen(true)}
            style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
          >
            <View style={styles.iconWrap}>
              <KeyRound size={20} color={colors.primary.DEFAULT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>Code PIN de sécurité</Text>
              <Text style={styles.itemSub}>Haché en PBKDF2 avec clé matérielle</Text>
            </View>
            <Text style={styles.actionLink}>Changer</Text>
            <ChevronRight size={18} color={colors.text.muted} />
          </Pressable>

          <View style={styles.divider} />

          {/* Verrouiller maintenant */}
          <Pressable
            onPress={() => lockSession()}
            style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.accent.warningBg }]}>
              <Lock size={18} color={colors.accent.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>Verrouiller l'application</Text>
              <Text style={styles.itemSub}>
                Ferme immédiatement la session active
              </Text>
            </View>
            <ChevronRight size={18} color={colors.text.muted} />
          </Pressable>
        </View>

        {/* SECTION 3 : DONNÉES & GESTION */}
        <Text style={styles.sectionHeader}>Données & Sauvegarde</Text>
        <View style={styles.card}>
          <Pressable
            onPress={() => navigate('BACKUP')}
            style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.brands.waveBg }]}>
              <Cloud size={20} color={colors.primary.DEFAULT} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.itemTitle}>Sauvegarde & Synchronisation</Text>
                {IS_SYNC_UNDER_MAINTENANCE ? (
                  <View style={styles.maintenanceBadge}>
                    <Text style={styles.maintenanceBadgeText}>Maintenance</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.itemSub}>
                {IS_SYNC_UNDER_MAINTENANCE
                  ? 'Service cloud en pause · Données locales 100% actives'
                  : 'Google Drive et export local'}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.text.muted} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            onPress={() => navigate('TRASH')}
            style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.accent.dangerBg }]}>
              <Trash2 size={20} color={colors.accent.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>Corbeille & Restauration</Text>
              <Text style={styles.itemSub}>Éléments supprimés récupérables</Text>
            </View>
            <ChevronRight size={18} color={colors.text.muted} />
          </Pressable>
        </View>

        {/* SECTION 4 : SOUVERAINETÉ LOCALE */}
        <View style={styles.sovereigntyBox}>
          <ShieldCheck size={20} color={colors.primary.DEFAULT} />
          <View style={{ flex: 1 }}>
            <Text style={styles.sovereigntyTitle}>
              Architecture Souveraine Hors-Ligne
            </Text>
            <Text style={styles.sovereigntyText}>
              GERETOU fonctionne en circuit fermé sur votre téléphone. Vos clés de sécurité ne sont jamais transmises à des tiers.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Modale de changement de code PIN */}
      <ChangePinModal visible={pinModalOpen} onClose={() => setPinModalOpen(false)} />
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
  content: {
    padding: spacing.base,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  sectionHeader: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.bold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: spacing.base,
    gap: spacing.sm,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  displayName: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  editPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.primary.subtle,
    borderRadius: radii.full,
  },
  editPillText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    color: colors.primary.DEFAULT,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    fontSize: typography.sizes.bodySm,
    color: colors.text.primary,
    outlineStyle: 'none',
  } as never,
  saveNameBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userEmail: {
    fontSize: typography.sizes.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primary.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  maintenanceBadge: {
    backgroundColor: colors.accent.warningBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.accent.warningBorder,
  },
  maintenanceBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.accent.warning,
    letterSpacing: 0.3,
  },
  itemSub: {
    fontSize: typography.sizes.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  actionLink: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.semibold,
    color: colors.primary.DEFAULT,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surface.muted,
    marginVertical: spacing.xs,
  },
  sovereigntyBox: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.brands.waveBg,
    borderRadius: radii.xl,
    padding: spacing.base,
    marginTop: spacing.md,
  },
  sovereigntyTitle: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.bold,
    color: colors.primary.dark,
  },
  sovereigntyText: {
    fontSize: typography.sizes.caption,
    color: colors.text.secondary,
    marginTop: 2,
    lineHeight: 17,
  },
});
