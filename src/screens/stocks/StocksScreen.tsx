/**
 * Écran Stocks Domestiques & Liste de Courses — GERETOU
 * Maquette Stitch « GERETOU - Stocks Domestiques & Courses »
 * 100% Hors-Ligne, mise à jour instantanée en SQLite, panier automatique et conversion en dépense.
 */

import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import {
  Plus,
  Minus,
  Search,
  ShoppingCart,
  ShoppingBag,
  Sparkles,
  Pencil,
  Trash,
  Boxes,
  CircleCheck,
  TriangleAlert,
  ArrowRight,
} from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useStockStore } from '../../store/useStockStore';
import { useWalletStore } from '../../store/useWalletStore';
import { showToast } from '../../store/useToastStore';
import { StockEditorModal } from '../../components/stocks/StockEditorModal';
import { RestockModal } from '../../components/stocks/RestockModal';
import { BudgetGauge } from '../../components/budget/BudgetGauge';
import {
  StockCategory,
  STOCK_CATEGORIES,
  StockInput,
  StockStatus,
  stockStatus,
  effectiveTarget,
  fillRatio,
  formatQty,
  stepFor,
  sortByCriticality,
  shoppingList,
  basketTotal,
  categoryLabel,
} from '../../services/stocks/stockCore';
import { StockRecord } from '../../services/stocks/stockRepo';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

type MainTab = 'STOCKS' | 'SHOPPING';
type StatusFilter = 'ALL' | 'LOW' | 'OUT';

