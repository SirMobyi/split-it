import React from 'react';
import { View, TouchableOpacity, ViewStyle } from 'react-native';
import { RADIUS, SPACING } from '../../constants/theme';
import { useColors } from '../../hooks/use-colors';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'default' | 'elevated';
}

export function Card({ children, onPress, style, variant = 'default' }: CardProps) {
  const colors = useColors();
  const baseStyle: ViewStyle = {
    backgroundColor: variant === 'elevated' ? colors.surface2 : colors.surface,
    borderRadius: RADIUS.xl, // Increased to 24px for modern aesthetic
    borderWidth: 1,
    borderColor: variant === 'elevated' ? colors.borderLight : colors.border,
    padding: SPACING.lg,
    overflow: 'hidden',
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
