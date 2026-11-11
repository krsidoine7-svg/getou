/**
 * Découverte & Premier Lancement — GERETOU
 * Maquette Stitch « Découverte & Premier Lancement » : 3 pages à faire glisser.
 */

import React, { useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ScrollViewInstance,
} from 'react-native';
import {
  WifiOff,
  Wallet,
  CloudOff,
  ArrowLeftRight,
  BellRing,
  PiggyBank,
  Lock,
  ChartPie,
  ShoppingCart,
  CalendarClock,
  ArrowRight,
  ShieldCheck,
  LogIn,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme/tokens';

type IconType = typeof Wallet;

interface Slide {
  heroIcon: IconType;
  heroCaption: string;
  title: string;
  highlight: string;
  body: string;
  features: { Icon: IconType; title: string; text: string; tint: string; bg: string }[];
}

export const SLIDES: Slide[] = [
  {
    heroIcon: ShieldCheck,
    heroCaption: 'Souveraineté domestique & financière',
    title: 'Prenez le contrôle total de votre argent,',
    highlight: 'même sans Internet.',
    body:
      'Suivez vos dépenses au marché, gérez vos portefeuilles Mobile Money et vos stocks familiaux. Tout reste sur votre téléphone.',
    features: [
      { Icon: CloudOff, title: 'Zéro cloud obligatoire', text: 'Vos données restent sur cet appareil, protégées par votre code PIN.', tint: colors.primary.DEFAULT, bg: colors.primary.container },
      { Icon: ArrowLeftRight, title: 'Multi-comptes Wave & MoMo', text: 'Vos soldes consolidés en direct, sans dépendance réseau.', tint: colors.brands.wave, bg: colors.brands.waveBg },
      { Icon: BellRing, title: 'Alertes & stocks réels', text: 'Fini les ruptures imprévues de riz, huile et denrées essentielles.', tint: colors.brands.orange, bg: colors.brands.orangeBg },
    ],
  },
  {
    heroIcon: Wallet,
    heroCaption: 'Wave, MoMo, Orange Money et espèces',
    title: 'Tous vos portefeuilles,',
    highlight: 'un seul solde.',
    body:
      "Voyez d'un coup d'œil l'argent disponible et l'argent mis de côté dans vos coffres, sans mélanger les deux.",
    features: [
      { Icon: PiggyBank, title: 'Coffres & épargne', text: "Coffre Wave et MoMo Épargne comptés à part du disponible.", tint: colors.primary.DEFAULT, bg: colors.primary.container },
      { Icon: ArrowLeftRight, title: 'Virements internes neutres', text: "Passer de Wave à MoMo ne fausse ni vos dépenses ni vos revenus.", tint: colors.brands.wave, bg: colors.brands.waveBg },
      { Icon: Lock, title: 'Disponible vs bloqué', text: 'Seul l’argent réellement libre est affiché comme dépensable.', tint: colors.accent.warning, bg: colors.accent.warningBg },
    ],
  },
  {
    heroIcon: ChartPie,
    heroCaption: 'Budgets, courses et échéances',
    title: 'Anticipez au lieu de',
    highlight: 'subir.',
    body:
      'Fixez vos plafonds, laissez GERETOU préparer votre liste de courses et soyez prévenu avant chaque échéance.',
    features: [
      { Icon: ChartPie, title: 'Budgets en direct', text: 'Alerte dès 80 % du plafond atteint, même hors-ligne.', tint: colors.primary.DEFAULT, bg: colors.primary.container },
      { Icon: ShoppingCart, title: 'Liste de courses automatique', text: 'Les produits en stock bas s’y ajoutent tout seuls.', tint: colors.brands.orange, bg: colors.brands.orangeBg },
      { Icon: CalendarClock, title: 'Rappels d’échéances', text: 'Loyer, factures, tontines : rappel 24 h avant.', tint: colors.brands.wave, bg: colors.brands.waveBg },
    ],
  },
];

interface OnboardingScreenProps {
  /** Appelé par « Passer » ou « Commencer » : l'onboarding est terminé. */
  onFinish: () => void;
  /** « J'ai déjà un coffre » : connexion Google + restauration. */
  onLogin: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onFinish, onLogin }) => {
  const { width } = useWindowDimensions();
  const pagerRef = useRef<ScrollViewInstance>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const goTo = (i: number) => {
    pagerRef.current?.scrollTo({ x: i * width, animated: true });
    setIndex(i);
  };

  // onScroll (et non onMomentumScrollEnd) : ce dernier ne se déclenche pas sur le web.
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.min(SLIDES.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width))));
    setIndex((prev) => (prev === i ? prev : i));
  };

  const onPrimary = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (isLast) onFinish();
    else goTo(index + 1);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topRow}>
        <View style={styles.offlinePill}>
          <WifiOff size={14} color={colors.primary.DEFAULT} />
          <Text style={styles.offlinePillText}>100 % Hors-ligne</Text>
        </View>
        {!isLast ? (
          <Pressable onPress={onFinish} hitSlop={12} accessibilityRole="button" style={({ pressed }) => pressed && { opacity: 0.6 }}>
            <Text style={styles.skip}>Passer</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        style={styles.pager}
      >
        {SLIDES.map((slide, i) => (
          <ScrollView key={i} style={{ width }} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={styles.brandPill}>
                  <Wallet size={16} color={colors.text.primary} />
                  <Text style={styles.brandPillText}>Wave • MoMo • Orange</Text>
                </View>
                <View style={styles.localBadge}>
                  <Text style={styles.localBadgeText}>Local</Text>
                </View>
              </View>
              <View style={styles.heroVisual}>
                <View style={styles.heroIconCircle}>
                  <slide.heroIcon size={44} color={colors.primary.DEFAULT} strokeWidth={1.8} />
                </View>
                <Text style={styles.heroCaption}>{slide.heroCaption}</Text>
              </View>
            </View>

            <Text style={styles.title}>
              {slide.title} <Text style={styles.titleHighlight}>{slide.highlight}</Text>
            </Text>
            <Text style={styles.body}>{slide.body}</Text>

            <View style={styles.dots}>
              {SLIDES.map((_, d) => (
                <Pressable
                  key={d}
                  onPress={() => goTo(d)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Page ${d + 1}`}
                  style={[styles.dot, d === index && styles.dotActive]}
                />
              ))}
            </View>

            {slide.features.map(({ Icon, title, text, tint, bg }) => (
              <View key={title} style={styles.feature}>
                <View style={[styles.featureIcon, { backgroundColor: bg }]}>
                  <Icon size={22} color={tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featureTitle}>{title}</Text>
                  <Text style={styles.featureText}>{text}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={onPrimary}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <Text style={styles.ctaText}>{isLast ? "Commencer l'expérience GERETOU" : 'Suivant'}</Text>
          <ArrowRight size={20} color={colors.text.inverted} />
        </Pressable>
        <Pressable
          onPress={onLogin}
          accessibilityRole="button"
          style={({ pressed }) => [styles.loginBtn, pressed && { opacity: 0.7 }]}
        >
          <LogIn size={18} color={colors.text.primary} />
          <Text style={styles.loginText}>J'ai déjà un coffre / Connexion</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface.canvas },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary.container,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  offlinePillText: { fontSize: typography.sizes.bodySm, color: colors.primary.DEFAULT, fontWeight: typography.weights.medium },
  skip: { fontSize: typography.sizes.body, color: colors.text.secondary, fontWeight: typography.weights.medium },
  pager: { flex: 1 },
  page: { paddingHorizontal: spacing.base, paddingBottom: spacing.lg },
  heroCard: {
    backgroundColor: colors.primary.subtle,
    borderRadius: radii.xl,
    padding: spacing.base,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  brandPillText: { fontSize: typography.sizes.bodySm, color: colors.text.primary, fontWeight: typography.weights.semibold },
  localBadge: { backgroundColor: colors.accent.successBg, paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radii.full },
  localBadgeText: { fontSize: typography.sizes.caption, color: colors.primary.DEFAULT, fontWeight: typography.weights.bold },
  heroVisual: { alignItems: 'center', paddingVertical: spacing.lg },
  heroIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroCaption: { fontSize: typography.sizes.bodySm, color: colors.primary.dark, fontWeight: typography.weights.semibold },
  title: {
    marginTop: spacing.xl,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: typography.weights.extrabold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  titleHighlight: { color: colors.primary.DEFAULT },
  body: {
    marginTop: spacing.md,
    fontSize: typography.sizes.body,
    lineHeight: 22,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.surface.border },
  dotActive: { width: 24, backgroundColor: colors.primary.DEFAULT },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  featureIcon: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text.primary },
  featureText: { fontSize: typography.sizes.bodySm, color: colors.text.secondary, marginTop: 2, lineHeight: 18 },
  footer: { paddingHorizontal: spacing.base, paddingTop: spacing.sm, paddingBottom: spacing.base },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: radii.lg,
    minHeight: 56,
    paddingHorizontal: spacing.base,
  },
  loginBtn: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.brands.waveBg,
  },
  loginText: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text.primary },
  ctaPressed: { backgroundColor: colors.primary.dark },
  ctaText: { color: colors.text.inverted, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold },
});
