import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RADIUS } from '../../constants/theme';
import { useColors } from '../../hooks/use-colors';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

function getVariantColors(colors: ReturnType<typeof useColors>): Record<BadgeVariant, { bg: string; text: string }> {
  return {
    success: { bg: '#E8F8EF', text: colors.success },
    danger: { bg: '#FFF0EF', text: colors.danger },
    warning: { bg: '#FFF8E1', text: colors.warning },
    info: { bg: '#E3F2FD', text: colors.info },
    neutral: { bg: colors.surface, text: colors.textSecondary },
  };
}

export function Badge({ label, variant = 'neutral', size = 'sm', icon }: BadgeProps) {
  const themeColors = useColors();
  const vc = getVariantColors(themeColors)[variant];

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: vc.bg },
        size === 'sm' ? styles.sm : styles.md,
      ]}
    >
      <View style={styles.content}>
        {icon ? (
          <View style={[styles.iconWrap, size === 'sm' ? styles.iconSm : styles.iconMd]}>{icon}</View>
        ) : null}
        <Text style={[styles.text, { color: vc.text }, size === 'sm' && { fontSize: 12 }]}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.md,
    alignSelf: 'flex-start',
  },
  sm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  md: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    fontSize: 13,
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
