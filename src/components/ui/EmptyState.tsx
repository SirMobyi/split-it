import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SPACING, TYPOGRAPHY, GRADIENTS } from '../../constants/theme';
import { useColors } from '../../hooks/use-colors';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: string;
  IconComponent?: React.ComponentType<{ size: number; color: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, IconComponent, title, description, actionLabel, onAction }: EmptyStateProps) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (IconComponent) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 2000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, []);

  return (
    <View style={styles.container}>
      {IconComponent ? (
        <Animated.View style={[styles.iconContainer, { transform: [{ scale }] }]}>
          <LinearGradient
            colors={[...GRADIENTS.lavender] as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconCircle}
          >
            <IconComponent size={32} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>
      ) : icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
      {actionLabel && onAction && (
        <View style={{ marginTop: SPACING.lg }}>
          <Button title={actionLabel} onPress={onAction} size="sm" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.xxl,
  },
  icon: {
    fontSize: 48,
    marginBottom: SPACING.lg,
  },
  iconContainer: {
    marginBottom: SPACING.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...TYPOGRAPHY.h2,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  description: {
    ...TYPOGRAPHY.bodyMd,
    textAlign: 'center',
  },
});
