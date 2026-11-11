/**
 * Carte « Montant » — GERETOU
 * Maquettes Stitch « Nouvelle Dépense » / « Nouveau Revenu » :
 * gros montant saisissable (clavier numérique du téléphone), effacer, raccourcis +1 000…
 */

import React, { useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, TextInputInstance } from 'react-native';
import { Delete, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme/tokens';
import { MAX_AMOUNT, parseAmountInput, formatAmountInput } from './amountFormat';


interface AmountCardProps {
  label: string;
  amount: number;
  onChange: (amount: number) => void;
  presets: number[];
  /** Couleur du montant (rouge dépense, vert revenu). */
  tone: 'expense' | 'income';
}

export const AmountCard: React.FC<AmountCardProps> = ({ label, amount, onChange, presets, tone }) => {
  const inputRef = useRef<TextInputInstance>(null);
  const color = tone === 'expense' ? colors.text.primary : colors.primary.DEFAULT;
  const shown = formatAmountInput(amount);
  // Le champ prend la largeur de son contenu, pour que « FCFA » suive le montant.
  const inputWidth = Math.max(1, shown.replace(/ /g, '').length) * 25 + (shown.split(' ').length - 1) * 10 + 8;

  const tap = (next: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onChange(Math.min(next, MAX_AMOUNT));
  };

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.modePill}>
          <Zap size={12} color={colors.primary.DEFAULT} />
          <Text style={styles.modeText}>Mode rapide</Text>
        </View>
      </View>

      <Pressable style={styles.amountRow} onPress={() => inputRef.current?.focus()}>
        {tone === 'income' && amount > 0 ? <Text style={[styles.amount, { color }]}>+</Text> : null}
        <TextInput
          ref={inputRef}
          value={shown}
          onChangeText={(t) => onChange(parseAmountInput(t))}
          placeholder="0"
          placeholderTextColor={colors.text.muted}
          keyboardType="number-pad"
          inputMode="numeric"
          accessibilityLabel={`${label} en FCFA`}
          style={[styles.amount, styles.amountInput, { color, width: inputWidth }]}
        />
        <Text style={styles.unit}>FCFA</Text>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => tap(Math.floor(amount / 10))}
          onLongPress={() => tap(0)}
          disabled={amount === 0}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Effacer le dernier chiffre (appui long : tout effacer)"
          style={({ pressed }) => [styles.backspace, (pressed || amount === 0) && { opacity: 0.4 }]}
        >
          <Delete size={24} color={colors.text.secondary} />
        </Pressable>
      </Pressable>

      <View style={styles.divider} />

      <View style={styles.presets}>
        {presets.map((p, i) => {
          const strong = i === presets.length - 1;
          return (
            <Pressable
              key={p}
              onPress={() => tap(amount + p)}
              accessibilityRole="button"
              accessibilityLabel={`Ajouter ${formatAmountInput(p)} FCFA`}
              style={({ pressed }) => [
                styles.preset,
                tone === 'income' && styles.presetIncome,
                strong && tone === 'income' && styles.presetStrong,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.presetText, strong && tone === 'income' && { color: colors.text.inverted }]}>
                +{formatAmountInput(p)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: spacing.base,
  },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold, letterSpacing: 1, color: colors.text.secondary, textTransform: 'uppercase' },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary.container,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  modeText: { fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, color: colors.primary.DEFAULT },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.sm },
  amount: { fontSize: 44, fontWeight: typography.weights.extrabold, letterSpacing: -1 },
  amountInput: { flexShrink: 1, maxWidth: '75%', padding: 0, borderWidth: 0, outlineStyle: 'none' } as never,
  unit: { marginLeft: spacing.xs, fontSize: typography.sizes.title, fontWeight: typography.weights.semibold, color: colors.text.secondary },
  backspace: { alignSelf: 'center', padding: spacing.xs },
  divider: { height: 1, backgroundColor: colors.surface.border, marginVertical: spacing.md },
  presets: { flexDirection: 'row', gap: spacing.sm },
  preset: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.brands.waveBg,
  },
  presetIncome: { backgroundColor: colors.primary.subtle, borderWidth: 1, borderColor: colors.primary.container },
  presetStrong: { backgroundColor: colors.primary.DEFAULT, borderColor: colors.primary.DEFAULT },
  presetText: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold, color: colors.text.primary },
});
