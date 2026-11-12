/**
 * Écran Corbeille & Restauration — GERETOU
 * Maquette Stitch « GERETOU - Corbeille & Restauration »
 * Restauration sécurisée avec réajustement des soldes et purge définitive.
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
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  Trash2,
  RotateCcw,
  ShieldAlert,
  CircleCheck,
  TriangleAlert,
  Trash,
} from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavStore } from '../../store/useNavStore';
import { useWalletStore } from '../../store/useWalletStore';
import { showToast } from '../../store/useToastStore';
import { getDatabase } from '../../services/db/database';
import {
  TrashItem,
  listTrashItems,
  restoreTransaction,
  deletePermanently,
  emptyTrash,
} from '../../services/trash/trashRepo';
import { CategoryIcon } from '../../components/common/AppIcons';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

type FilterType = 'ALL' | 'EXPENSE' | 'INCOME';

export const TrashScreen: React.FC = () => {
  const { currentUser, recordActivity } = useAuthStore();
  const { goBack } = useNavStore();
  const { fetchWallet } = useWalletStore();

  const [items, setItems] = useState<TrashItem[]>([]);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const uid = currentUser?.id ?? '';

  const loadTrash = async () => {
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
      const list = await listTrashItems(adapter, uid);
      setItems(list);
    } catch (e) {
      console.error('[GERETOU] Erreur lecture corbeille:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrash();
  }, [uid]);

  const handleRestore = async (item: TrashItem) => {
    recordActivity();
    try {
      const rawDb = await getDatabase();
      const adapter = {
        all: <T,>(sql: string, p: unknown[] = []) => rawDb.getAllAsync<T>(sql, p as never[]),
        get: <T,>(sql: string, p: unknown[] = []) => rawDb.getFirstAsync<T>(sql, p as never[]),
        run: async (sql: string, p: unknown[] = []) => {
          await rawDb.runAsync(sql, p as never[]);
        },
      };
      await restoreTransaction(adapter, uid, item.id);
      await fetchWallet(uid);
      await loadTrash();
      showToast({
        kind: 'success',
        title: 'Opération restaurée',
        message: `${item.category_name || 'L’opération'} a été réintégrée et le solde ajusté.`,
      });
    } catch (e: any) {
      showToast({
        kind: 'error',
        title: 'Restauration impossible',
        message: e?.message ?? 'Échec de la restauration.',
      });
    }
  };

  const handleDeletePermanently = async (item: TrashItem) => {
    recordActivity();
    if (confirmDeleteId !== item.id) {
      setConfirmDeleteId(item.id);
      return;
    }
    try {
      const rawDb = await getDatabase();
      const adapter = {
        all: <T,>(sql: string, p: unknown[] = []) => rawDb.getAllAsync<T>(sql, p as never[]),
        get: <T,>(sql: string, p: unknown[] = []) => rawDb.getFirstAsync<T>(sql, p as never[]),
        run: async (sql: string, p: unknown[] = []) => {
          await rawDb.runAsync(sql, p as never[]);
        },
      };
      await deletePermanently(adapter, uid, item.id);
      setConfirmDeleteId(null);
      await loadTrash();
      showToast({
        kind: 'info',
        title: 'Suppression définitive',
        message: 'L’enregistrement a été purgé définitivement.',
      });
    } catch (e: any) {
      showToast({
        kind: 'error',
        title: 'Erreur',
        message: e?.message ?? 'Suppression impossible.',
      });
    }
  };

  const handleEmptyTrash = async () => {
    recordActivity();
    if (!confirmEmpty) {
      setConfirmEmpty(true);
      return;
    }
    try {
      const rawDb = await getDatabase();
      const adapter = {
        all: <T,>(sql: string, p: unknown[] = []) => rawDb.getAllAsync<T>(sql, p as never[]),
        get: <T,>(sql: string, p: unknown[] = []) => rawDb.getFirstAsync<T>(sql, p as never[]),
        run: async (sql: string, p: unknown[] = []) => {
          await rawDb.runAsync(sql, p as never[]);
        },
      };
      const res = await emptyTrash(adapter, uid);
      setConfirmEmpty(false);
      await loadTrash();
      showToast({
        kind: 'info',
        title: 'Corbeille vidée',
        message: `${res.deletedCount} élément(s) purgé(s).`,
      });
    } catch (e: any) {
      showToast({
        kind: 'error',
        title: 'Erreur',
        message: e?.message ?? 'Impossible de vider la corbeille.',
      });
    }
  };

  const filteredItems = items.filter((it) => {
    if (filter === 'EXPENSE') return it.type === 'EXPENSE';
    if (filter === 'INCOME') return it.type === 'INCOME';
    return true;
  });

  const expenseCount = items.filter((it) => it.type === 'EXPENSE').length;
  const incomeCount = items.filter((it) => it.type === 'INCOME').length;

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
          <Text style={styles.title}>Corbeille</Text>
          <Text style={styles.subtitle}>Protection zéro perte définitive</Text>
        </View>

        {items.length > 0 ? (
          <Pressable
            onPress={handleEmptyTrash}
            style={[
              styles.emptyBtn,
              confirmEmpty && { backgroundColor: colors.accent.danger },
            ]}
            accessibilityRole="button"
          >
            <Trash2
              size={16}
              color={confirmEmpty ? colors.text.inverted : colors.accent.danger}
            />
            <Text
              style={[
                styles.emptyBtnText,
                confirmEmpty && { color: colors.text.inverted },
              ]}
            >
              {confirmEmpty ? 'Confirmer ?' : 'Vider'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Filtres */}
      <View style={styles.filterRow}>
        {[
          { k: 'ALL' as const, l: `Tous (${items.length})` },
          { k: 'EXPENSE' as const, l: `Dépenses (${expenseCount})` },
          { k: 'INCOME' as const, l: `Revenus (${incomeCount})` },
        ].map((f) => {
          const on = filter === f.k;
          return (
            <Pressable
              key={f.k}
              onPress={() => {
                setFilter(f.k);
                recordActivity();
              }}
              style={[styles.filterChip, on && styles.filterChipOn]}
            >
              <Text style={[styles.filterChipText, on && styles.filterChipTextOn]}>
                {f.l}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadTrash} />
        }
        onTouchStart={recordActivity}
      >
        {/* Hero Card Note informative */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.inline}>
              <ShieldAlert size={16} color={colors.primary.container} />
              <Text style={styles.heroLabel}>DROIT À L'ERREUR</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>Restauration fidèle</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>
            {items.length} opération{items.length > 1 ? 's' : ''} dans la corbeille
          </Text>
          <Text style={styles.heroSub}>
            Restaurez une opération par erreur à tout instant. Le solde de votre compte source sera réajusté fidèlement.
          </Text>
        </View>

        {/* Liste des éléments */}
        {filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <CircleCheck size={44} color={colors.primary.DEFAULT} />
            <Text style={styles.emptyTitle}>Corbeille vide</Text>
            <Text style={styles.emptySub}>
              Aucun élément n'est actuellement à la corbeille. Vos finances sont nettes et ordonnées.
            </Text>
          </View>
        ) : (
          filteredItems.map((item) => {
            const isExpense = item.type === 'EXPENSE';
            const color = isExpense ? colors.accent.danger : colors.primary.DEFAULT;

            return (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemCardHead}>
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: (item.category_color || '#64748B') + '20' },
                    ]}
                  >
                    <CategoryIcon
                      name={item.category_icon || 'tag'}
                      color={item.category_color || colors.primary.DEFAULT}
                      size={18}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>
                      {item.notes || item.category_name || 'Opération'}
                    </Text>
                    <Text style={styles.itemSub}>
                      {item.account_name} ·{' '}
                      {new Date(item.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                  </View>

                  <Text style={[styles.itemAmount, { color }]}>
                    {isExpense ? '-' : '+'}
                    {formatFCFA(item.amount)}
                  </Text>
                </View>

                {item.deleted_at ? (
                  <Text style={styles.deletedAt}>
                    Supprimé le{' '}
                    {new Date(item.deleted_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                ) : null}

                <View style={styles.itemActions}>
                  <Pressable
                    onPress={() => handleRestore(item)}
                    style={({ pressed }) => [
                      styles.restoreBtn,
                      pressed && { opacity: 0.85 },
                    ]}
                    accessibilityRole="button"
                  >
                    <RotateCcw size={15} color={colors.primary.DEFAULT} />
                    <Text style={styles.restoreText}>Restaurer</Text>
                  </Pressable>

                  <View style={{ flex: 1 }} />

                  <Pressable
                    onPress={() => handleDeletePermanently(item)}
                    style={[
                      styles.delBtn,
                      confirmDeleteId === item.id && { backgroundColor: colors.accent.danger },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={
                      confirmDeleteId === item.id
                        ? 'Confirmer la suppression définitive'
                        : 'Supprimer définitivement'
                    }
                  >
                    <Trash
                      size={16}
                      color={
                        confirmDeleteId === item.id
                          ? colors.text.inverted
                          : colors.accent.danger
                      }
                    />
                    {confirmDeleteId === item.id ? (
                      <Text style={styles.delBtnConfirmText}>Purger ?</Text>
                    ) : null}
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
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
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent.dangerBg,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  emptyBtnText: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.bold,
    color: colors.accent.danger,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surface.muted,
  },
  filterChipOn: {
    backgroundColor: colors.primary.DEFAULT,
  },
  filterChipText: {
    fontSize: typography.sizes.bodySm,
    color: colors.text.secondary,
  },
  filterChipTextOn: {
    color: colors.text.inverted,
    fontWeight: typography.weights.bold,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  heroCard: {
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: radii.xl,
    padding: spacing.base,
    gap: spacing.sm,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.primary.container,
    letterSpacing: 0.5,
  },
  heroPill: {
    borderWidth: 1,
    borderColor: colors.primary.light,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  heroPillText: {
    fontSize: typography.sizes.caption,
    color: colors.primary.container,
  },
  heroTitle: {
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.text.inverted,
  },
  heroSub: {
    fontSize: typography.sizes.bodySm,
    color: colors.primary.container,
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface.card,
    borderRadius: radii.xl,
    padding: spacing.xxl,
  },
  emptyTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  emptySub: {
    fontSize: typography.sizes.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  itemCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: spacing.base,
    gap: spacing.sm,
  },
  itemCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  itemSub: {
    fontSize: typography.sizes.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  itemAmount: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.extrabold,
  },
  deletedAt: {
    fontSize: typography.sizes.caption,
    color: colors.text.muted,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surface.muted,
    paddingTop: spacing.sm,
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary.subtle,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  restoreText: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.bold,
    color: colors.primary.DEFAULT,
  },
  delBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.md,
    backgroundColor: colors.surface.muted,
  },
  delBtnConfirmText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.text.inverted,
  },
});
