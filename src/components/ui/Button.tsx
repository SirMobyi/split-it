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

function getVariantStyles(colors: ColorPalette): Record<ButtonVariant, { bg: string; text: string }> {
  return {
    // Primary: filled accent with white text (high contrast)
    primary: { bg: colors.accent, text: '#FFFFFF' },
    // Secondary: slightly lighter accent fill to keep consistent filled style
    secondary: { bg: colors.accentLight, text: '#FFFFFF' },
    // Danger: filled red background with white text
    danger: { bg: colors.danger, text: '#FFFFFF' },
    // Ghost: transparent background, accent text
    ghost: { bg: 'transparent', text: colors.accent },
  };
}

const sizeStyles: Record<ButtonSize, { height: number; px: number; fontSize: number }> = {
  sm: { height: 44, px: 20, fontSize: 15 },
  md: { height: 50, px: 24, fontSize: 17 },
  lg: { height: 56, px: 28, fontSize: 17 },
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
      activeOpacity={0.8}
      style={[
        {
          height: s.height,
          paddingHorizontal: s.px,
          backgroundColor: v.bg,
          borderRadius: RADIUS.xl,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: isDisabled ? 0.5 : 1,
          ...(fullWidth ? { width: '100%' } : {}),
          // make the button feel more tactile with a subtle shadow on platforms that support it
        } as ViewStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <>
          {icon}
          <Text style={{ color: v.text, fontSize: s.fontSize, fontWeight: '700' }}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
