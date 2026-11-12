/**
 * Graphique en Barres d'Évolution des Dépenses — GERETOU
 * Réalisé avec react-native-svg, compatible iOS / Android / Web.
 * Affiche les barres de dépenses, les pics remarquables et la ligne moyenne journalière.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { DailyPoint } from '../../services/analytics/analyticsCore';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

interface BarChartProps {
  data: DailyPoint[];
  dailyAverage?: number;
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  dailyAverage = 0,
  height = 180,
}) => {
  const chartHeight = height - 30; // 30px pour les labels en bas
  const chartWidth = 320;

  if (data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.emptyText}>Aucune donnée sur cette période</Text>
      </View>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.amount), dailyAverage, 1000);
  // Bar width et espacement
  const count = data.length;
  const paddingX = 16;
  const availableWidth = chartWidth - paddingX * 2;
  const slotWidth = availableWidth / count;
  const barWidth = Math.max(4, Math.min(22, slotWidth * 0.65));

  // Ligne de moyenne y
  const avgY = chartHeight - (dailyAverage / maxVal) * (chartHeight - 20);

  // Échantillonnage des labels pour éviter la superposition
  const stepLabel = count > 14 ? Math.ceil(count / 5) : count > 7 ? 2 : 1;

  return (
    <View style={styles.container}>
      <Svg width="100%" height={height} viewBox={`0 0 ${chartWidth} ${height}`}>
        {/* Lignes repères de grille horizontales */}
        <Line
          x1={paddingX}
          y1={chartHeight}
          x2={chartWidth - paddingX}
          y2={chartHeight}
          stroke={colors.surface.border}
          strokeWidth="1"
        />

        {dailyAverage > 0 ? (
          <G>
            <Line
              x1={paddingX}
              y1={avgY}
              x2={chartWidth - paddingX}
              y2={avgY}
              stroke={colors.accent.warning}
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <SvgText
              x={chartWidth - paddingX}
              y={Math.max(12, avgY - 4)}
              fill={colors.accent.warning}
              fontSize="10"
              fontWeight="bold"
              textAnchor="end"
            >
              Moy. {formatFCFA(dailyAverage).replace(' FCFA', ' F/j')}
            </SvgText>
          </G>
        ) : null}

        {/* Barres */}
        {data.map((point, index) => {
          const barHeight = Math.max(3, (point.amount / maxVal) * (chartHeight - 20));
          const x = paddingX + index * slotWidth + (slotWidth - barWidth) / 2;
          const y = chartHeight - barHeight;

          // Mise en valeur des pics de dépenses (> 1.5x la moyenne ou max significatif)
          const isPeak = dailyAverage > 0 && point.amount > dailyAverage * 1.5;
          const barColor = isPeak ? colors.accent.warning : colors.primary.DEFAULT;

          const showLabel = index % stepLabel === 0 || index === count - 1;

          return (
            <G key={point.date + index}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={Math.min(4, barWidth / 2)}
                fill={barColor}
                opacity={point.amount > 0 ? 1 : 0.2}
              />
              {showLabel ? (
                <SvgText
                  x={x + barWidth / 2}
                  y={height - 8}
                  fill={colors.text.secondary}
                  fontSize="9"
                  textAnchor="middle"
                >
                  {point.label}
                </SvgText>
              ) : null}
            </G>
          );
        })}
      </Svg>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary.DEFAULT }]} />
          <Text style={styles.legendText}>Dépenses régulières</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.accent.warning }]} />
          <Text style={styles.legendText}>Pics / Ravitaillement</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.text.muted,
    fontSize: typography.sizes.bodySm,
    marginVertical: 'auto',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surface.muted,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: typography.sizes.caption,
    color: colors.text.secondary,
  },
});
