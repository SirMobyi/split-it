import React, { useState, useRef, useEffect } from 'react';
import { View, Text, SectionList, StyleSheet, Pressable, Platform, Alert, Animated } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Wallet, ArrowLeft, Info, Pencil, Trash2 } from 'lucide-react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';

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

function getAuditChanges(prev: Record<string, unknown> | null, next: Record<string, unknown> | null): string[] {
  if (!prev || !next) return [];
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
            const changes = getAuditChanges(log.previous_state, log.new_state);
            return (
              <View key={log.id} style={styles.auditRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.auditUser, { color: colors.textPrimary }]}>
                    {(log as any).modifier?.full_name ?? 'Unknown'}
                  </Text>
                  <Text style={[styles.auditTime, { color: colors.textTertiary }]}>
                    {format(new Date(log.created_at), 'dd MMM yyyy, hh:mm a')}
                  </Text>
                  {changes.length > 0 && (
                    <View style={styles.changesList}>
                      {changes.map((c, i) => (
                        <Text key={i} style={[styles.changeText, { color: colors.warning }]}>{c}</Text>
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

export default function GroupDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.session?.user.id);
  const { data: group } = useGroup(id!);
  const { data: expenses, isLoading: expLoading, isRefetching: expRefetching, refetch: refetchExpenses } = useGroupExpenses(id!);
  const { data: balanceData } = useGroupBalances(id!);
  const [auditExpenseId, setAuditExpenseId] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);

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
      {expenses && expenses.length > 0 && (
        <Text style={[styles.swipeHint, { color: colors.textTertiary }]}>
          Swipe rows to edit or delete
        </Text>
      )}

      {/* Expense List */}
      <SectionList
        sections={(expenses ?? []).length > 0 ? groupExpensesByMonthYear(expenses ?? []) : []}
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
        renderSectionHeader={({ section: s }) => (
          <View style={[styles.section, { backgroundColor: colors.background }]} key={String(s.title)}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{s.title}</Text>
          </View>
        )}
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
