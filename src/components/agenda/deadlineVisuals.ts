/**
 * Icônes et couleurs des types d'échéance — GERETOU
 */

import { Zap, House, Users, Wifi, Tag, LucideIcon } from 'lucide-react-native';
import type { DeadlineKind, DeadlinePriority } from '../../services/agenda/deadlineCore';
import { colors } from '../../theme/tokens';

export const KIND_VISUALS: Record<DeadlineKind, { Icon: LucideIcon; fg: string; bg: string }> = {
  BILL: { Icon: Zap, fg: '#DC2626', bg: '#FEE2E2' },
  RENT: { Icon: House, fg: '#7C3AED', bg: '#EDE9FE' },
  TONTINE: { Icon: Users, fg: '#B45309', bg: '#FEF3C7' },
  SUBSCRIPTION: { Icon: Wifi, fg: '#EA580C', bg: '#FFEDD5' },
  OTHER: { Icon: Tag, fg: colors.text.secondary, bg: colors.surface.muted },
};

export const PRIORITY_LABELS: Record<DeadlinePriority, string> = {
  NORMAL: 'Standard',
  HIGH: 'Important',
  VITAL: 'Vital / coupure',
};
