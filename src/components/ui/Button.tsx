import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle } from 'react-native';
import { RADIUS } from '../../constants/theme';
import { useColors } from '../../hooks/use-colors';
import type { ColorPalette } from '../../constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

function getVariantStyles(colors: ColorPalette): Record<ButtonVariant, { bg: string; text: string; border?: string }> {
  return {
    primary: { bg: colors.accent, text: '#FFFFFF' },
    secondary: { bg: colors.surface2, text: colors.textPrimary, border: colors.borderLight },
    danger: { bg: colors.dangerDim, text: colors.danger, border: colors.dangerDim },
    ghost: { bg: 'transparent', text: colors.textSecondary },
  };
}

const sizeStyles: Record<ButtonSize, { height: number; px: number; fontSize: number }> = {
  sm: { height: 36, px: 16, fontSize: 13 },
  md: { height: 48, px: 20, fontSize: 15 },
  lg: { height: 56, px: 24, fontSize: 16 },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
}: ButtonProps) {
  const colors = useColors();
  const v = getVariantStyles(colors)[variant];
  const s = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        {
          height: s.height,
          paddingHorizontal: s.px,
          backgroundColor: v.bg,
          borderRadius: RADIUS.xl, // Increased to 24px for modern aesthetic
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: isDisabled ? 0.5 : 1,
          ...(v.border ? { borderWidth: 1.5, borderColor: v.border } : {}),
          ...(fullWidth ? { width: '100%' } : {}),
        } as ViewStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <>
          {icon}
          <Text style={{ color: v.text, fontSize: s.fontSize, fontWeight: '600' }}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
