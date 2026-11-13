/**
 * Affichage du bandeau de confirmation — GERETOU
 * À placer une seule fois, au-dessus de l'app (App.tsx).
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View, StyleSheet, Platform, StatusBar } from 'react-native';
import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react-native';
import { useToastStore, ToastKind } from '../../store/useToastStore';
import { colors, radii, spacing, typography } from '../../theme/tokens';

const STYLE: Record<ToastKind, { bg: string; border: string; tint: string; Icon: typeof Info }> = {
  success: { bg: colors.primary.DEFAULT, border: colors.primary.dark, tint: colors.text.inverted, Icon: CircleCheck },
  info: { bg: colors.text.primary, border: colors.text.primary, tint: colors.text.inverted, Icon: Info },
  error: { bg: colors.accent.danger, border: colors.accent.danger, tint: colors.text.inverted, Icon: TriangleAlert },
};

const TOAST_TOP = Platform.OS === 'android'
  ? (StatusBar.currentHeight ?? 24) + spacing.sm
  : Platform.OS === 'ios'
  ? 48
  : spacing.base;

export const ToastHost: React.FC = () => {
  const { toast, hide } = useToastStore();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return;
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
  }, [toast?.id]);

  if (!toast) return null;
  const s = STYLE[toast.kind];

  return (
    <View pointerEvents="box-none" style={styles.host}>
      <Animated.View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[
          styles.toast,
          { backgroundColor: s.bg, borderColor: s.border },
          { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
        ]}
      >
        <s.Icon size={22} color={s.tint} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: s.tint }]}>{toast.title}</Text>
          {toast.message ? <Text style={[styles.message, { color: s.tint }]}>{toast.message}</Text> : null}
        </View>
        <Pressable onPress={hide} hitSlop={12} accessibilityRole="button" accessibilityLabel="Fermer">
          <X size={18} color={s.tint} />
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: TOAST_TOP,
    left: spacing.base,
    right: spacing.base,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    width: '100%',
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  title: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
  message: { fontSize: typography.sizes.bodySm, marginTop: 2, opacity: 0.92, lineHeight: 18 },
});
