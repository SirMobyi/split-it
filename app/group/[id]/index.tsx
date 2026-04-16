import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, SectionList, StyleSheet, Pressable, Platform, Alert, Animated, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Wallet, ArrowLeft, Info, Pencil, Trash2 } from 'lucide-react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

// -- SVG Icons ---------------------------------------------------------------

function FilterIcon({ size = 20, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CalendarIcon({ size = 16, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function UserIcon({ size = 16, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function XIcon({ size = 14, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// -- Filter types ------------------------------------------------------------

type DatePreset = 'all' | 'this_month' | 'last_month' | 'last_3_months' | 'this_year';

interface FilterState {
  datePreset: DatePreset;
  payerId: string | null; // null = all payers
}

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'all', label: 'All Time' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'last_3_months', label: 'Last 3 Months' },
  { key: 'this_year', label: 'This Year' },
];

function getDateRange(preset: DatePreset): { start: Date; end: Date } | null {
  if (preset === 'all') return null;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  switch (preset) {
    case 'this_month':
      return { start: new Date(year, month, 1), end: new Date(year, month + 1, 0, 23, 59, 59) };
    case 'last_month':
      return { start: new Date(year, month - 1, 1), end: new Date(year, month, 0, 23, 59, 59) };
    case 'last_3_months':
      return { start: new Date(year, month - 2, 1), end: new Date(year, month + 1, 0, 23, 59, 59) };
    case 'this_year':
      return { start: new Date(year, 0, 1), end: new Date(year, 11, 31, 23, 59, 59) };
  }
}

const DEFAULT_FILTERS: FilterState = { datePreset: 'all', payerId: null };

function FadeInItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}
import {
  Screen, Card, Button, Avatar, Badge, BalanceText, EmptyState, BottomSheet,
  GroupIcon, UndoToast, SkeletonExpenseRow, AnimatedNumber,
} from '../../../src/components/ui';
import { useGroup } from '../../../src/hooks/use-groups';
import { useGroupExpenses, useDeleteExpense } from '../../../src/hooks/use-expenses';
import { useGroupBalances } from '../../../src/hooks/use-balances';
import { useAuthStore } from '../../../src/stores/auth-store';
import { SPACING, TYPOGRAPHY, RADIUS, GRADIENTS, formatCurrency } from '../../../src/constants/theme';
import { useColors, useShadows } from '../../../src/hooks/use-colors';
import { formatDistanceToNow, format } from 'date-fns';
import type { AuditLogEntry, ExpenseWithSplits } from '../../../src/types/database';
import { supabase } from '../../../src/lib/supabase';
import { impact } from '../../../src/utils/haptics';

function getAuditChanges(action: string, prev: Record<string, unknown> | null, next: Record<string, unknown> | null): string[] {
  if (action === 'CREATE' && next) {
    const details: string[] = [];
    if (next.title || next.name) details.push(`Created "${next.title || next.name}"`);
    if (next.amount) details.push(`Amount: ${formatCurrency(Number(next.amount))}`);
    return details;
  }

  if (action === 'DELETE' && prev) {
    const details: string[] = [];
    const nameOrTitle = prev.title || prev.name;
    if (nameOrTitle) details.push(`Deleted "${nameOrTitle}"`);
    if (prev.amount) details.push(`Was ${formatCurrency(Number(prev.amount))}`);
    return details;
  }

  if (action === 'UPDATE' && prev && next) {
    const changes: string[] = [];
    const fields: Record<string, string> = {
      title: 'Title', amount: 'Amount', description: 'Description',
      transaction_date: 'Date', split_type: 'Split type', status: 'Status', note: 'Note',
    };
    for (const [key, label] of Object.entries(fields)) {
      const oldVal = prev[key];
      const newVal = next[key];
      if (oldVal !== undefined && newVal !== undefined && oldVal !== newVal) {
        if (key === 'amount') {
          changes.push(`${label}: ${formatCurrency(Number(oldVal))} → ${formatCurrency(Number(newVal))}`);
        } else {
          changes.push(`${label}: "${oldVal ?? '(empty)'}" → "${newVal ?? '(empty)'}"`);
        }
      }
    }
    return changes;
  }

  return [];
}

function groupExpensesByMonthYear(expenses: ExpenseWithSplits[]) {
  const groups: Record<string, ExpenseWithSplits[]> = {};
  for (const e of expenses) {
    const d = new Date(e.transaction_date || e.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }
  const sections = Object.entries(groups).map(([key, items]) => {
    items.sort((a, b) => {
      const da = new Date(a.transaction_date || a.created_at).getTime();
      const db = new Date(b.transaction_date || b.created_at).getTime();
      return db - da;
    });
    const first = items[0];
    const d = new Date(first.transaction_date || first.created_at);
    const title = `${d.toLocaleString(undefined, { month: 'long' })} ${d.getFullYear()}`;
    return { title, data: items } as { title: string; data: ExpenseWithSplits[] };
  });
  sections.sort((a, b) => {
    const da = new Date(a.data[0].transaction_date || a.data[0].created_at).getTime();
    const db = new Date(b.data[0].transaction_date || b.data[0].created_at).getTime();
    return db - da;
  });
  return sections;
}

function SwipeableExpenseRow({
  item,
  index,
  userId,
  groupId,
  onLongPress,
}: {
  item: ExpenseWithSplits;
  index: number;
  userId: string | undefined;
  groupId: string;
  onLongPress: () => void;
}) {
  const colors = useColors();
  const swipeRef = useRef<Swipeable>(null);
  const deleteExpense = useDeleteExpense();

  const isEdited = item.updated_at !== item.created_at;
  const myShare = item.splits?.find((s) => s.user_id === userId);
  const isPayer = myShare?.is_payer;
  const payerSplit = item.splits?.find((s) => s.is_payer);
  const payer = payerSplit?.user ?? item.creator;
  const payerName = payer?.full_name ?? 'Unknown';
  const lentAmount = isPayer ? item.amount - Number(myShare?.owed_amount ?? 0) : 0;

  // Status dot color
  const dotColor = !myShare ? colors.textTertiary : isPayer ? colors.success : colors.danger;

  const renderRightActions = () => (
    <Pressable
      style={[styles.swipeAction, { backgroundColor: colors.danger }]}
      onPress={() => {
        impact('medium');
        swipeRef.current?.close();
        Alert.alert('Delete Expense', `Delete "${item.title}"?`, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete', style: 'destructive',
            onPress: () => deleteExpense.mutate({ expenseId: item.id, groupId }),
          },
        ]);
      }}
    >
      <Trash2 size={20} color="#FFFFFF" />
      <Text style={styles.swipeActionText}>Delete</Text>
    </Pressable>
  );

  const renderLeftActions = () => (
    <Pressable
      style={[styles.swipeAction, { backgroundColor: colors.accent }]}
      onPress={() => {
        impact('light');
        swipeRef.current?.close();
        router.push(`/group/${groupId}/edit-expense?expenseId=${item.id}`);
      }}
    >
      <Pencil size={20} color="#FFFFFF" />
      <Text style={styles.swipeActionText}>Edit</Text>
    </Pressable>
  );

  return (
    <FadeInItem index={index}>
      <Swipeable
        ref={swipeRef}
        renderRightActions={renderRightActions}
        renderLeftActions={renderLeftActions}
        overshootLeft={false}
        overshootRight={false}
        friction={2}
      >
        <Pressable
          style={[styles.expenseRow, { backgroundColor: colors.background, borderBottomColor: colors.borderLight }]}
          onPress={() => router.push(`/group/${groupId}/edit-expense?expenseId=${item.id}`)}
          onLongPress={onLongPress}
        >
          <View style={styles.dateColumn}>
            <Text style={[styles.dateDay, { color: colors.accent }]}>
              {format(new Date(item.transaction_date), 'dd')}
            </Text>
            <Text style={[styles.dateMonth, { color: colors.textTertiary }]}>
              {format(new Date(item.transaction_date), 'MMM')}
            </Text>
          </View>

          <View style={[styles.statusDot, { backgroundColor: dotColor }]} />

          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[styles.expenseTitle, { color: colors.textPrimary }]}>{item.title}</Text>
            {item.description ? (
              <Text style={[styles.expenseDesc, { color: colors.textTertiary }]} numberOfLines={1}>
                {item.description}
              </Text>
            ) : null}
            <View style={styles.payerInfoRow}>
              <Avatar
                name={payer?.full_name ?? 'Unknown'}
                uri={payer?.avatar_url ?? undefined}
                size={20}
              />
              <Text style={[styles.payerInfoText, { color: colors.textSecondary }]} numberOfLines={1}>
                {(payer?.id === userId ? 'You' : payerName)} paid {formatCurrency(item.amount)}
              </Text>
            </View>
          </View>

          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            {isEdited && <Badge label="Edited" variant="neutral" size="sm" />}
            {!myShare ? (
              <Text style={[styles.uninvolvedText, { color: colors.textTertiary }]}>Not involved</Text>
            ) : isPayer ? (
              <Text style={[styles.amountText, { color: colors.success }]}>+ {formatCurrency(lentAmount)}</Text>
            ) : (
              <Text style={[styles.amountText, { color: colors.danger }]}>- {formatCurrency(Number(myShare.owed_amount) ?? 0)}</Text>
            )}
          </View>
        </Pressable>
      </Swipeable>
    </FadeInItem>
  );
}

function AuditLogModal({
  visible, onClose, expenseId, groupId,
}: { visible: boolean; onClose: () => void; expenseId: string | null; groupId: string }) {
  const colors = useColors();
  const [logs, setLogs] = React.useState<(AuditLogEntry & { modifier?: { full_name: string } })[]>([]);

  React.useEffect(() => {
    if (!visible || !expenseId) return;
    let cancelled = false;
    supabase
      .from('audit_log')
      .select('*, modifier:profiles!modified_by(full_name)')
      .eq('expense_id', expenseId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { console.error('Failed to fetch audit log:', error); return; }
        setLogs((data as any) ?? []);
      });
    return () => { cancelled = true; };
  }, [visible, expenseId]);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Edit History">
      {logs.length === 0 ? (
        <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 24, ...TYPOGRAPHY.bodyMd }}>
          No edit history
        </Text>
      ) : (
        <View style={{ gap: 16, paddingTop: 8 }}>
          {logs.map((log) => {
            const changes = getAuditChanges(log.action, log.previous_state, log.new_state);
            const changeColor = log.action === 'CREATE' ? colors.accent : log.action === 'DELETE' ? colors.danger : colors.warning;
            return (
              <View key={log.id} style={styles.auditRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.auditUser, { color: colors.textPrimary }]}>
                    {(log as any).modifier?.full_name ?? 'Unknown'} · {log.action.toLowerCase()}d
                  </Text>
                  <Text style={[styles.auditTime, { color: colors.textTertiary }]}>
                    {format(new Date(log.created_at), 'dd MMM yyyy, hh:mm a')}
                  </Text>
                  {changes.length > 0 && (
                    <View style={styles.changesList}>
                      {changes.map((c, i) => (
                        <Text key={i} style={[styles.changeText, { color: changeColor }]}>{c}</Text>
                      ))}
                    </View>
                  )}
                </View>
                <Badge
                  label={log.action}
                  variant={log.action === 'CREATE' ? 'success' : log.action === 'DELETE' ? 'danger' : 'warning'}
                />
              </View>
            );
          })}
        </View>
      )}
    </BottomSheet>
  );
}

