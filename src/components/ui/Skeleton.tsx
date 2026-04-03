import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useColors } from '../../hooks/use-colors';

interface SkeletonBoxProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

function SkeletonBox({ width = '100%', height = 16, borderRadius = RADIUS.md, style }: SkeletonBoxProps) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: colors.surface3, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface2, ...SHADOWS.card }]}>
      <View style={{ flex: 1, gap: 10 }}>
        <SkeletonBox width="60%" height={18} />
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <SkeletonBox width={24} height={24} borderRadius={12} />
          <SkeletonBox width={24} height={24} borderRadius={12} />
          <SkeletonBox width={24} height={24} borderRadius={12} />
        </View>
      </View>
      <SkeletonBox width={60} height={16} />
    </View>
  );
}

export function SkeletonBalanceCard() {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface2, ...SHADOWS.cardElevated, gap: SPACING.lg }]}>
      <SkeletonBox width="45%" height={24} />
      <View style={{ flexDirection: 'row', gap: SPACING.lg }}>
        <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
          <SkeletonBox width={80} height={12} />
          <SkeletonBox width={60} height={22} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
          <SkeletonBox width={80} height={12} />
          <SkeletonBox width={60} height={22} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonExpenseRow() {
  const colors = useColors();
  return (
    <View style={[styles.expenseRow, { borderBottomColor: colors.borderLight }]}>
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBox width="50%" height={16} />
        <SkeletonBox width="70%" height={12} />
        <SkeletonBox width="30%" height={12} />
      </View>
      <SkeletonBox width={70} height={14} />
    </View>
  );
}

export function SkeletonActivityRow() {
  const colors = useColors();
  return (
    <View style={[styles.activityRow, { backgroundColor: colors.surface2, borderBottomColor: colors.borderLight }]}>
      <SkeletonBox width={20} height={20} borderRadius={10} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBox width="70%" height={14} />
        <SkeletonBox width="50%" height={12} />
        <SkeletonBox width="30%" height={12} />
      </View>
      <SkeletonBox width={50} height={18} borderRadius={9} />
    </View>
  );
}

export { SkeletonBox };

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: SPACING.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
