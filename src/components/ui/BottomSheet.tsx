import React, { useEffect, useRef } from 'react';
import { View, Modal, Pressable, Text, StyleSheet, Dimensions, Animated, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { useColors, useShadows, useIsDark } from '../../hooks/use-colors';
import { impact } from '../../utils/haptics';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  showDone?: boolean;
  children: React.ReactNode;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export function BottomSheet({ visible, onClose, title, showDone = true, children }: BottomSheetProps) {
  const colors = useColors();
  const shadows = useShadows();
  const isDark = useIsDark();

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      impact('medium');
      Animated.spring(translateY, { toValue: 0, damping: 20, stiffness: 200, mass: 0.8, useNativeDriver: true }).start();
      Animated.timing(backdropOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } else {
      Animated.spring(translateY, { toValue: SCREEN_HEIGHT, damping: 25, stiffness: 300, useNativeDriver: true }).start();
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <Animated.View
            style={[
              { transform: [{ translateY }] },
              styles.sheet,
              {
                backgroundColor: isDark ? 'rgba(24, 20, 48, 0.95)' : 'rgba(250, 250, 255, 0.97)',
                borderColor: colors.borderLight,
                ...shadows.bottomSheet,
              },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            {title && (
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
                {showDone && (
                  <Pressable onPress={onClose} hitSlop={10}>
                    <Text style={[styles.close, { color: colors.accent }]}>Done</Text>
                  </Pressable>
                )}
              </View>
            )}

            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.content}
            >
              {children}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.labelLg,
  },
  close: {
    ...TYPOGRAPHY.labelLg,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
});
