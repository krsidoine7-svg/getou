/**
 * Modale de Réapprovisionnement & Transformation en Dépense — GERETOU
 * Valide le panier de courses, débite le portefeuille sélectionné et réincrémente les stocks.
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { X, TriangleAlert, Check, ShoppingBag, Wallet } from 'lucide-react-native';
import { AmountCard } from '../transaction/AmountCard';
import { ShoppingLine, formatQty } from '../../services/stocks/stockCore';
import { StockRecord } from '../../services/stocks/stockRepo';
import { Account } from '../../types/database';
import { ACCOUNT_BRAND } from '../../theme/brand';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

interface Props {
  visible: boolean;
  lines: ShoppingLine<StockRecord>[];
  accounts: Account[];
  onClose: () => void;
  onConfirm: (
    accountId: string | null,
    totalPaid: number,
    items: { stockId: string; boughtQty: number; unitPrice?: number | null }[]
  ) => Promise<string | null>;
}

export const RestockModal: React.FC<Props> = ({
  visible,
  lines,
  accounts,
  onClose,
  onConfirm,
}) => {
  const [amountPaid, setAmountPaid] = useState(0);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const estimatedTotal = lines.reduce((sum, l) => sum + (l.estimate ?? 0), 0);

  useEffect(() => {
    if (!visible) return;
    setAmountPaid(estimatedTotal);
    setAccountId(accounts[0]?.id ?? null);
    const initialQty: Record<string, number> = {};
    for (const l of lines) {
      initialQty[l.stock.id] = l.qty;
    }
    setQuantities(initialQty);
    setError(null);
  }, [visible, lines.length, estimatedTotal]);

  const activeAccount = accounts.find((a) => a.id === accountId);
  const isShort = activeAccount && activeAccount.balance < amountPaid;

  const handleSubmit = async () => {
    const items = lines.map((l) => ({
      stockId: l.stock.id,
      boughtQty: quantities[l.stock.id] ?? l.qty,
      unitPrice: l.stock.estimated_unit_price,
    }));

    setBusy(true);
    const failure = await onConfirm(accountId, amountPaid, items);
    setBusy(false);
    if (failure) {
      setError(failure);
      return;
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Valider les courses</Text>
              <Text style={styles.subtitle}>
                {lines.length} produit{lines.length > 1 ? 's' : ''} à réapprovisionner
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            >
              <X size={22} color={colors.text.primary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* Montant réellement payé */}
            <AmountCard
              label="Montant total payé"
              amount={amountPaid}
              onChange={setAmountPaid}
              presets={[1000, 5000, 10000, 25000]}
              tone="expense"
            />

            {estimatedTotal > 0 && amountPaid !== estimatedTotal ? (
              <Pressable
                onPress={() => setAmountPaid(estimatedTotal)}
                style={styles.resetBtn}
                accessibilityRole="button"
              >
                <Text style={styles.resetText}>
                  Rétablir l'estimation : {formatFCFA(estimatedTotal)}
                </Text>
              </Pressable>
            ) : null}

            {/* Portefeuille payeur */}
            <Text style={styles.label}>Payé avec quel compte ?</Text>
            {accounts.map((a) => {
              const on = a.id === accountId;
              const short = on && a.balance < amountPaid;
              const brand = ACCOUNT_BRAND[a.type];
              return (
                <Pressable
                  key={a.id}
                  onPress={() => setAccountId(a.id)}
                  style={[styles.accountCard, on && styles.accountCardOn]}
                >
                  <View style={[styles.accountIcon, { backgroundColor: brand.bg }]}>
                    <Text style={[styles.accountInitial, { color: brand.fg }]}>
                      {a.name.charAt(0)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.accountName}>{a.name}</Text>
                    <Text
                      style={[
                        styles.accountBalance,
                        short && { color: colors.accent.danger, fontWeight: typography.weights.bold },
                      ]}
                    >
                      Solde : {formatFCFA(a.balance)}
                      {short ? ' · Solde insuffisant' : ''}
                    </Text>
                  </View>
                  <View style={[styles.radio, on && styles.radioOn]} />
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => setAccountId(null)}
              style={[styles.accountCard, accountId === null && styles.accountCardOn]}
            >
              <View style={[styles.accountIcon, { backgroundColor: colors.brands.cashBg }]}>
                <Wallet size={18} color={colors.brands.cash} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.accountName}>Sans compte suivi</Text>
                <Text style={styles.accountBalance}>
                  Réapprovisionne les stocks sans créer de dépense de trésorerie
                </Text>
              </View>
              <View style={[styles.radio, accountId === null && styles.radioOn]} />
            </Pressable>

            {/* Récapitulatif des articles */}
            <Text style={styles.label}>Articles réapprovisionnés</Text>
            <View style={styles.itemsList}>
              {lines.map((l) => (
                <View key={l.stock.id} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{l.stock.name}</Text>
                    <Text style={styles.itemQty}>
                      + {formatQty(quantities[l.stock.id] ?? l.qty, l.stock.unit)}
                    </Text>
                  </View>
                  {l.estimate ? (
                    <Text style={styles.itemEst}>~ {formatFCFA(l.estimate)}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            {error ? (
              <View style={styles.errorBox} accessibilityRole="alert">
                <TriangleAlert size={16} color={colors.accent.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleSubmit}
              disabled={busy || (amountPaid > 0 && isShort)}
              style={({ pressed }) => [
                styles.ctaBtn,
                (busy || (amountPaid > 0 && isShort)) && styles.ctaBtnDisabled,
                pressed && { opacity: 0.85 },
              ]}
            >
              {busy ? (
                <ActivityIndicator color={colors.text.inverted} />
              ) : (
                <Check size={18} color={colors.text.inverted} />
              )}
              <Text style={styles.ctaText}>
                Confirmer l'achat {amountPaid > 0 ? `(${formatFCFA(amountPaid)})` : ''}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '94%',
    backgroundColor: colors.surface.canvas,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
  },
  title: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: typography.sizes.bodySm,
    color: colors.text.secondary,
  },
  content: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  resetBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary.subtle,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  resetText: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.semibold,
    color: colors.primary.DEFAULT,
  },
  label: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: spacing.md,
  },
  accountCardOn: {
    borderWidth: 2,
    borderColor: colors.primary.DEFAULT,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInitial: {
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
  },
  accountName: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  accountBalance: {
    fontSize: typography.sizes.bodySm,
    color: colors.text.secondary,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.surface.border,
  },
  radioOn: {
    borderWidth: 7,
    borderColor: colors.primary.DEFAULT,
  },
  itemsList: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.muted,
    paddingBottom: spacing.xs,
  },
  itemName: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  itemQty: {
    fontSize: typography.sizes.bodySm,
    color: colors.primary.DEFAULT,
    fontWeight: typography.weights.bold,
  },
  itemEst: {
    fontSize: typography.sizes.bodySm,
    color: colors.text.secondary,
    fontWeight: typography.weights.medium,
  },
  footer: {
    padding: spacing.base,
    backgroundColor: colors.surface.card,
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.dangerBg,
    borderColor: colors.accent.dangerBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: {
    flex: 1,
    color: colors.accent.danger,
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.semibold,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 54,
    borderRadius: radii.lg,
    backgroundColor: colors.primary.DEFAULT,
  },
  ctaBtnDisabled: {
    backgroundColor: colors.text.muted,
  },
  ctaText: {
    color: colors.text.inverted,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
});
