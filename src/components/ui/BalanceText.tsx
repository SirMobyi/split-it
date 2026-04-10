import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useColors } from '../../hooks/use-colors';
import { formatCurrency, TYPOGRAPHY } from '../../constants/theme';

interface BalanceTextProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSign?: boolean;
  style?: TextStyle;
}

const sizeMap = {
  sm: TYPOGRAPHY.monoSm,
  md: { fontSize: 17, fontWeight: '700' as const },
  lg: TYPOGRAPHY.monoMd,
  xl: TYPOGRAPHY.monoLg,
};

export function BalanceText({ amount, size = 'md', showSign = true, style }: BalanceTextProps) {
  const colors = useColors();
  const isPositive = amount > 0;
  const isZero = Math.abs(amount) < 0.01;

  const color = isZero
    ? colors.textTertiary
    : isPositive
      ? colors.success
      : colors.danger;

  const sign = isZero ? '' : isPositive ? '+' : '-';
  const displayAmount = formatCurrency(Math.abs(amount));
  const typo = sizeMap[size];

  return (
    <Text style={[{ color, ...typo }, style]}>
      {showSign ? `${sign} ${displayAmount}` : displayAmount}
    </Text>
  );
}
