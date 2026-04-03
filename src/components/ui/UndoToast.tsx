import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Undo2 } from 'lucide-react-native';
import { useToastStore } from '../../stores/toast-store';
import { COLORS, SPACING } from '../../constants/theme';

const TOAST_DURATION = 3000;

export function UndoToast() {
  const { toast, dismissToast } = useToastStore();
  const [undoing, setUndoing] = useState(false);
  const slideAnim = useRef(new Animated.Value(100)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (toast) {
      // Reset and animate in
      slideAnim.setValue(100);
      progressAnim.setValue(1);

      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();

      // Progress bar countdown
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: TOAST_DURATION,
        useNativeDriver: false,
      }).start();

      // Auto-dismiss after duration
      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, TOAST_DURATION);

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [toast?.id]);

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: 100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      dismissToast();
      setUndoing(false);
    });
  };

  const handleUndo = async () => {
    if (!toast || undoing) return;
    setUndoing(true);
    if (timerRef.current) clearTimeout(timerRef.current);

    try {
      await toast.onUndo();
    } catch {
      // Undo failed — toast will dismiss anyway
    }
    handleDismiss();
  };

  if (!toast) return null;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.message} numberOfLines={1}>
          {toast.message}
        </Text>
        <TouchableOpacity
          style={styles.undoButton}
          onPress={handleUndo}
          disabled={undoing}
          activeOpacity={0.7}
        >
          <Undo2 size={14} color={COLORS.accent} />
          <Text style={styles.undoText}>{undoing ? 'Undoing...' : 'Undo'}</Text>
        </TouchableOpacity>
      </View>
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
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
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.accentDim,
  },
  undoText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  progressTrack: {
    height: 3,
    backgroundColor: COLORS.border,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },
});
