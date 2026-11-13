/**
 * Modale d'ajout / modification de produit en stock — GERETOU
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { X, TriangleAlert, Check, Plus, Minus } from 'lucide-react-native';
import {
  StockCategory,
  STOCK_CATEGORIES,
  STOCK_UNITS,
  StockInput,
  stepFor,
  roundQty,
  parseQty,
  defaultTarget,
} from '../../services/stocks/stockCore';
import { StockRecord } from '../../services/stocks/stockRepo';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

interface Props {
  visible: boolean;
  stockToEdit?: StockRecord | null;
  onClose: () => void;
  onSubmit: (input: StockInput) => Promise<string | null>;
}

export const StockEditorModal: React.FC<Props> = ({
  visible,
  stockToEdit,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<StockCategory>('FOOD');
  const [unit, setUnit] = useState<string>('kg');
  const [currentQty, setCurrentQty] = useState(1);
  const [minThreshold, setMinThreshold] = useState(1);
  const [targetQty, setTargetQty] = useState<number | null>(null);
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (stockToEdit) {
      setName(stockToEdit.name);
      setCategory(stockToEdit.category as StockCategory);
      setUnit(stockToEdit.unit);
      setCurrentQty(stockToEdit.current_qty);
      setMinThreshold(stockToEdit.min_threshold);
      setTargetQty(stockToEdit.target_qty);
      setUnitPrice(stockToEdit.estimated_unit_price ? String(stockToEdit.estimated_unit_price) : '');
    } else {
      setName('');
      setCategory('FOOD');
      setUnit('kg');
      setCurrentQty(1);
      setMinThreshold(1);
      setTargetQty(null);
      setUnitPrice('');
    }
    setError(null);
  }, [visible, stockToEdit]);

  const step = stepFor(unit);

  const handleSave = async () => {
    const parsedPrice = unitPrice.trim() ? Number(unitPrice.replace(/\s+/g, '')) : null;
    const input: StockInput = {
      name,
      category,
      unit,
      currentQty: roundQty(currentQty),
      minThreshold: roundQty(minThreshold),
      targetQty: targetQty !== null ? roundQty(targetQty) : null,
      unitPrice: parsedPrice && Number.isFinite(parsedPrice) ? parsedPrice : null,
    };

    setBusy(true);
    const failure = await onSubmit(input);
    setBusy(false);
    if (failure) {
      setError(failure);
      return;
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.backdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoid}
          >
            <View style={styles.sheet}>
              <View style={styles.header}>
                <Text style={styles.title}>
                  {stockToEdit ? 'Modifier le produit' : 'Nouveau produit en stock'}
                </Text>
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
            {/* Nom */}
            <Text style={styles.label}>Nom du produit</Text>
            <View style={styles.field}>
              <TextInput
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  setError(null);
                }}
                placeholder="Ex : Riz Parfumé 25kg, Huile Dinor…"
                placeholderTextColor={colors.text.muted}
                maxLength={60}
                style={styles.input}
              />
            </View>

            {/* Catégorie */}
            <Text style={styles.label}>Catégorie</Text>
            <View style={styles.chipsWrap}>
              {STOCK_CATEGORIES.map((c) => {
                const on = category === c.key;
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => setCategory(c.key)}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Unité */}
            <Text style={styles.label}>Unité de mesure</Text>
            <View style={styles.chipsWrap}>
              {STOCK_UNITS.map((u) => {
                const on = unit === u;
                return (
                  <Pressable
                    key={u}
                    onPress={() => setUnit(u)}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{u}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Quantité actuelle */}
            <View style={styles.stepperCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepperTitle}>Quantité actuelle en réserve</Text>
                <Text style={styles.stepperSub}>
                  En stock dans vos placards ou garde-manger
                </Text>
              </View>
              <View style={styles.stepper}>
                <Pressable
                  onPress={() => setCurrentQty((q) => Math.max(0, roundQty(q - step)))}
                  style={styles.stepBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Diminuer"
                >
                  <Minus size={18} color={colors.text.primary} />
                </Pressable>
                <Text style={styles.stepVal}>
                  {currentQty} {unit}
                </Text>
                <Pressable
                  onPress={() => setCurrentQty((q) => roundQty(q + step))}
                  style={styles.stepBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Augmenter"
                >
                  <Plus size={18} color={colors.text.primary} />
                </Pressable>
              </View>
            </View>

            {/* Seuil minimum d'alerte */}
            <View style={styles.stepperCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepperTitle}>Seuil d'alerte (Stock bas)</Text>
                <Text style={styles.stepperSub}>
                  Ajouté automatiquement à la liste de courses si la réserve descend à ce niveau
                </Text>
              </View>
              <View style={styles.stepper}>
                <Pressable
                  onPress={() => setMinThreshold((m) => Math.max(0, roundQty(m - step)))}
                  style={styles.stepBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Diminuer le seuil"
                >
                  <Minus size={18} color={colors.text.primary} />
                </Pressable>
                <Text style={styles.stepVal}>
                  {minThreshold} {unit}
                </Text>
                <Pressable
                  onPress={() => setMinThreshold((m) => roundQty(m + step))}
                  style={styles.stepBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Augmenter le seuil"
                >
                  <Plus size={18} color={colors.text.primary} />
                </Pressable>
              </View>
            </View>

            {/* Niveau plein (Cible après réappro) */}
            <View style={styles.stepperCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepperTitle}>Niveau « Plein » (Cible)</Text>
                <Text style={styles.stepperSub}>
                  Quantité souhaitée après un passage au marché
                </Text>
              </View>
              <View style={styles.stepper}>
                <Pressable
                  onPress={() => {
                    const current = targetQty ?? defaultTarget(minThreshold);
                    setTargetQty(Math.max(minThreshold + step, roundQty(current - step)));
                  }}
                  style={styles.stepBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Diminuer la cible"
                >
                  <Minus size={18} color={colors.text.primary} />
                </Pressable>
                <Text style={styles.stepVal}>
                  {targetQty ?? defaultTarget(minThreshold)} {unit}
                </Text>
                <Pressable
                  onPress={() => {
                    const current = targetQty ?? defaultTarget(minThreshold);
                    setTargetQty(roundQty(current + step));
                  }}
                  style={styles.stepBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Augmenter la cible"
                >
                  <Plus size={18} color={colors.text.primary} />
                </Pressable>
              </View>
            </View>

            {/* Prix unitaire habituel */}
            <Text style={styles.label}>Prix habituel estimé (FCFA par unité, facultatif)</Text>
            <View style={styles.field}>
              <TextInput
                value={unitPrice}
                onChangeText={setUnitPrice}
                placeholder="Ex : 650, 14 500…"
                placeholderTextColor={colors.text.muted}
                keyboardType="numeric"
                style={styles.input}
              />
              <Text style={styles.unitSuffix}>FCFA / {unit}</Text>
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
              onPress={handleSave}
              disabled={busy || !name.trim()}
              style={({ pressed }) => [
                styles.saveBtn,
                (busy || !name.trim()) && styles.saveBtnDisabled,
                pressed && { opacity: 0.85 },
              ]}
            >
              {busy ? (
                <ActivityIndicator color={colors.text.inverted} />
              ) : (
                <Check size={18} color={colors.text.inverted} />
              )}
              <Text style={styles.saveBtnText}>
                {stockToEdit ? 'Enregistrer les modifications' : 'Ajouter au stock'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  </TouchableWithoutFeedback>
</Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
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
  content: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  label: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.surface.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.body,
    color: colors.text.primary,
    outlineStyle: 'none',
  } as never,
  unitSuffix: {
    fontSize: typography.sizes.bodySm,
    color: colors.text.secondary,
    fontWeight: typography.weights.medium,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.brands.waveBg,
  },
  chipOn: {
    backgroundColor: colors.primary.DEFAULT,
  },
  chipText: {
    fontSize: typography.sizes.bodySm,
    color: colors.text.primary,
  },
  chipTextOn: {
    color: colors.text.inverted,
    fontWeight: typography.weights.bold,
  },
  stepperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  stepperTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  stepperSub: {
    fontSize: typography.sizes.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: 2,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepVal: {
    minWidth: 70,
    textAlign: 'center',
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    paddingHorizontal: spacing.xs,
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
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.primary.DEFAULT,
  },
  saveBtnDisabled: {
    backgroundColor: colors.text.muted,
  },
  saveBtnText: {
    color: colors.text.inverted,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
});
