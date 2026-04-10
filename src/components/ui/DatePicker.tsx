import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, eachDayOfInterval, isSameMonth, isSameDay, isAfter,
} from 'date-fns';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { useColors } from '../../hooks/use-colors';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  maxDate?: Date;
}

const CELL_SIZE = 40;

export function DatePicker({ value, onChange, label, maxDate }: DatePickerProps) {
  const colors = useColors();
  const [visible, setVisible] = useState(false);
  const selected = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewMonth, setViewMonth] = useState(startOfMonth(selected));

  const days = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [viewMonth]);

  const handleSelect = (day: Date) => {
    if (maxDate && isAfter(day, maxDate)) return;
    onChange(format(day, 'yyyy-MM-dd'));
    setVisible(false);
  };

  return (
    <View>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <TouchableOpacity
        style={[styles.trigger, { borderColor: colors.border, backgroundColor: colors.surface }]}
        onPress={() => setVisible(true)}
      >
        <Text style={styles.triggerIcon}>📅</Text>
        <Text style={[styles.triggerText, { color: colors.textPrimary }]}>
          {value ? format(selected, 'dd MMM yyyy') : 'Select date'}
        </Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.calendar, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.monthHeader}>
              <TouchableOpacity
                onPress={() => setViewMonth(subMonths(viewMonth, 1))}
                style={[styles.navBtn, { backgroundColor: colors.surface2 }]}
              >
                <Text style={[styles.navText, { color: colors.textPrimary }]}>‹</Text>
              </TouchableOpacity>
              <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>{format(viewMonth, 'MMMM yyyy')}</Text>
              <TouchableOpacity
                onPress={() => setViewMonth(addMonths(viewMonth, 1))}
                style={[styles.navBtn, { backgroundColor: colors.surface2 }]}
              >
                <Text style={[styles.navText, { color: colors.textPrimary }]}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
                <Text key={d} style={[styles.weekDay, { color: colors.textTertiary }]}>{d}</Text>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {days.map((day, i) => {
                const inMonth = isSameMonth(day, viewMonth);
                const isSelected = isSameDay(day, selected);
                const isToday = isSameDay(day, new Date());
                const disabled = maxDate ? isAfter(day, maxDate) : false;

                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.dayCell,
                      isSelected && { backgroundColor: colors.accent },
                      isToday && !isSelected && { borderWidth: 1, borderColor: colors.accent },
                    ]}
                    onPress={() => !disabled && handleSelect(day)}
                    disabled={disabled}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { color: colors.textPrimary },
                        !inMonth && { color: colors.textTertiary, opacity: 0.4 },
                        isSelected && { color: '#FAFAFF', fontWeight: '700' },
                        disabled && { color: colors.textTertiary, opacity: 0.3 },
                      ]}
                    >
                      {format(day, 'd')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.quickActions}>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: colors.accentDim }]}
                onPress={() => handleSelect(new Date())}
              >
                <Text style={[styles.quickBtnText, { color: colors.accent }]}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: colors.surface2 }]}
                onPress={() => setVisible(false)}
              >
                <Text style={[styles.quickBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...TYPOGRAPHY.labelSm,
    marginBottom: 6,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  triggerIcon: {
    fontSize: 16,
  },
  triggerText: {
    ...TYPOGRAPHY.labelMd,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  calendar: {
    borderRadius: 16,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: 20,
    fontWeight: '600',
  },
  monthTitle: {
    ...TYPOGRAPHY.labelLg,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  weekDay: {
    width: CELL_SIZE,
    textAlign: 'center',
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CELL_SIZE / 2,
    marginVertical: 1,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    justifyContent: 'flex-end',
  },
  quickBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
  },
  quickBtnText: {
    ...TYPOGRAPHY.labelSm,
    fontWeight: '600',
  },
});
