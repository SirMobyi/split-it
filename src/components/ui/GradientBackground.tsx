import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGradients } from '../../hooks/use-colors';

interface GradientBackgroundProps {
  children: React.ReactNode;
  variant?: 'ambient' | 'accent' | 'custom';
  colors?: string[];
  style?: ViewStyle;
}

export function GradientBackground({
  children,
  variant = 'ambient',
  colors: customColors,
  style,
}: GradientBackgroundProps) {
  const gradients = useGradients();

  const gradientColors = customColors
    ?? (variant === 'accent' ? [...gradients.lavender] : [...gradients.ambient]);

  return (
    <LinearGradient
      colors={gradientColors as [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.container, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
