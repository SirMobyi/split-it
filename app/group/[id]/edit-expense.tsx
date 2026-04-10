import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Button, Input, Card, Avatar, DatePicker } from '../../../src/components/ui';
import { useGroup } from '../../../src/hooks/use-groups';
import { useGroupExpenses, useUpdateExpense, useDeleteExpense } from '../../../src/hooks/use-expenses';
import { useAuthStore } from '../../../src/stores/auth-store';
import { useToastStore } from '../../../src/stores/toast-store';
import { validateSplits, calculateEqualSplit } from '../../../src/lib/debt-engine';
import { supabase } from '../../../src/lib/supabase';
import { SPACING, TYPOGRAPHY, RADIUS, formatCurrency } from '../../../src/constants/theme';
import { useColors } from '../../../src/hooks/use-colors';
import { impact } from '../../../src/utils/haptics';
import type { SplitType } from '../../../src/types/database';
import { useQueryClient } from '@tanstack/react-query';

type SplitEntry = { userId: string; name: string; amount: string };

export default function EditExpenseScreen() {
  const colors = useColors();
  const { id: groupId, expenseId } = useLocalSearchParams<{ id: string; expenseId: string }>();
  const userId = useAuthStore((s) => s.session?.user.id);
  const { data: group } = useGroup(groupId!);
  const { data: expenses } = useGroupExpenses(groupId!);
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const showUndoToast = useToastStore((s) => s.showUndoToast);
  const queryClient = useQueryClient();

  const expense = useMemo(
    () => expenses?.find((e) => e.id === expenseId),
    [expenses, expenseId]
  );

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  const [payerId, setPayerId] = useState('');
  const [customSplits, setCustomSplits] = useState<SplitEntry[]>([]);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const activeMembers = useMemo(
    () => group?.members?.filter((m) => m.status === 'ACTIVE') ?? [],
    [group]
  );

  useEffect(() => {
    if (expense) {
      setTitle(expense.title);
      setAmount(String(expense.amount));
      setDescription(expense.description ?? '');
      setTransactionDate(expense.transaction_date);
      setSplitType(expense.split_type);
      const payer = expense.splits?.find((s) => s.is_payer);
      setPayerId(payer?.user_id ?? userId ?? '');

      if (expense.split_type !== 'EQUAL') {
        setCustomSplits(
          expense.splits?.map((s) => ({
            userId: s.user_id,
            name: s.user?.full_name ?? '?',
            amount: expense.split_type === 'PERCENTAGE'
              ? String(Math.round((s.owed_amount / expense.amount) * 100))
              : String(s.owed_amount),
          })) ?? []
        );
      }
    }
  }, [expense]);

  const parsedAmount = parseFloat(amount) || 0;

  const validation = useMemo(() => {
    if (splitType === 'EQUAL') return { valid: true, remaining: 0 };
    const splits = customSplits.map((s) => ({ amount: parseFloat(s.amount) || 0 }));
    return validateSplits(
      splitType === 'PERCENTAGE' ? 100 : parsedAmount,
      splits,
      splitType as 'EXACT_AMOUNT' | 'PERCENTAGE'
    );
  }, [customSplits, parsedAmount, splitType]);

  const remaining = useMemo(() => {
    if (splitType !== 'EXACT_AMOUNT') return 0;
    const allocated = customSplits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
    return Math.round((parsedAmount - allocated) * 100) / 100;
  }, [customSplits, parsedAmount, splitType]);

  const initCustomSplits = () => {
    setCustomSplits(
      activeMembers.map((m) => ({
        userId: m.user_id,
        name: m.profile?.full_name ?? '?',
        amount: '',
      }))
    );
  };

  const hasChanges = useMemo(() => {
    if (!expense) return false;
    if (title.trim() !== expense.title) return true;
    if (parsedAmount !== expense.amount) return true;
    if ((description.trim() || null) !== (expense.description ?? null)) return true;
    if (transactionDate !== expense.transaction_date) return true;
    if (splitType !== expense.split_type) return true;
    const origPayer = expense.splits?.find((s) => s.is_payer);
    if (payerId !== (origPayer?.user_id ?? '')) return true;
    if (splitType !== 'EQUAL' && expense.split_type !== 'EQUAL') {
      for (const cs of customSplits) {
        const origSplit = expense.splits?.find((s) => s.user_id === cs.userId);
        if (!origSplit) return true;
        const origVal = expense.split_type === 'PERCENTAGE'
          ? Math.round((origSplit.owed_amount / expense.amount) * 100)
          : origSplit.owed_amount;
        if ((parseFloat(cs.amount) || 0) !== origVal) return true;
      }
    }
    return false;
  }, [title, parsedAmount, description, transactionDate, splitType, payerId, customSplits, expense]);

  const handleSave = async () => {
    setError('');
    if (!title.trim()) { setError('Title is required'); return; }
    if (parsedAmount <= 0) { setError('Amount must be positive'); return; }
    if (!payerId) { setError('Select who paid'); return; }

    if (!hasChanges) {
      router.back();
      return;
    }

    let newSplits: { userId: string; amount: number; isPayer: boolean }[] | undefined;

    if (splitType === 'EQUAL') {
      const amounts = calculateEqualSplit(parsedAmount, activeMembers.length);
      newSplits = activeMembers.map((m, i) => ({
        userId: m.user_id,
        amount: amounts[i],
        isPayer: m.user_id === payerId,
      }));
    } else if (splitType === 'PERCENTAGE') {
      if (!validation.valid) { setError('Percentages must sum to 100%'); return; }
      newSplits = customSplits.map((s) => ({
        userId: s.userId,
        amount: Math.round(parsedAmount * (parseFloat(s.amount) || 0)) / 100,
        isPayer: s.userId === payerId,
      }));
    } else {
      if (!validation.valid) { setError('Amounts must match total'); return; }
      newSplits = customSplits.map((s) => ({
        userId: s.userId,
        amount: parseFloat(s.amount) || 0,
        isPayer: s.userId === payerId,
      }));
    }

    const prevExpense = expense;
    const prevSplits = expense?.splits?.map((s) => ({
      userId: s.user_id,
      amount: Number(s.owed_amount),
      isPayer: s.is_payer,
    }));

    try {
      impact('medium');
      await updateExpense.mutateAsync({
        expenseId: expenseId!,
        groupId: groupId!,
        updates: {
          title: title.trim(),
          amount: parsedAmount,
          description: description.trim() || null,
          transaction_date: transactionDate,
          split_type: splitType,
        },
        newSplits,
      });

      showUndoToast(`"${title.trim()}" updated`, async () => {
        if (!prevExpense) return;
        await updateExpense.mutateAsync({
          expenseId: expenseId!,
          groupId: groupId!,
          updates: {
            title: prevExpense.title,
            amount: prevExpense.amount,
            description: prevExpense.description ?? null,
            transaction_date: prevExpense.transaction_date,
            split_type: prevExpense.split_type,
          },
          newSplits: prevSplits,
        });
      });
      router.back();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    const deletedTitle = expense?.title ?? 'Expense';

    try {
      impact('medium');
      await deleteExpense.mutateAsync({ expenseId: expenseId!, groupId: groupId! });

      showUndoToast(`"${deletedTitle}" deleted`, async () => {
        await supabase
          .from('expenses')
          .update({ is_deleted: false })
          .eq('id', expenseId!);

        queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
        queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
        queryClient.invalidateQueries({ queryKey: ['activity'] });
      });
      router.back();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (!group || !expense) return null;

  return (
    <Screen scrollable>
      <View style={styles.header}>
        <Button title="Cancel" onPress={() => router.push(`/group/${groupId}`)} variant="ghost" size="sm" />
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Edit Expense</Text>
        <View style={{ width: 60 }} />
      </View>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.dangerDim }]}>
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.form}>
        <Input
          label="Title"
          placeholder="e.g. Dinner at Barbeque Nation"
          value={title}
          onChangeText={setTitle}
        />

        <Input
          label="Amount"
          prefix="₹"
          placeholder="0.00"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />

        <Input
          label="Description (optional)"
          placeholder="Details, item list, etc."
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <DatePicker
          label="Transaction Date"
          value={transactionDate}
          onChange={setTransactionDate}
          maxDate={new Date()}
        />

        {/* Paid By */}
        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Paid By</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {activeMembers.map((m) => (
                <Pressable
                  key={m.user_id}
                  onPress={() => { impact('light'); setPayerId(m.user_id); }}
                  style={[
                    styles.memberChip,
                    { backgroundColor: colors.surface },
                    payerId === m.user_id && { backgroundColor: colors.accentDim, borderColor: colors.accent, borderWidth: 1.5 },
                  ]}
                >
                  <Avatar name={m.profile?.full_name ?? '?'} uri={m.profile?.avatar_url} size={24} ring={payerId === m.user_id} />
                  <Text style={[
                    styles.memberChipText,
                    { color: colors.textSecondary },
                    payerId === m.user_id && { color: colors.accent, fontWeight: '700' },
                  ]}>
                    {m.user_id === userId ? 'You' : m.profile?.full_name?.split(' ')[0]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Split Type */}
        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Split Type</Text>
          <View style={styles.splitTypeRow}>
            {(['EQUAL', 'EXACT_AMOUNT', 'PERCENTAGE'] as SplitType[]).map((type) => (
              <Pressable
                key={type}
                onPress={() => {
                  impact('light');
                  setSplitType(type);
                  if (type !== 'EQUAL') initCustomSplits();
                }}
                style={[
                  styles.splitTypeBtn,
                  { backgroundColor: colors.surface },
                  splitType === type && { backgroundColor: colors.accentDim, borderColor: colors.accent, borderWidth: 1.5 },
                ]}
              >
                <Text style={[
                  styles.splitTypeText,
                  { color: colors.textSecondary },
                  splitType === type && { color: colors.accent, fontWeight: '700' },
                ]}>
                  {type === 'EQUAL' ? 'Equal' : type === 'EXACT_AMOUNT' ? 'Exact ₹' : 'Percentage'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {splitType === 'EQUAL' && parsedAmount > 0 && (
          <Card variant="glass">
            <Text style={[styles.splitPreviewTitle, { color: colors.textSecondary }]}>Each person pays</Text>
            <Text style={[styles.splitPreviewAmount, { color: colors.textPrimary }]}>
              {formatCurrency(parsedAmount / activeMembers.length)}
            </Text>
          </Card>
        )}

        {splitType !== 'EQUAL' && (
          <View style={{ gap: SPACING.sm }}>
            {remaining !== 0 && splitType === 'EXACT_AMOUNT' && (
              <Card style={{ backgroundColor: remaining > 0 ? colors.accentDim : colors.dangerDim }}>
                <Text style={{ color: remaining > 0 ? colors.accent : colors.danger, ...TYPOGRAPHY.caption, fontWeight: '600' }}>
                  {remaining > 0
                    ? `₹${remaining.toFixed(2)} remaining to allocate`
                    : `₹${Math.abs(remaining).toFixed(2)} over-allocated`}
                </Text>
              </Card>
            )}
            {customSplits.map((split, i) => (
              <View key={split.userId} style={styles.customSplitRow}>
                <Avatar name={split.name} size={28} />
                <Text style={[styles.customSplitName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {split.userId === userId ? 'You' : split.name}
                </Text>
                <View style={{ width: 100 }}>
                  <Input
                    prefix={splitType === 'PERCENTAGE' ? '%' : '₹'}
                    placeholder="0"
                    value={split.amount}
                    onChangeText={(t) => {
                      const newSplits = [...customSplits];
                      newSplits[i] = { ...split, amount: t };
                      setCustomSplits(newSplits);
                    }}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        <Button
          title={hasChanges ? 'Save Changes' : 'No Changes'}
          onPress={handleSave}
          loading={updateExpense.isPending}
          fullWidth
          size="lg"
          disabled={!hasChanges || (splitType !== 'EQUAL' && !validation.valid)}
        />

        <Button
          title={confirmDelete ? 'Confirm Delete' : 'Delete Expense'}
          onPress={handleDelete}
          loading={deleteExpense.isPending}
          variant="danger"
          fullWidth
          size="sm"
        />
        {confirmDelete && (
          <Text style={{ color: colors.danger, ...TYPOGRAPHY.caption, textAlign: 'center' }}>
            Tap again to permanently delete this expense
          </Text>
        )}
      </View>
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
  headerTitle: {
    ...TYPOGRAPHY.bodyLg,
    fontWeight: '700',
  },
  form: {
    gap: SPACING.lg,
    paddingBottom: 40,
  },
  label: {
    ...TYPOGRAPHY.caption,
    fontWeight: '500',
  },
  errorBox: {
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  errorText: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '500',
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  memberChipText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '500',
  },
  splitTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  splitTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  splitTypeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '500',
  },
  splitPreviewTitle: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
  },
  splitPreviewAmount: {
    ...TYPOGRAPHY.monoLg,
    textAlign: 'center',
    marginTop: 4,
  },
  customSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customSplitName: {
    flex: 1,
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '500',
  },
});
