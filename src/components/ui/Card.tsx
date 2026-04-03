import React from 'react';
import { View, TouchableOpacity, ViewStyle } from 'react-native';
import { RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { useColors } from '../../hooks/use-colors';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'default' | 'elevated';
}

export function Card({ children, onPress, style, variant = 'default' }: CardProps) {
  const colors = useColors();
  const shadow = variant === 'elevated' ? SHADOWS.cardElevated : SHADOWS.card;

  const baseStyle: ViewStyle = {
    backgroundColor: colors.surface2,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    overflow: 'hidden',
    ...shadow,
  };

  const containerStyle = [baseStyle, style];

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={containerStyle}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}
