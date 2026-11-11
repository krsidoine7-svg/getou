/**
 * Grille des catégories + création — GERETOU
 * Maquette Stitch « Nouvelle Dépense » : tuiles 2 colonnes (icône, nom, précision),
 * tuile « Nouvelle » ouvrant une modale de création enregistrée en base.
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import * as Haptics from 'expo-haptics';
import { CircleCheck, CirclePlus } from 'lucide-react-native';
import { CategoryIcon, CATEGORY_ICON_CHOICES } from '../common/AppIcons';
import { Category } from '../../types/database';
import { categoryDisplay } from '../../services/transaction/labels';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { colors, radii, spacing, typography } from '../../theme/tokens';

interface CategoryGridProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  onAddCategory: (name: string, icon: string, color: string) => Promise<boolean>;
  label?: string;
}

/** Fond pâle dérivé de la couleur de la catégorie (#RRGGBB → rgba 12 %). */
function tint(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return colors.surface.muted;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0.12)`;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onAddCategory,
  label = 'Catégorie',
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('tag');
  const [loading, setLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const select = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    onSelectCategory(id);
  };

  const closeModal = () => {
    setModalVisible(false);
    setModalError(null);
  };

  const create = async () => {
    const name = newCatName.trim();
    if (!name) return setModalError('Donnez un nom à la catégorie.');
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      return setModalError('Cette catégorie existe déjà.');
    }
    setLoading(true);
    const ok = await onAddCategory(name, selectedIcon, colors.primary.DEFAULT);
    setLoading(false);
    if (!ok) return setModalError('Impossible de créer la catégorie. Réessayez.');
    setNewCatName('');
    setSelectedIcon('tag');
    closeModal();
  };

  return (
    <View>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.grid}>
        {categories.map((cat) => {
          const selected = cat.id === selectedCategoryId;
          const { short, hint } = categoryDisplay(cat);
          return (
            <Pressable
              key={cat.id}
              onPress={() => select(cat.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={cat.name}
              style={[styles.tile, selected && styles.tileSelected]}
            >
              <View style={[styles.iconBox, { backgroundColor: selected ? colors.primary.DEFAULT : tint(cat.color) }]}>
                <CategoryIcon name={cat.icon} size={20} color={selected ? colors.text.inverted : cat.color || colors.text.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{short}</Text>
                <Text style={styles.hint} numberOfLines={1}>{hint}</Text>
              </View>
              {selected ? <CircleCheck size={18} color={colors.primary.DEFAULT} /> : null}
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Nouvelle catégorie"
          style={({ pressed }) => [styles.tile, styles.newTile, pressed && { opacity: 0.7 }]}
        >
          <CirclePlus size={20} color={colors.text.secondary} />
          <Text style={styles.newText}>Nouvelle</Text>
        </Pressable>
      </View>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Nouvelle catégorie</Text>
            <Input
              label="Nom de la catégorie"
              value={newCatName}
              onChangeText={(t) => {
                setNewCatName(t);
                setModalError(null);
              }}
              placeholder="ex : Coiffure, Tontine, Scolarité…"
              error={modalError ?? undefined}
            />
            <Text style={styles.iconLabel}>Icône</Text>
            <View style={styles.icons}>
              {CATEGORY_ICON_CHOICES.map((ic) => (
                <Pressable
                  key={ic}
                  onPress={() => setSelectedIcon(ic)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selectedIcon === ic }}
                  style={[styles.iconChoice, selectedIcon === ic && styles.iconChoiceSelected]}
                >
                  <CategoryIcon name={ic} size={22} color={selectedIcon === ic ? colors.primary.DEFAULT : colors.text.secondary} />
                </Pressable>
              ))}
            </View>
            <View style={styles.actions}>
              <Button title="Annuler" onPress={closeModal} variant="outline" style={{ flex: 1 }} />
              <Button title="Créer" onPress={create} variant="primary" loading={loading} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.semibold,
    letterSpacing: 1,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 64,
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: spacing.sm,
  },
  tileSelected: { borderWidth: 2, borderColor: colors.primary.DEFAULT, backgroundColor: colors.primary.subtle },
  iconBox: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text.primary },
  hint: { fontSize: typography.sizes.caption, color: colors.text.secondary },
  newTile: { justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1.5 },
  newText: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text.secondary },
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'center', padding: spacing.xl },
  modal: { backgroundColor: colors.surface.card, borderRadius: radii.xl, padding: spacing.lg },
  modalTitle: { fontSize: typography.sizes.title, fontWeight: typography.weights.bold, color: colors.text.primary, marginBottom: spacing.base },
  iconLabel: { fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold, color: colors.text.primary, marginBottom: spacing.sm },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  iconChoice: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChoiceSelected: { borderWidth: 2, borderColor: colors.primary.DEFAULT, backgroundColor: colors.primary.subtle },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
