import React, { useCallback, useRef } from 'react';
import { View, Pressable, ViewStyle, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RADIUS, SPACING } from '../../constants/theme';
import { useColors, useShadows, useIsDark } from '../../hooks/use-colors';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'glass' | 'accent';
  glow?: boolean;
}

export function Card({ children, onPress, style, variant = 'default', glow = false }: CardProps) {
  const colors = useColors();
  const shadows = useShadows();
  const isDark = useIsDark();

  const shadow = variant === 'elevated' || variant === 'glass'
    ? shadows.cardElevated
    : shadows.card;

  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    if (onPress) {
      Animated.spring(scale, { toValue: 0.98, damping: 15, stiffness: 250, useNativeDriver: true }).start();
    }
  }, [onPress]);

  const handlePressOut = useCallback(() => {
    if (onPress) {
      Animated.spring(scale, { toValue: 1, damping: 15, stiffness: 250, useNativeDriver: true }).start();
    }
  }, [onPress]);

  const baseStyle: ViewStyle = {
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadow,
    ...(glow ? shadows.glow : {}),
  };

  const bgColor = variant === 'glass'
    ? (isDark ? 'rgba(24, 20, 48, 0.6)' : 'rgba(243, 240, 255, 0.7)')
    : colors.surface2;

  const containerStyle: ViewStyle = { ...baseStyle, backgroundColor: bgColor };
  const mergedStyle = [containerStyle, style];

  if (variant === 'accent') {
    const gradientColors = isDark
      ? [colors.accentSurface, colors.surface2]
      : [colors.accentSurface, colors.surface];

    if (onPress) {
      return (
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <LinearGradient
              colors={gradientColors as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[baseStyle, style]}
            >
              {children}
            </LinearGradient>
          </Animated.View>
        </Pressable>
      );
    }

    return (
      <LinearGradient
        colors={gradientColors as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[baseStyle, style]}
      >
        {children}
      </LinearGradient>
    );
  }

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={[{ transform: [{ scale }] }, ...mergedStyle]}>
          {children}
        </Animated.View>
      </Pressable>
    );
  }

  return <View style={mergedStyle}>{children}</View>;
}
