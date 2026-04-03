import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface SkeletonBoxProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

function SkeletonBox({ width = '100%', height = 16, borderRadius = RADIUS.md, style }: SkeletonBoxProps) {
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
        { width: width as any, height, borderRadius, backgroundColor: COLORS.surface3, opacity },
        style,
      ]}
    />
  );
}

/** Skeleton placeholder for a group card */
export function SkeletonCard() {
  return (
    <View style={styles.card}>
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

/** Skeleton placeholder for the balance overview card */
export function SkeletonBalanceCard() {
  return (
    <View style={[styles.card, { gap: SPACING.lg }]}>
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

/** Skeleton for an expense row */
export function SkeletonExpenseRow() {
  return (
    <View style={styles.expenseRow}>
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBox width="50%" height={16} />
        <SkeletonBox width="70%" height={12} />
        <SkeletonBox width="30%" height={10} />
      </View>
      <SkeletonBox width={70} height={14} />
    </View>
  );
}

/** Skeleton for an activity row */
export function SkeletonActivityRow() {
  return (
    <View style={styles.activityRow}>
      <SkeletonBox width={20} height={20} borderRadius={10} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBox width="70%" height={14} />
        <SkeletonBox width="50%" height={12} />
        <SkeletonBox width="30%" height={10} />
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
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
});
