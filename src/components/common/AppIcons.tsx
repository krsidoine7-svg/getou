/**
 * Icônes métier — GERETOU
 * Correspondance clé → icône Lucide pour les catégories et les provenances de revenu.
 * Les clés de catégorie sont celles stockées en base (colonne categories.icon).
 */

import React from 'react';
import {
  ShoppingCart,
  Car,
  Zap,
  House,
  Pill,
  Coffee,
  TriangleAlert,
  Briefcase,
  TrendingUp,
  Gift,
  Handshake,
  Tag,
  Laptop,
  ShoppingBag,
  Coins,
  LucideIcon,
} from 'lucide-react-native';
import { IncomeProvenance } from '../../types/database';

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'shopping-cart': ShoppingCart, // Alimentation & marché
  navigation: Car, // Transport & carburant
  zap: Zap, // Factures (électricité, eau)
  home: House, // Logement & loyer
  activity: Pill, // Santé & pharmacie
  coffee: Coffee, // Loisirs & sorties
  'alert-triangle': TriangleAlert, // Imprévus & urgences
  briefcase: Briefcase, // Salaire
  'trending-up': TrendingUp, // Freelance & business
  gift: Gift, // Cadeaux & dons
  handshake: Handshake, // Emprunts
  tag: Tag, // Catégorie personnalisée
};

/** Icônes proposées lors de la création d'une catégorie. */
export const CATEGORY_ICON_CHOICES = ['tag', 'shopping-cart', 'navigation', 'coffee', 'activity', 'gift'] as const;

export const PROVENANCE_ICONS: Record<IncomeProvenance, LucideIcon> = {
  SALARY: Briefcase,
  FREELANCE: Laptop,
  SALE: ShoppingBag,
  GIFT: Gift,
  LOAN: Handshake,
  OTHER: Coins,
};

interface CategoryIconProps {
  name?: string | null;
  size?: number;
  color: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, size = 18, color }) => {
  const Icon = (name && CATEGORY_ICONS[name]) || Tag;
  return <Icon size={size} color={color} />;
};
