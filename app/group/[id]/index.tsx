import React, { useState } from 'react';
import { View, Text, SectionList, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Wallet, ArrowLeft, Info } from 'lucide-react-native';
import { Screen, Card, Button, Avatar, Badge, BalanceText, EmptyState, BottomSheet, GroupIcon, UndoToast, SkeletonExpenseRow } from '../../../src/components/ui';
import { useGroup } from '../../../src/hooks/use-groups';
import { useGroupExpenses, useUpdateExpense, useDeleteExpense } from '../../../src/hooks/use-expenses';
import { useGroupBalances } from '../../../src/hooks/use-balances';
import { useAuthStore } from '../../../src/stores/auth-store';
import { SPACING, formatCurrency } from '../../../src/constants/theme';
import { useColors } from '../../../src/hooks/use-colors';
import { formatDistanceToNow, format } from 'date-fns';
import type { AuditLogEntry, ExpenseWithSplits } from '../../../src/types/database';
import { supabase } from '../../../src/lib/supabase';

/** Computes a human-readable diff between previous and new audit states */
function getAuditChanges(prev: Record<string, unknown> | null, next: Record<string, unknown> | null): string[] {
  if (!prev || !next) return [];
  const changes: string[] = [];
  const fields: Record<string, string> = {
    title: 'Title',
    amount: 'Amount',
    description: 'Description',
    transaction_date: 'Date',
    split_type: 'Split type',
    status: 'Status',
    note: 'Note',
  };

  for (const [key, label] of Object.entries(fields)) {
    const oldVal = prev[key];
    const newVal = next[key];
    if (oldVal !== undefined && newVal !== undefined && oldVal !== newVal) {
      if (key === 'amount') {
        changes.push(`${label}: ${formatCurrency(Number(oldVal))} -> ${formatCurrency(Number(newVal))}`);
      } else {
        changes.push(`${label}: "${oldVal ?? '(empty)'}" -> "${newVal ?? '(empty)'}"`);
      }
    }
  }
  return changes;
}

/** Group expenses into sections keyed by month-year (e.g., March 2026) */
function groupExpensesByMonthYear(expenses: ExpenseWithSplits[]) {
  const groups: Record<string, ExpenseWithSplits[]> = {};

  for (const e of expenses) {
    const d = new Date(e.created_at || e.transaction_date);
    const month = d.toLocaleString(undefined, { month: 'long' });
    const year = d.getFullYear();
    const key = `${year}-${d.getMonth()}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }

  const sections = Object.entries(groups).map(([key, items]) => {
    // sort items by created_at descending (newest first)
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const first = items[0];
    const d = new Date(first.created_at || first.transaction_date);
    const title = `${d.toLocaleString(undefined, { month: 'long' })} ${d.getFullYear()}`;
    return { title, data: items } as { title: string; data: ExpenseWithSplits[] };
  });

  // sort sections by the date of their first item (newest month first)
  sections.sort((a, b) => new Date(b.data[0].created_at).getTime() - new Date(a.data[0].created_at).getTime());
  return sections;
}

function AuditLogModal({
  visible,
  onClose,
  expenseId,
  groupId,
}: {
  visible: boolean;
  onClose: () => void;
  expenseId: string | null;
  groupId: string;
}) {
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
        <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 24 }}>
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

  // Default group icon
  const groupIcon = group.icon_url ?? 'Users';

  return (
    <Screen>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)')}
          accessibilityLabel="Back"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={20} color={colors.accent} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <GroupIcon name={groupIcon} size={18} color={colors.textPrimary} />
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>{group.name}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push(`/group/${id}/members`)}
          accessibilityLabel="Members"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Info size={20} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Balance Card */}
      <Card style={styles.balanceCard}>
        <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Your Balance</Text>
        <BalanceText amount={myBalance?.netBalance ?? 0} size="xl" />
        {balanceData && balanceData.simplifiedDebts.length > 0 && (
          <View style={[styles.debtsPreview, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight }]}>
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
            variant="secondary"
            size="sm"
          />
        </View>
      </Card>

      {/* Expense List */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Expenses</Text>
      </View>

      {/* Group expenses into sections by month/year and show a date column on the left */}
      <SectionList
        sections={(expenses ?? []).length > 0 ? groupExpensesByMonthYear(expenses ?? []) : []}
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
          <View style={styles.section} key={String(s.title)}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{s.title}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const isEdited = item.updated_at !== item.created_at;
          const myShare = item.splits?.find((s) => s.user_id === userId);
          const isPayer = myShare?.is_payer;
          const payerSplit = item.splits?.find((s) => s.is_payer);
          const payer = payerSplit?.user ?? item.creator;
          const payerName = payer?.full_name ?? 'Unknown';

          const lentAmount = isPayer
            ? item.amount - Number(myShare?.owed_amount ?? 0)
            : 0;

          return (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.expenseRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight }]}
              onPress={() => {
                router.push(`/group/${id}/edit-expense?expenseId=${item.id}`);
              }}
              onLongPress={() => {
                setAuditExpenseId(item.id);
                setShowAudit(true);
              }}
            >
              <View style={styles.dateColumn}>
                <Text style={[styles.dateDay, { color: colors.accent }]}>{format(new Date(item.transaction_date), 'dd')}</Text>
                <Text style={[styles.dateMonth, { color: colors.textTertiary }]}>{format(new Date(item.transaction_date), 'MMM')}</Text>
              </View>

              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.expenseTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                </View>
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
                <Text style={[styles.expenseDate, { color: colors.textTertiary }]}> 
                  {format(new Date(item.created_at), 'hh:mm a')}
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                {!myShare ? (
                  <Text style={{ color: colors.textTertiary, fontSize: 13, fontWeight: '500', marginTop: isEdited ? 16 : 0 }}>
                    Not involved
                  </Text>
                ) : isPayer ? (
                  <Text style={{ color: colors.success, fontSize: 16, fontWeight: '700', marginTop: isEdited ? 16 : 0 }}>
                    + {formatCurrency(lentAmount)}
                  </Text>
                ) : (
                  <Text style={{ color: colors.danger, fontSize: 16, fontWeight: '700', marginTop: isEdited ? 16 : 0 }}>
                    - {formatCurrency(Number(myShare.owed_amount) ?? 0)}
                  </Text>
                )}
              </View>

              {isEdited && (
                <View style={{ position: 'absolute', top: SPACING.sm, right: SPACING.sm }}>
                  <Badge label="Edited" variant="neutral" size="sm" />
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      <AuditLogModal
        visible={showAudit}
        onClose={() => setShowAudit(false)}
        expenseId={auditExpenseId}
        groupId={id!}
      />

      {/* Deletion is handled from Dashboard only — removed inline delete controls here */}

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
    gap: 6,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  backBtn: {
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  membersBtn: {
    fontSize: 15,
    fontWeight: '600',
  },
  balanceCard: {
    marginTop: SPACING.sm,
    alignItems: 'center',
    gap: SPACING.md,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  debtsPreview: {
    width: '100%',
    paddingTop: SPACING.md,
    gap: 4,
  },
  debtLine: {
    fontSize: 13,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  section: {
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  dateColumn: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: SPACING.sm,
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '700',
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  expenseTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  expenseDesc: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  expenseMeta: {
    fontSize: 13,
  },
  payerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  payerInfoText: {
    fontSize: 13,
    flex: 1,
  },
  expenseDate: {
    fontSize: 12,
  },
  tapHint: {
    fontSize: 12,
  },
  auditRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  auditUser: {
    fontSize: 15,
    fontWeight: '500',
  },
  auditTime: {
    fontSize: 13,
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