// -- Filter Bottom Sheet ----------------------------------------------------

function FilterBottomSheet({
  visible,
  onClose,
  filters,
  onApply,
  members,
  userId,
}: {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (f: FilterState) => void;
  members: { userId: string; name: string; avatarUrl?: string }[];
  userId?: string;
}) {
  const colors = useColors();
  const [draft, setDraft] = useState<FilterState>(filters);

  useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible]);

  const handleReset = () => {
    setDraft(DEFAULT_FILTERS);
    onApply(DEFAULT_FILTERS);
    onClose();
  };

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={handleApply} title="Filter Expenses" showDone>
      <View style={{ gap: SPACING.xl }}>
        {/* Date Presets */}
        <View style={{ gap: SPACING.sm }}>
          <View style={filterStyles.sectionHeader}>
            <CalendarIcon size={16} color={colors.textSecondary} />
            <Text style={[filterStyles.sectionLabel, { color: colors.textSecondary }]}>Date Range</Text>
          </View>
          <View style={filterStyles.presetGrid}>
            {DATE_PRESETS.map((preset) => {
              const selected = draft.datePreset === preset.key;
              return (
                <Pressable
                  key={preset.key}
                  style={[
                    filterStyles.presetPill,
                    {
                      backgroundColor: selected ? colors.accent : colors.surface2,
                      borderColor: selected ? colors.accent : colors.border,
                    },
                  ]}
                  onPress={() => { impact('light'); setDraft((d) => ({ ...d, datePreset: preset.key })); }}
                >
                  <Text style={[filterStyles.presetText, { color: selected ? '#FFFFFF' : colors.textSecondary }]}>
                    {preset.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Who Paid */}
        <View style={{ gap: SPACING.sm }}>
          <View style={filterStyles.sectionHeader}>
            <UserIcon size={16} color={colors.textSecondary} />
            <Text style={[filterStyles.sectionLabel, { color: colors.textSecondary }]}>Who Paid</Text>
          </View>
          <View style={{ gap: 2 }}>
            {/* "Anyone" option */}
            <Pressable
              style={[
                filterStyles.memberRow,
                { backgroundColor: draft.payerId === null ? colors.accentDim : 'transparent', borderRadius: RADIUS.sm },
              ]}
              onPress={() => { impact('light'); setDraft((d) => ({ ...d, payerId: null })); }}
            >
              <View style={[filterStyles.radioOuter, { borderColor: draft.payerId === null ? colors.accent : colors.border }]}>
                {draft.payerId === null && <View style={[filterStyles.radioInner, { backgroundColor: colors.accent }]} />}
              </View>
              <Text style={[filterStyles.memberName, { color: colors.textPrimary }]}>Anyone</Text>
            </Pressable>

            {members.map((member) => {
              const selected = draft.payerId === member.userId;
              const displayName = member.userId === userId ? `${member.name} (You)` : member.name;
              return (
                <Pressable
                  key={member.userId}
                  style={[
                    filterStyles.memberRow,
                    { backgroundColor: selected ? colors.accentDim : 'transparent', borderRadius: RADIUS.sm },
                  ]}
                  onPress={() => { impact('light'); setDraft((d) => ({ ...d, payerId: member.userId })); }}
                >
                  <View style={[filterStyles.radioOuter, { borderColor: selected ? colors.accent : colors.border }]}>
                    {selected && <View style={[filterStyles.radioInner, { backgroundColor: colors.accent }]} />}
                  </View>
                  <Avatar name={member.name} uri={member.avatarUrl} size={28} />
                  <Text style={[filterStyles.memberName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {displayName}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Action buttons */}
        <View style={filterStyles.actionRow}>
          <Pressable
            style={[filterStyles.resetButton, { borderColor: colors.border }]}
            onPress={handleReset}
          >
            <XIcon size={14} color={colors.textTertiary} />
            <Text style={[filterStyles.resetButtonText, { color: colors.textTertiary }]}>Reset Filters</Text>
          </Pressable>
          <Button title="Apply" onPress={handleApply} size="sm" />
        </View>
      </View>
    </BottomSheet>
  );
}

export default function GroupDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.session?.user.id);
  const { data: group } = useGroup(id!);
  const { data: expenses, isLoading: expLoading, isRefetching: expRefetching, refetch: refetchExpenses } = useGroupExpenses(id!);
  const { data: balanceData } = useGroupBalances(id!);
  const [auditExpenseId, setAuditExpenseId] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  // All hooks must be above early return to satisfy Rules of Hooks
  const membersList = useMemo(
    () =>
      (group?.members ?? [])
        .filter((m) => m.status === 'ACTIVE' || m.profile)
        .map((m) => ({
          userId: m.user_id,
          name: m.profile?.full_name ?? 'Unknown',
          avatarUrl: m.profile?.avatar_url ?? undefined,
        })),
    [group?.members],
  );

  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    let result = expenses;

    const range = getDateRange(filters.datePreset);
    if (range) {
      result = result.filter((e) => {
        const d = new Date(e.transaction_date || e.created_at);
        return d >= range.start && d <= range.end;
      });
    }

    if (filters.payerId) {
      result = result.filter((e) => {
        const payerSplit = e.splits?.find((s) => s.is_payer);
        return payerSplit?.user_id === filters.payerId;
      });
    }

    return result;
  }, [expenses, filters]);

  const hasActiveFilters = filters.datePreset !== 'all' || filters.payerId !== null;

  const handleClearFilter = useCallback((key: 'datePreset' | 'payerId') => {
    impact('light');
    setFilters((f) => ({
      ...f,
      [key]: key === 'datePreset' ? 'all' : null,
    }));
  }, []);

  const handleResetAll = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  if (!group) return null;

  const myBalance = balanceData?.balances.find((b) => b.userId === userId);
  const groupIcon = group.icon_url ?? 'Users';

  return (
    <Screen>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => { impact('light'); router.push('/(tabs)'); }}
          hitSlop={10}
        >
          <ArrowLeft size={22} color={colors.accent} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={[styles.headerIconCircle, { backgroundColor: colors.accentDim }]}>
            <GroupIcon name={groupIcon} size={16} color={colors.accent} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>{group.name}</Text>
        </View>
        <Pressable
          onPress={() => router.push(`/group/${id}/members`)}
          hitSlop={10}
        >
          <Info size={22} color={colors.accent} />
        </Pressable>
      </View>

      {/* Balance Card */}
      <Card variant="glass" glow style={styles.balanceCard}>
        <LinearGradient
          colors={[...GRADIENTS.lavender] as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.balanceAccentLine}
        />
        <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Your Balance</Text>
        <BalanceText amount={myBalance?.netBalance ?? 0} size="xl" />
        {balanceData && balanceData.simplifiedDebts.length > 0 && (
          <View style={[styles.debtsPreview, { borderTopColor: colors.borderLight }]}>
            {balanceData.simplifiedDebts.slice(0, 3).map((debt, i) => (
              <Text key={i} style={[styles.debtLine, { color: colors.textSecondary }]}>
                {debt.fromName} → {debt.toName}: {formatCurrency(debt.amount)}
              </Text>
            ))}
          </View>
        )}
        <View style={styles.balanceActions}>
          <Button
            title="+ Add Expense"
            onPress={() => router.push(`/group/${id}/add-expense`)}
            size="sm"
          />
          <Button
            title="Settle Up"
            onPress={() => router.push(`/group/${id}/settle`)}
            variant="outline"
            size="sm"
          />
        </View>
      </Card>

      {/* Swipe hint */}
      {expenses && expenses.length > 0 && !hasActiveFilters && (
        <Text style={[styles.swipeHint, { color: colors.textTertiary }]}>
          Swipe rows to edit or delete
        </Text>
      )}

      {/* Filtered count */}
      {hasActiveFilters && expenses && expenses.length > 0 && (
        <Text style={[styles.swipeHint, { color: colors.textSecondary }]}>
          {filteredExpenses.length} of {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
        </Text>
      )}

      {/* Expense List */}
      <SectionList
        sections={filteredExpenses.length > 0 ? groupExpensesByMonthYear(filteredExpenses) : []}
        stickySectionHeadersEnabled={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 1, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshing={expRefetching}
        onRefresh={refetchExpenses}
        ListEmptyComponent={
          expLoading ? (
            <>
              <SkeletonExpenseRow />
              <SkeletonExpenseRow />
              <SkeletonExpenseRow />
            </>
          ) : hasActiveFilters ? (
            <EmptyState
              IconComponent={Wallet}
              title="No matching expenses"
              description="Try adjusting your filters"
              actionLabel="Reset Filters"
              onAction={handleResetAll}
            />
          ) : (
            <EmptyState
              IconComponent={Wallet}
              title="No expenses yet"
              description="Add your first expense to start tracking"
              actionLabel="Add Expense"
              onAction={() => router.push(`/group/${id}/add-expense`)}
            />
          )
        }
        renderSectionHeader={({ section: s, section }) => {
          const sections = filteredExpenses.length > 0 ? groupExpensesByMonthYear(filteredExpenses) : [];
          const isFirst = sections.length > 0 && sections[0].title === s.title;
          return (
            <View style={[styles.section, { backgroundColor: colors.background }]} key={String(s.title)}>
              <View style={styles.sectionRow}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{s.title}</Text>
                {isFirst && (
                  <View style={styles.sectionRight}>
                    {hasActiveFilters && (
                      <Pressable
                        style={[filterStyles.resetChip, { borderColor: colors.border }]}
                        onPress={() => { impact('light'); handleResetAll(); }}
                      >
                        <XIcon size={11} color={colors.textTertiary} />
                        <Text style={[filterStyles.resetText, { color: colors.textTertiary }]}>Reset</Text>
                      </Pressable>
                    )}
                    <Pressable
                      style={[
                        filterStyles.filterIconBtn,
                        {
                          backgroundColor: hasActiveFilters ? colors.accent : colors.surface2,
                          borderColor: hasActiveFilters ? colors.accent : colors.border,
                        },
                      ]}
                      onPress={() => { impact('light'); setShowFilters(true); }}
                      hitSlop={8}
                    >
                      <FilterIcon size={16} color={hasActiveFilters ? '#FFFFFF' : colors.textSecondary} />
                      {hasActiveFilters && (
                        <View style={[filterStyles.filterBadge, { backgroundColor: colors.danger }]}>
                          <Text style={filterStyles.filterBadgeText}>
                            {(filters.datePreset !== 'all' ? 1 : 0) + (filters.payerId ? 1 : 0)}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  </View>
                )}
              </View>
              {/* Active filter chips - only on first section */}
              {isFirst && hasActiveFilters && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: SPACING.sm }} contentContainerStyle={{ gap: 8 }}>
                  {filters.datePreset !== 'all' && (
                    <Pressable
                      style={[filterStyles.chip, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}
                      onPress={() => handleClearFilter('datePreset')}
                    >
                      <CalendarIcon size={13} color={colors.accent} />
                      <Text style={[filterStyles.chipText, { color: colors.accent }]}>
                        {DATE_PRESETS.find((p) => p.key === filters.datePreset)?.label}
                      </Text>
                      <XIcon size={12} color={colors.accent} />
                    </Pressable>
                  )}
                  {filters.payerId && (
                    <Pressable
                      style={[filterStyles.chip, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}
                      onPress={() => handleClearFilter('payerId')}
                    >
                      <UserIcon size={13} color={colors.accent} />
                      <Text style={[filterStyles.chipText, { color: colors.accent }]} numberOfLines={1}>
                        {membersList.find((m) => m.userId === filters.payerId)?.name ?? 'Unknown'}
                      </Text>
                      <XIcon size={12} color={colors.accent} />
                    </Pressable>
                  )}
                </ScrollView>
              )}
            </View>
          );
        }}
        renderItem={({ item, index }) => (
          <SwipeableExpenseRow
            item={item}
            index={index}
            userId={userId}
            groupId={id!}
            onLongPress={() => {
              setAuditExpenseId(item.id);
              setShowAudit(true);
            }}
          />
        )}
      />

      <AuditLogModal
        visible={showAudit}
        onClose={() => setShowAudit(false)}
        expenseId={auditExpenseId}
        groupId={id!}
      />

      <FilterBottomSheet
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onApply={setFilters}
        members={membersList}
        userId={userId}
      />

      <UndoToast />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  headerIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.bodyLg,
    fontWeight: '700',
  },
  balanceCard: {
    marginTop: SPACING.sm,
    alignItems: 'center',
    gap: SPACING.md,
    overflow: 'hidden',
  },
  balanceAccentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  balanceLabel: {
    ...TYPOGRAPHY.labelMd,
  },
  debtsPreview: {
    width: '100%',
    paddingTop: SPACING.md,
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  debtLine: {
    ...TYPOGRAPHY.caption,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  swipeHint: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  section: {
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    ...TYPOGRAPHY.labelLg,
    fontWeight: '700',
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dateColumn: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: SPACING.xs,
  },
  dateDay: {
    ...TYPOGRAPHY.h2,
  },
  dateMonth: {
    ...TYPOGRAPHY.overline,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  expenseTitle: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
  },
  expenseDesc: {
    ...TYPOGRAPHY.caption,
    fontStyle: 'italic',
  },
  payerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  payerInfoText: {
    ...TYPOGRAPHY.caption,
    flex: 1,
  },
  uninvolvedText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '500',
  },
  amountText: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '700',
  },
  swipeAction: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  swipeActionText: {
    color: '#FFFFFF',
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  auditRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  auditUser: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '500',
  },
  auditTime: {
    ...TYPOGRAPHY.caption,
  },
  changesList: {
    marginTop: 4,
    gap: 2,
    paddingLeft: 4,
  },
  changeText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

const filterStyles = StyleSheet.create({
  filterIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    maxWidth: 180,
  },
  chipText: {
    ...TYPOGRAPHY.caption,
    flexShrink: 1,
  },
  resetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  resetText: {
    ...TYPOGRAPHY.caption,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionLabel: {
    ...TYPOGRAPHY.labelSm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  presetPill: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
  },
  presetText: {
    ...TYPOGRAPHY.labelSm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  memberName: {
    ...TYPOGRAPHY.bodyMd,
    flex: 1,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
  },
  resetButtonText: {
    ...TYPOGRAPHY.labelSm,
  },
});
