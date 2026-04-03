import React from 'react';
import { Text, TextStyle } from 'react-native';
import { COLORS } from '../../constants/theme';
import { formatCurrency } from '../../constants/theme';

interface BalanceTextProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSign?: boolean;
  style?: TextStyle;
}

const sizeMap: Record<string, number> = {
  sm: 13,
  md: 16,
  lg: 22,
  xl: 32,
};

export function BalanceText({ amount, size = 'md', showSign = true, style }: BalanceTextProps) {
  const isPositive = amount > 0;
  const isZero = Math.abs(amount) < 0.01;

  const color = isZero
    ? COLORS.textTertiary
    : isPositive
      ? COLORS.success
      : COLORS.danger;

  const sign = isZero ? '' : isPositive ? '+' : '-';
  const displayAmount = formatCurrency(Math.abs(amount));

  return (
    <Text style={[{ color, fontSize: sizeMap[size], fontWeight: '700' }, style]}>
      {showSign ? `${sign} ${displayAmount}` : displayAmount}
    </Text>
  );
}
