/**
 * Grille des Catégories & Création Personnalisée — Forest Ledger
 * Tuiles iconiques en 2 colonnes avec modale d'ajout immédiat.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Category } from '../../types/database';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { colors, radii, spacing, typography } from '../../theme/tokens';

interface CategoryGridProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  onAddCategory: (name: string, icon: string, color: string) => Promise<boolean>;
  type?: 'EXPENSE' | 'INCOME';
}

const EMOJI_MAP: { [key: string]: string } = {
  'shopping-cart': '🛒',
  navigation: '🚗',
  zap: '⚡',
  home: '🏠',
  activity: '💊',
  coffee: '☕',
  'alert-triangle': '⚠️',
  briefcase: '💼',
  'trending-up': '📈',
  gift: '🎁',
  handshake: '🤝',
  tag: '🏷️',
};

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onAddCategory,
  type = 'EXPENSE',
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('tag');
  const [loading, setLoading] = useState(false);

  const handleSelect = (id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Ignorer
    }
    onSelectCategory(id);
  };

  const handleCreate = async () => {
    if (!newCatName.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un nom de catégorie.');
      return;
    }
    setLoading(true);
    const success = await onAddCategory(newCatName.trim(), selectedIcon, colors.primary.DEFAULT);
    setLoading(false);
    if (success) {
      setNewCatName('');
      setModalVisible(false);
    } else {
      Alert.alert('Échec', 'Impossible de créer la catégorie.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          {type === 'EXPENSE' ? 'Catégorie de dépense' : 'Provenance du revenu'}
        </Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Text style={styles.addText}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {categories.map((cat) => {
          const isSelected = cat.id === selectedCategoryId;
          const emoji = EMOJI_MAP[cat.icon] || '🏷️';
          return (
            <TouchableOpacity
              key={cat.id}
              activeOpacity={0.8}
              onPress={() => handleSelect(cat.id)}
              style={[
                styles.tile,
                isSelected ? styles.tileSelected : undefined,
              ]}
            >
              <View style={styles.tileHeader}>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: isSelected ? colors.primary.container : colors.surface.muted },
                  ]}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </View>
                {isSelected ? (
                  <View style={styles.checkBadge}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                ) : null}
              </View>

              <Text
                style={[
                  styles.catName,
                  isSelected ? styles.catNameSelected : undefined,
                ]}
                numberOfLines={1}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Tuile + Nouvelle Catégorie */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setModalVisible(true)}
          style={styles.newTile}
        >
          <View style={styles.newIconBox}>
            <Text style={styles.newPlusText}>+</Text>
          </View>
          <Text style={styles.newTileText}>Autre</Text>
        </TouchableOpacity>
      </View>

      {/* Modale d'ajout rapide */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nouvelle Catégorie</Text>
            <Input
              label="Nom de la catégorie"
              value={newCatName}
              onChangeText={setNewCatName}
              placeholder="ex: Coiffure, Carburant moto..."
            />

            <Text style={styles.iconSelectLabel}>Choisir une icône :</Text>
            <View style={styles.iconsRow}>
              {['tag', 'shopping-cart', 'navigation', 'coffee', 'activity', 'gift'].map((ic) => (
                <TouchableOpacity
                  key={ic}
                  onPress={() => setSelectedIcon(ic)}
                  style={[
                    styles.iconChoice,
                    selectedIcon === ic ? styles.iconChoiceSelected : undefined,
                  ]}
                >
                  <Text style={styles.iconChoiceEmoji}>{EMOJI_MAP[ic] || '🏷️'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Annuler"
                onPress={() => setModalVisible(false)}
                variant="outline"
                style={{ flex: 1, marginRight: spacing.sm }}
              />
              <Button
                title="Créer"
                onPress={handleCreate}
                variant="primary"
                loading={loading}
                style={{ flex: 1, marginLeft: spacing.sm }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  addText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.primary.DEFAULT,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tile: {
    width: '48.5%',
    backgroundColor: colors.surface.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  tileSelected: {
    borderColor: colors.primary.DEFAULT,
    borderWidth: 2,
    backgroundColor: colors.primary.subtle,
  },
  tileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 18,
  },
  checkBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: colors.text.inverted,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  catName: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  catNameSelected: {
    color: colors.primary.DEFAULT,
    fontWeight: typography.weights.bold,
  },
  newTile: {
    width: '48.5%',
    backgroundColor: colors.surface.canvas,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.text.muted,
    padding: spacing.md,
    marginBottom: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newIconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.surface.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  newPlusText: {
    fontSize: 20,
    color: colors.text.secondary,
    fontWeight: typography.weights.bold,
  },
  newTileText: {
    fontSize: typography.sizes.bodySm,
    color: colors.text.secondary,
    fontWeight: typography.weights.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface.card,
    borderRadius: radii.md,
    padding: spacing.xl,
  },
  modalTitle: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.base,
  },
  iconSelectLabel: {
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  iconsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  iconChoice: {
    width: 42,
    height: 42,
    borderRadius: radii.sm,
    backgroundColor: colors.surface.muted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  iconChoiceSelected: {
    borderColor: colors.primary.DEFAULT,
    borderWidth: 2,
    backgroundColor: colors.primary.subtle,
  },
  iconChoiceEmoji: {
    fontSize: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
