import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS } from '../../constants/theme';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981' },
  danger: { bg: 'rgba(248, 113, 113, 0.15)', text: COLORS.danger },
  warning: { bg: 'rgba(251, 191, 36, 0.15)', text: COLORS.warning },
  info: { bg: 'rgba(96, 165, 250, 0.15)', text: COLORS.info },
  neutral: { bg: COLORS.surface2, text: COLORS.textSecondary },
};

export function Badge({ label, variant = 'neutral', size = 'sm', icon }: BadgeProps) {
  const colors = variantColors[variant];

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: colors.bg },
        size === 'sm' ? styles.sm : styles.md,
      ]}
    >
      <View style={styles.content}>
        {icon ? (
          <View style={[styles.iconWrap, size === 'sm' ? styles.iconSm : styles.iconMd]}>{icon}</View>
        ) : null}

        <Text style={[styles.text, { color: colors.text }, size === 'sm' && { fontSize: 11 }]}> 
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.md, // Soft rounding
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  sm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  md: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSm: {
    width: 14,
    height: 14,
  },
  iconMd: {
    width: 18,
    height: 18,
  },
});
