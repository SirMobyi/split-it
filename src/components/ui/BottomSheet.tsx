import React from 'react';
import { View, Modal, TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';
import { RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { useColors } from '../../hooks/use-colors';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  showDone?: boolean;
  children: React.ReactNode;
}

export function BottomSheet({ visible, onClose, title, showDone = true, children }: BottomSheetProps) {
  const colors = useColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.sheet, {
            backgroundColor: colors.surface2,
            ...SHADOWS.bottomSheet,
          }]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          {title && (
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
              {showDone && (
                <TouchableOpacity onPress={onClose}>
                  <Text style={[styles.close, { color: colors.accent }]}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          <View style={styles.content}>{children}</View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: Dimensions.get('window').height * 0.85,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
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
    fontSize: 17,
    fontWeight: '600',
  },
  close: {
    fontSize: 17,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
});
