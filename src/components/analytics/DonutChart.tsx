/**
 * Graphique Circulaire (Donut Chart) — GERETOU
 * Répartition des dépenses par catégorie avec react-native-svg.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';
import { CategoryBreakdown } from '../../services/analytics/analyticsCore';
import { colors, radii, spacing, typography, formatFCFA } from '../../theme/tokens';

interface DonutChartProps {
  categories: CategoryBreakdown[];
  totalAmount: number;
  size?: number;
  strokeWidth?: number;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  categories,
  totalAmount,
  size = 190,
  strokeWidth = 24,
}) => {
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  if (totalAmount <= 0 || categories.length === 0) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.surface.muted}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <SvgText
            x={center}
            y={center - 4}
            fill={colors.text.muted}
            fontSize="12"
            fontWeight="bold"
            textAnchor="middle"
          >
            0 FCFA
          </SvgText>
          <SvgText
            x={center}
            y={center + 14}
            fill={colors.text.secondary}
            fontSize="9"
            textAnchor="middle"
          >
            Aucune dépense
          </SvgText>
        </Svg>
      </View>
    );
  }

  let accumulatedPercent = 0;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {/* Cercle de fond */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.surface.muted}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Tranches par catégorie */}
          {categories.map((cat) => {
            const ratio = cat.amount / totalAmount;
            const strokeDasharray = `${ratio * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedPercent * circumference;
            accumulatedPercent += ratio;

            return (
              <Circle
                key={cat.categoryId}
                cx={center}
                cy={center}
                r={radius}
                stroke={cat.color || colors.primary.DEFAULT}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="butt"
                fill="none"
              />
            );
          })}
        </G>

        {/* Texte au centre du donut */}
        <SvgText
          x={center}
          y={center - 6}
          fill={colors.text.primary}
          fontSize="13"
          fontWeight="bold"
          textAnchor="middle"
        >
          {formatFCFA(totalAmount).replace(' FCFA', '')}
        </SvgText>
        <SvgText
          x={center}
          y={center + 10}
          fill={colors.primary.DEFAULT}
          fontSize="9"
          fontWeight="bold"
          textAnchor="middle"
        >
          FCFA TOTAL
        </SvgText>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
