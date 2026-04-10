import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Undo2 } from 'lucide-react-native';
import { useToastStore } from '../../stores/toast-store';
import { useColors } from '../../hooks/use-colors';
import { SPACING, TYPOGRAPHY } from '../../constants/theme';
import { impact } from '../../utils/haptics';

const TOAST_DURATION = 3000;

export function UndoToast() {
  const colors = useColors();
  const { toast, dismissToast } = useToastStore();
  const [undoing, setUndoing] = useState(false);
  const translateY = useRef(new Animated.Value(100)).current;
  const progressWidth = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (toast) {
      impact('light');
      Animated.spring(translateY, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }).start();
      progressWidth.setValue(1);
      Animated.timing(progressWidth, { toValue: 0, duration: TOAST_DURATION, useNativeDriver: false }).start();

      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, TOAST_DURATION);

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [toast?.id]);

  const handleDismiss = () => {
    Animated.timing(translateY, { toValue: 100, duration: 200, useNativeDriver: true }).start();
    setTimeout(() => {
      dismissToast();
      setUndoing(false);
    }, 200);
  };

  const handleUndo = async () => {
    if (!toast || undoing) return;
    setUndoing(true);
    if (timerRef.current) clearTimeout(timerRef.current);

    try {
      await toast.onUndo();
    } catch {
      // Undo failed
    }
    handleDismiss();
  };

  // Map progressWidth [0,1] → percentage string for width
  const barWidth = progressWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (!toast) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }] },
        {
          backgroundColor: colors.surface2,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={[styles.message, { color: colors.textPrimary }]} numberOfLines={1}>
          {toast.message}
        </Text>
        <TouchableOpacity
          style={[styles.undoButton, { backgroundColor: colors.accentDim }]}
          onPress={handleUndo}
          disabled={undoing}
          activeOpacity={0.7}
        >
          <Undo2 size={14} color={colors.accent} />
          <Text style={[styles.undoText, { color: colors.accent }]}>{undoing ? 'Undoing...' : 'Undo'}</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <Animated.View style={[styles.progressBar, { width: barWidth, backgroundColor: colors.accent }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: SPACING.lg,
    right: SPACING.lg,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  message: {
    flex: 1,
    ...TYPOGRAPHY.labelSm,
    fontSize: 14,
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 8,
  },
  undoText: {
    ...TYPOGRAPHY.labelSm,
    fontWeight: '700',
  },
  progressTrack: {
    height: 3,
  },
  progressBar: {
    height: '100%',
  },
});