export const StocksScreen: React.FC = () => {
  const { currentUser, recordActivity } = useAuthStore();
  const { stocks, isLoading, fetchStocks, addStock, editStock, stepQuantity, removeStock, restock } =
    useStockStore();
  const { summary, fetchWallet } = useWalletStore();

  const [activeTab, setActiveTab] = useState<MainTab>('STOCKS');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<StockRecord | null>(null);
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const uid = currentUser?.id ?? '';
  const accounts = summary.accounts.filter((a) => !a.is_archived);

  useEffect(() => {
    if (!uid) return;
    fetchStocks(uid);
    fetchWallet(uid);
  }, [uid]);

  const shoppingLines = shoppingList(stocks);
  const totalBasket = basketTotal(shoppingLines);

  const outCount = stocks.filter((s) => stockStatus(s.current_qty, s.min_threshold) === 'OUT').length;
  const lowCount = stocks.filter((s) => stockStatus(s.current_qty, s.min_threshold) === 'LOW').length;
  const okCount = stocks.filter((s) => stockStatus(s.current_qty, s.min_threshold) === 'OK').length;

  // Filtrage de l'onglet Stocks
  const filteredStocks = sortByCriticality(stocks).filter((s) => {
    const status = stockStatus(s.current_qty, s.min_threshold);
    if (statusFilter === 'LOW' && status !== 'LOW') return false;
    if (statusFilter === 'OUT' && status !== 'OUT') return false;
    if (categoryFilter !== 'ALL' && s.category !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || categoryLabel(s.category).toLowerCase().includes(q);
    }
    return true;
  });

  const handleStep = async (item: StockRecord, delta: number) => {
    recordActivity();
    const failure = await stepQuantity(uid, item.id, delta);
    if (failure) {
      showToast({ kind: 'error', title: 'Erreur', message: failure });
    }
  };

  const handleDelete = async (item: StockRecord) => {
    recordActivity();
    if (confirmDeleteId !== item.id) {
      setConfirmDeleteId(item.id);
      return;
    }
    const failure = await removeStock(uid, item.id);
    setConfirmDeleteId(null);
    if (failure) {
      showToast({ kind: 'error', title: 'Erreur de suppression', message: failure });
    } else {
      showToast({ kind: 'info', title: 'Produit supprimé', message: `${item.name} a été retiré.` });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* En-tête */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Stocks & Courses</Text>
          <Text style={styles.subtitle}>Garde-manger et réserves du foyer</Text>
        </View>
        <Pressable
          onPress={() => {
            setEditingStock(null);
            setEditorOpen(true);
          }}
          accessibilityRole="button"
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
        >
          <Plus size={18} color={colors.text.inverted} />
          <Text style={styles.addBtnText}>Nouveau</Text>
        </Pressable>
      </View>

      {/* Onglets principaux */}
      <View style={styles.mainTabs}>
        <Pressable
          onPress={() => setActiveTab('STOCKS')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'STOCKS' }}
          style={[styles.mainTabItem, activeTab === 'STOCKS' && styles.mainTabItemOn]}
        >
          <Boxes
            size={18}
            color={activeTab === 'STOCKS' ? colors.primary.DEFAULT : colors.text.secondary}
          />
          <Text style={[styles.mainTabText, activeTab === 'STOCKS' && styles.mainTabTextOn]}>
            Tous les stocks ({stocks.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('SHOPPING')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'SHOPPING' }}
          style={[styles.mainTabItem, activeTab === 'SHOPPING' && styles.mainTabItemOn]}
        >
          <ShoppingCart
            size={18}
            color={activeTab === 'SHOPPING' ? colors.primary.DEFAULT : colors.text.secondary}
          />
          <Text style={[styles.mainTabText, activeTab === 'SHOPPING' && styles.mainTabTextOn]}>
            Courses ({shoppingLines.length})
          </Text>
          {shoppingLines.length > 0 ? (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{shoppingLines.length}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              if (uid) fetchStocks(uid);
            }}
          />
        }
        onTouchStart={recordActivity}
      >
        {activeTab === 'STOCKS' ? (
          <>
            {/* Hero Card Résumé Stocks */}
            <View style={styles.hero}>
              <View style={styles.heroTop}>
                <View style={styles.inline}>
                  <Boxes size={16} color={colors.primary.container} />
                  <Text style={styles.heroLabel}>ÉTAT DES RÉSERVES</Text>
                </View>
                <View style={styles.heroPill}>
                  <Text style={styles.heroPillText}>100% Hors-Ligne</Text>
                </View>
              </View>

              <View style={styles.heroStats}>
                <View style={styles.heroStatItem}>
                  <Text style={[styles.heroStatNum, { color: colors.accent.danger }]}>
                    {outCount}
                  </Text>
                  <Text style={styles.heroStatLabel}>Rupture</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStatItem}>
                  <Text style={[styles.heroStatNum, { color: colors.accent.warning }]}>
                    {lowCount}
                  </Text>
                  <Text style={styles.heroStatLabel}>Stock bas</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStatItem}>
                  <Text style={[styles.heroStatNum, { color: colors.primary.container }]}>
                    {okCount}
                  </Text>
                  <Text style={styles.heroStatLabel}>Suffisant</Text>
                </View>
              </View>

              {shoppingLines.length > 0 ? (
                <Pressable
                  onPress={() => setActiveTab('SHOPPING')}
                  style={({ pressed }) => [styles.heroCta, pressed && { opacity: 0.9 }]}
                >
                  <Sparkles size={16} color={colors.primary.dark} />
                  <Text style={styles.heroCtaText}>
                    {shoppingLines.length} produit{shoppingLines.length > 1 ? 's' : ''} à acheter
                    {totalBasket > 0 ? ` (~${formatFCFA(totalBasket)})` : ''}
                  </Text>
                  <ArrowRight size={16} color={colors.primary.dark} />
                </Pressable>
              ) : null}
            </View>

            {/* Barre de Recherche */}
            <View style={styles.searchBar}>
              <Search size={18} color={colors.text.muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Rechercher un produit (ex : Riz, Huile, Savon)…"
                placeholderTextColor={colors.text.muted}
                style={styles.searchInput}
              />
              {search.trim() ? (
                <Pressable onPress={() => setSearch('')} hitSlop={8}>
                  <Text style={styles.clearSearch}>Effacer</Text>
                </Pressable>
              ) : null}
            </View>

            {/* Filtres de Criticité */}
            <View style={styles.filtersRow}>
              {[
                { k: 'ALL', l: `Tous (${stocks.length})` },
                { k: 'OUT', l: `Ruptures (${outCount})` },
                { k: 'LOW', l: `Stocks bas (${lowCount})` },
              ].map((f) => (
                <Pressable
                  key={f.k}
                  onPress={() => setStatusFilter(f.k as StatusFilter)}
                  style={[styles.filterChip, statusFilter === f.k && styles.filterChipOn]}
                >
                  <Text
                    style={[styles.filterChipText, statusFilter === f.k && styles.filterChipTextOn]}
                  >
                    {f.l}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Filtres de Catégories */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catsRow}>
              <Pressable
                onPress={() => setCategoryFilter('ALL')}
                style={[styles.catChip, categoryFilter === 'ALL' && styles.catChipOn]}
              >
                <Text style={[styles.catChipText, categoryFilter === 'ALL' && styles.catChipTextOn]}>
                  Toutes catégories
                </Text>
              </Pressable>
              {STOCK_CATEGORIES.map((c) => (
                <Pressable
                  key={c.key}
                  onPress={() => setCategoryFilter(c.key)}
                  style={[styles.catChip, categoryFilter === c.key && styles.catChipOn]}
                >
                  <Text
                    style={[styles.catChipText, categoryFilter === c.key && styles.catChipTextOn]}
                  >
                    {c.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Liste des cartes produit */}
            {filteredStocks.length === 0 ? (
              <View style={styles.empty}>
                <Boxes size={36} color={colors.text.muted} />
                <Text style={styles.emptyTitle}>
                  {stocks.length === 0
                    ? 'Aucun produit en stock'
                    : 'Aucun produit ne correspond aux filtres'}
                </Text>
                <Text style={styles.emptySub}>
                  {stocks.length === 0
                    ? 'Ajoutez vos consommables clés pour anticiper les courses et éviter les ruptures.'
                    : 'Modifiez votre recherche ou réinitialisez les filtres.'}
                </Text>
                {stocks.length === 0 ? (
                  <Pressable
                    onPress={() => {
                      setEditingStock(null);
                      setEditorOpen(true);
                    }}
                    style={styles.emptyCta}
                  >
                    <Plus size={16} color={colors.text.inverted} />
                    <Text style={styles.emptyCtaText}>Ajouter mon premier produit</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              filteredStocks.map((item) => {
                const status = stockStatus(item.current_qty, item.min_threshold);
                const step = stepFor(item.unit);
                const target = effectiveTarget(item);
                const ratio = fillRatio(item);

                const statusColor =
                  status === 'OUT'
                    ? colors.accent.danger
                    : status === 'LOW'
                    ? colors.accent.warning
                    : colors.primary.DEFAULT;

                const statusBg =
                  status === 'OUT'
                    ? colors.accent.dangerBg
                    : status === 'LOW'
                    ? colors.accent.warningBg
                    : colors.primary.subtle;

                const statusLabel =
                  status === 'OUT'
                    ? 'Rupture totale'
                    : status === 'LOW'
                    ? 'Stock bas'
                    : 'Stock suffisant';

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.stockCard,
                      status === 'OUT' && styles.cardOut,
                      status === 'LOW' && styles.cardLow,
                    ]}
                  >
                    {/* Entête carte */}
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardName}>{item.name}</Text>
                        <Text style={styles.cardCat}>
                          {categoryLabel(item.category)} · Seuil min : {item.min_threshold} {item.unit}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                          {statusLabel}
                        </Text>
                      </View>
                    </View>

                    {/* Jauge de niveau */}
                    <View style={styles.gaugeBox}>
                      <View style={styles.gaugeHeader}>
                        <Text style={styles.gaugeLabel}>
                          Réserve :{' '}
                          <Text style={[styles.gaugeVal, { color: statusColor }]}>
                            {formatQty(item.current_qty, item.unit)}
                          </Text>
                        </Text>
                        <Text style={styles.gaugeTarget}>
                          Cible : {formatQty(target, item.unit)}
                        </Text>
                      </View>
                      <BudgetGauge
                        ratio={ratio}
                        status={status === 'OUT' ? 'over' : status === 'LOW' ? 'warning' : 'healthy'}
                        height={8}
                      />
                    </View>

                    {/* Infos complémentaires */}
                    <View style={styles.detailsRow}>
                      {item.estimated_unit_price ? (
                        <Text style={styles.priceHint}>
                          Prix estimé : {formatFCFA(item.estimated_unit_price)} / {item.unit}
                        </Text>
                      ) : (
                        <Text style={styles.priceHint}>Prix non renseigné</Text>
                      )}
                      {item.last_restocked_at ? (
                        <Text style={styles.lastRestock}>
                          Réappro le{' '}
                          {new Date(item.last_restocked_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </Text>
                      ) : null}
                    </View>

                    {/* Actions de la carte */}
                    <View style={styles.cardActions}>
                      {/* Stepper rapide */}
                      <View style={styles.cardStepper}>
                        <Pressable
                          onPress={() => handleStep(item, -step)}
                          style={styles.cardStepBtn}
                          accessibilityRole="button"
                          accessibilityLabel="Diminuer"
                        >
                          <Minus size={16} color={colors.text.primary} />
                        </Pressable>
                        <Text style={styles.cardStepText}>
                          {item.current_qty} {item.unit}
                        </Text>
                        <Pressable
                          onPress={() => handleStep(item, step)}
                          style={styles.cardStepBtn}
                          accessibilityRole="button"
                          accessibilityLabel="Augmenter"
                        >
                          <Plus size={16} color={colors.text.primary} />
                        </Pressable>
                      </View>

                      <View style={{ flex: 1 }} />

                      {/* Modifier */}
                      <Pressable
                        onPress={() => {
                          setEditingStock(item);
                          setEditorOpen(true);
                        }}
                        style={styles.iconAction}
                        accessibilityRole="button"
                        accessibilityLabel="Modifier le produit"
                      >
                        <Pencil size={18} color={colors.text.secondary} />
                      </Pressable>

                      {/* Supprimer */}
                      <Pressable
                        onPress={() => handleDelete(item)}
                        style={[
                          styles.iconAction,
                          confirmDeleteId === item.id && { backgroundColor: colors.accent.danger },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={
                          confirmDeleteId === item.id
                            ? 'Confirmer la suppression'
                            : 'Supprimer le produit'
                        }
                      >
                        <Trash
                          size={18}
                          color={
                            confirmDeleteId === item.id
                              ? colors.text.inverted
                              : colors.accent.danger
                          }
                        />
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </>
        ) : (
          /* Onglet 2 : Liste de Courses Automatique */
          <>
            <View style={styles.heroShopping}>
              <View style={styles.heroTop}>
                <View style={styles.inline}>
                  <ShoppingCart size={16} color={colors.primary.DEFAULT} />
                  <Text style={[styles.heroLabel, { color: colors.primary.DEFAULT }]}>
                    PANIER DE RÉAPPROVISIONNEMENT
                  </Text>
                </View>
                <View style={[styles.heroPill, { borderColor: colors.primary.DEFAULT }]}>
                  <Text style={[styles.heroPillText, { color: colors.primary.DEFAULT }]}>
                    Automatique
                  </Text>
                </View>
              </View>

              <Text style={styles.heroShoppingAmount}>
                {formatFCFA(totalBasket)}
              </Text>
              <Text style={styles.heroShoppingSub}>
                Estimation totale pour {shoppingLines.length} article
                {shoppingLines.length > 1 ? 's' : ''} à racheter
              </Text>

              {shoppingLines.length > 0 ? (
                <Pressable
                  onPress={() => setRestockModalOpen(true)}
                  style={({ pressed }) => [styles.validerCoursesBtn, pressed && { opacity: 0.9 }]}
                >
                  <ShoppingBag size={18} color={colors.text.inverted} />
                  <Text style={styles.validerCoursesText}>
                    Valider les courses ({formatFCFA(totalBasket)})
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {/* Liste des articles à acheter */}
            {shoppingLines.length === 0 ? (
              <View style={styles.empty}>
                <CircleCheck size={44} color={colors.primary.DEFAULT} />
                <Text style={styles.emptyTitle}>Vos réserves sont au complet !</Text>
                <Text style={styles.emptySub}>
                  Aucun produit n'est en stock bas ou en rupture. Tous vos placards sont approvisionnés.
                </Text>
              </View>
            ) : (
              shoppingLines.map((line) => {
                const isOut = line.stock.current_qty <= 0;
                return (
                  <View key={line.stock.id} style={styles.shoppingCard}>
                    <View style={styles.shoppingCardHead}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.shoppingCardName}>{line.stock.name}</Text>
                        <Text style={styles.shoppingCardSub}>
                          Actuel : {formatQty(line.stock.current_qty, line.stock.unit)} · Seuil :{' '}
                          {line.stock.min_threshold} {line.stock.unit}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: isOut ? colors.accent.dangerBg : colors.accent.warningBg,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: isOut ? colors.accent.danger : colors.accent.warning },
                          ]}
                        >
                          {isOut ? 'Rupture' : 'Stock bas'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.shoppingCardDetails}>
                      <View style={styles.toBuyBox}>
                        <Text style={styles.toBuyLabel}>À acheter :</Text>
                        <Text style={styles.toBuyQty}>
                          + {formatQty(line.qty, line.stock.unit)}
                        </Text>
                      </View>
                      {line.estimate ? (
                        <Text style={styles.toBuyEst}>
                          ~ {formatFCFA(line.estimate)}
                        </Text>
                      ) : (
                        <Text style={styles.toBuyEstMuted}>Prix non défini</Text>
                      )}
                    </View>
                  </View>
                );
              })
            )}

            <View style={styles.infoBox}>
              <Sparkles size={20} color={colors.primary.DEFAULT} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Fonctionnement du panier</Text>
                <Text style={styles.infoText}>
                  Les produits entrent ici dès que leur stock descend sous le seuil d'alerte. Lors de la validation, le
                  montant payé est imputé à vos comptes et vos réserves remontent instantanément.
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Modale d'ajout / modification */}
      <StockEditorModal
        visible={editorOpen}
        stockToEdit={editingStock}
        onClose={() => setEditorOpen(false)}
        onSubmit={async (input) => {
          if (editingStock) {
            return await editStock(uid, editingStock.id, input);
          } else {
            return await addStock(uid, input);
          }
        }}
      />

      {/* Modale de réapprovisionnement */}
      <RestockModal
        visible={restockModalOpen}
        lines={shoppingLines}
        accounts={accounts}
        onClose={() => setRestockModalOpen(false)}
        onConfirm={async (accountId, totalPaid, items) => {
          const failure = await restock({
            userId: uid,
            accountId,
            totalAmount: totalPaid,
            items,
          });
          if (!failure) {
            showToast({
              kind: 'success',
              title: 'Courses enregistrées !',
              message: `${items.length} produit${items.length > 1 ? 's' : ''} réapprovisionné${
                items.length > 1 ? 's' : ''
              }.`,
            });
            setActiveTab('STOCKS');
          }
          return failure;
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addBtnText: {
    color: colors.text.inverted,
    fontWeight: typography.weights.bold,
  },
  mainTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
    paddingHorizontal: spacing.base,
  },
  mainTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.md,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  mainTabItemOn: {
    borderBottomColor: colors.primary.DEFAULT,
  },
  mainTabText: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
  },
  mainTabTextOn: {
    color: colors.primary.DEFAULT,
    fontWeight: typography.weights.bold,
  },
  tabBadge: {
    backgroundColor: colors.accent.danger,
    borderRadius: radii.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tabBadgeText: {
    color: colors.text.inverted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
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
  heroLabel: {
    fontSize: typography.sizes.caption,
    letterSpacing: 1,
    color: colors.primary.container,
    fontWeight: typography.weights.semibold,
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
  heroStats: {
    flexDirection: 'row',
    backgroundColor: colors.primary.dark,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary.light,
    alignItems: 'center',
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatNum: {
    fontSize: 26,
    fontWeight: typography.weights.extrabold,
  },
  heroStatLabel: {
    fontSize: typography.sizes.caption,
    color: colors.primary.container,
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.primary.light,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary.container,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  heroCtaText: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.bold,
    color: colors.primary.dark,
  },
  heroShopping: {
    backgroundColor: colors.primary.subtle,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary.container,
  },
  heroShoppingAmount: {
    fontSize: 34,
    fontWeight: typography.weights.extrabold,
    color: colors.primary.DEFAULT,
  },
  heroShoppingSub: {
    fontSize: typography.sizes.bodySm,
    color: colors.text.secondary,
  },
  validerCoursesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: radii.lg,
    minHeight: 50,
    marginTop: spacing.xs,
  },
  validerCoursesText: {
    color: colors.text.inverted,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.surface.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    minHeight: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.body,
    color: colors.text.primary,
    outlineStyle: 'none',
  } as never,
  clearSearch: {
    fontSize: typography.sizes.bodySm,
    color: colors.primary.DEFAULT,
    fontWeight: typography.weights.semibold,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  filterChipOn: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  filterChipText: {
    fontSize: typography.sizes.bodySm,
    color: colors.text.secondary,
  },
  filterChipTextOn: {
    color: colors.text.inverted,
    fontWeight: typography.weights.bold,
  },
  catsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  catChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.brands.waveBg,
  },
  catChipOn: {
    backgroundColor: colors.primary.DEFAULT,
  },
  catChipText: {
    fontSize: typography.sizes.caption,
    color: colors.text.primary,
  },
  catChipTextOn: {
    color: colors.text.inverted,
    fontWeight: typography.weights.bold,
  },
  stockCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: spacing.base,
    gap: spacing.sm,
  },
  cardOut: {
    borderLeftWidth: 4,
    borderLeftColor: colors.accent.danger,
  },
  cardLow: {
    borderLeftWidth: 4,
    borderLeftColor: colors.accent.warning,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardName: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  cardCat: {
    fontSize: typography.sizes.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
  gaugeBox: {
    gap: 4,
    backgroundColor: colors.surface.muted,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  gaugeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  gaugeLabel: {
    fontSize: typography.sizes.caption,
    color: colors.text.secondary,
  },
  gaugeVal: {
    fontWeight: typography.weights.bold,
  },
  gaugeTarget: {
    fontSize: typography.sizes.caption,
    color: colors.text.muted,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceHint: {
    fontSize: typography.sizes.caption,
    color: colors.text.secondary,
  },
  lastRestock: {
    fontSize: typography.sizes.caption,
    color: colors.text.muted,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surface.muted,
    paddingTop: spacing.sm,
  },
  cardStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: 2,
  },
  cardStepBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardStepText: {
    minWidth: 70,
    textAlign: 'center',
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    paddingHorizontal: spacing.xs,
  },
  iconAction: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.surface.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shoppingCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: spacing.base,
    gap: spacing.sm,
  },
  shoppingCardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  shoppingCardName: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  shoppingCardSub: {
    fontSize: typography.sizes.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  shoppingCardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    backgroundColor: colors.primary.subtle,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  toBuyBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  toBuyLabel: {
    fontSize: typography.sizes.bodySm,
    color: colors.text.secondary,
  },
  toBuyQty: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.extrabold,
    color: colors.primary.DEFAULT,
  },
  toBuyEst: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  toBuyEstMuted: {
    fontSize: typography.sizes.caption,
    color: colors.text.muted,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface.card,
    borderRadius: radii.xl,
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: typography.sizes.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  emptyCtaText: {
    color: colors.text.inverted,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.bodySm,
  },
  infoBox: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.brands.waveBg,
    borderRadius: radii.xl,
    padding: spacing.base,
  },
  infoTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  infoText: {
    marginTop: 2,
    fontSize: typography.sizes.bodySm,
    lineHeight: 19,
    color: colors.text.secondary,
  },
});
