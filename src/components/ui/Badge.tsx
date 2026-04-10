import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { useColors } from '../../hooks/use-colors';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'accent';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  pill?: boolean;
}

function getVariantColors(colors: ReturnType<typeof useColors>): Record<BadgeVariant, { bg: string; text: string }> {
  return {
    success: { bg: colors.successDim, text: colors.success },
    danger: { bg: colors.dangerDim, text: colors.danger },
    warning: { bg: colors.accentDim, text: colors.warning },
    info: { bg: colors.accentSurface, text: colors.info },
    neutral: { bg: colors.surface, text: colors.textSecondary },
    accent: { bg: colors.accentDim, text: colors.accent },
  };
}

export function Badge({ label, variant = 'neutral', size = 'sm', icon, pill = false }: BadgeProps) {
  const themeColors = useColors();
  const vc = getVariantColors(themeColors)[variant];

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: vc.bg },
        size === 'sm' ? styles.sm : styles.md,
        pill && { borderRadius: RADIUS.full },
      ]}
    >
      <View style={styles.content}>
        {icon ? (
          <View style={[styles.iconWrap, size === 'sm' ? styles.iconSm : styles.iconMd]}>{icon}</View>
        ) : null}
        <Text style={[{ color: vc.text }, size === 'sm' ? TYPOGRAPHY.caption : TYPOGRAPHY.labelSm, { fontWeight: '600' }]}>
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
