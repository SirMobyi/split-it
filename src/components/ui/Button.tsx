import React, { useCallback, useRef } from 'react';
import { Pressable, Text, ActivityIndicator, ViewStyle, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RADIUS, GRADIENTS, TYPOGRAPHY, createShadows } from '../../constants/theme';
import { useColors, useIsDark } from '../../hooks/use-colors';
import { impact } from '../../utils/haptics';
import type { ColorPalette } from '../../constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
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
  haptic?: boolean;
}

interface VariantStyle {
  bg: string;
  text: string;
  border?: string;
  gradient?: readonly string[];
}

function getVariantStyles(colors: ColorPalette, isDark: boolean): Record<ButtonVariant, VariantStyle> {
  return {
    primary: { bg: 'transparent', text: '#FFFFFF', gradient: [...GRADIENTS.primary] },
    secondary: { bg: colors.surface2, text: colors.accent, border: colors.borderLight },
    outline: { bg: 'transparent', text: colors.accent, border: colors.accent },
    danger: { bg: colors.danger, text: '#FFFFFF' },
    ghost: { bg: 'transparent', text: colors.accent },
  };
}

const sizeStyles: Record<ButtonSize, { height: number; px: number; typo: keyof typeof TYPOGRAPHY }> = {
  sm: { height: 40, px: 18, typo: 'labelSm' },
  md: { height: 48, px: 24, typo: 'labelMd' },
  lg: { height: 54, px: 28, typo: 'labelLg' },
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
  haptic = true,
}: ButtonProps) {
  const colors = useColors();
  const isDark = useIsDark();
  const v = getVariantStyles(colors, isDark)[variant];
  const s = sizeStyles[size];
  const typo = TYPOGRAPHY[s.typo];
  const isDisabled = disabled || loading;
  const shadows = createShadows(isDark);

  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, { toValue: 0.97, damping: 15, stiffness: 300, useNativeDriver: true }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, damping: 15, stiffness: 300, useNativeDriver: true }).start();
  }, []);

  const handlePress = useCallback(() => {
    if (haptic) impact('light');
    onPress();
  }, [onPress, haptic]);

  const containerStyle: ViewStyle = {
    height: s.height,
    paddingHorizontal: s.px,
    backgroundColor: v.bg,
    borderRadius: RADIUS.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    opacity: isDisabled ? 0.5 : 1,
    overflow: 'hidden',
    ...(fullWidth ? { width: '100%' } : {}),
    ...(v.border ? { borderWidth: 1, borderColor: v.border } : {}),
    ...(variant === 'primary' && !isDisabled ? shadows.button : {}),
  };

  const textColor = v.text;

  const content = loading ? (
    <ActivityIndicator size="small" color={textColor} />
  ) : (
    <>
      {icon}
      <Text style={{ color: textColor, fontSize: typo.fontSize, fontWeight: '700', lineHeight: typo.lineHeight }}>
        {title}
      </Text>
    </>
  );

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {v.gradient ? (
          <LinearGradient
            colors={v.gradient as unknown as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[containerStyle, styles.gradientInner]}
          >
            {content}
          </LinearGradient>
        ) : (
          <Animated.View style={containerStyle}>
            {content}
          </Animated.View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gradientInner: {
    overflow: 'hidden',
  },
});
