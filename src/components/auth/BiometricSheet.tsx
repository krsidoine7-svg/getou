/**
 * Panneau « Vérification biométrique » — GERETOU
 * Maquette Stitch « Reconnaissance Biométrique en Cours ».
 * Affiché pendant qu'une demande biométrique système est en cours.
 */

import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { Fingerprint, ScanFace, Grip } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme/tokens';

interface BiometricSheetProps {
  visible: boolean;
  biometryType: string;
  /** « Utiliser le code PIN à la place ». */
  onUsePin: () => void;
}

export const BiometricSheet: React.FC<BiometricSheetProps> = ({ visible, biometryType, onUsePin }) => {
  const pulse = useRef(new Animated.Value(0)).current;
  const isFace = biometryType === 'Face ID';
  const Icon = isFace ? ScanFace : Fingerprint;

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [visible]);

  const scale = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.08, 1] });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onUsePin}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.badge}>
            <Fingerprint size={14} color={colors.primary.DEFAULT} />
            <Text style={styles.badgeText}>AUTHENTIFICATION GERETOU</Text>
          </View>
          <Text style={styles.title}>Vérification biométrique</Text>
          <Text style={styles.subtitle}>
            {isFace ? "Regardez l'écran de votre téléphone" : "Placez votre doigt sur le capteur d'empreinte"}
          </Text>

          <Animated.View style={[styles.ring, { transform: [{ scale }] }]}>
            <View style={styles.inner}>
              <Icon size={56} color={colors.primary.DEFAULT} strokeWidth={1.6} />
            </View>
          </Animated.View>

          <View style={styles.status}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>En attente de votre {isFace ? 'visage' : 'empreinte'}…</Text>
          </View>

          <Pressable
            onPress={onUsePin}
            accessibilityRole="button"
            style={({ pressed }) => [styles.pinBtn, pressed && { opacity: 0.7 }]}
          >
            <Grip size={20} color={colors.text.primary} />
            <Text style={styles.pinBtnText}>Utiliser le code PIN à la place</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  handle: { width: 48, height: 5, borderRadius: 3, backgroundColor: colors.surface.border, marginBottom: spacing.lg },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary.subtle,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  badgeText: { fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, color: colors.primary.DEFAULT, letterSpacing: 0.5 },
  title: { marginTop: spacing.base, fontSize: typography.sizes.headline, fontWeight: typography.weights.bold, color: colors.text.primary },
  subtitle: { marginTop: spacing.xs, fontSize: typography.sizes.body, color: colors.text.secondary, textAlign: 'center' },
  ring: {
    marginVertical: spacing.xl,
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: colors.surface.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 1.5,
    borderColor: colors.primary.container,
    backgroundColor: colors.primary.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary.container,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary.DEFAULT },
  statusText: { fontSize: typography.sizes.bodySm, color: colors.primary.dark },
  pinBtn: {
    marginTop: spacing.xl,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.brands.waveBg,
  },
  pinBtnText: { fontSize: typography.sizes.subtitle, fontWeight: typography.weights.semibold, color: colors.text.primary },
});
