import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Button, Input, Card, Avatar, DatePicker } from '../../../src/components/ui';
import { useGroup } from '../../../src/hooks/use-groups';
import { useCreateExpense } from '../../../src/hooks/use-expenses';
import { useAuthStore } from '../../../src/stores/auth-store';
import { calculateEqualSplit, validateSplits } from '../../../src/lib/debt-engine';
import { SPACING, formatCurrency } from '../../../src/constants/theme';
import { useColors } from '../../../src/hooks/use-colors';
import type { SplitType } from '../../../src/types/database';

type SplitEntry = { userId: string; name: string; amount: string };

export default function AddExpenseScreen() {
  const colors = useColors();
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.session?.user.id);
  const { data: group } = useGroup(groupId!);
  const createExpense = useCreateExpense();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  const [payerId, setPayerId] = useState(userId ?? '');

  const activeMembers = useMemo(
    () => group?.members?.filter((m) => m.status === 'ACTIVE') ?? [],
    [group]
  );

  const [customSplits, setCustomSplits] = useState<SplitEntry[]>([]);

  // Initialize custom splits when switching to custom mode
  const initCustomSplits = () => {
    setCustomSplits(
      activeMembers.map((m) => ({
        userId: m.user_id,
        name: m.profile?.full_name ?? '?',
        amount: '',
      }))
    );
  };

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

  const handleSubmit = async () => {
    if (!title.trim()) return Alert.alert('Error', 'Title is required');
    if (parsedAmount <= 0) return Alert.alert('Error', 'Amount must be positive');
    if (!payerId) return Alert.alert('Error', 'Select who paid');

    let splits: { userId: string; amount: number }[];

    if (splitType === 'EQUAL') {
      const amounts = calculateEqualSplit(parsedAmount, activeMembers.length);
      splits = activeMembers.map((m, i) => ({
        userId: m.user_id,
        amount: amounts[i],
      }));
    } else if (splitType === 'PERCENTAGE') {
      if (!validation.valid) return Alert.alert('Error', validation.error);
      splits = customSplits.map((s) => ({
        userId: s.userId,
        amount: Math.round(parsedAmount * (parseFloat(s.amount) || 0)) / 100,
      }));
    } else {
      if (!validation.valid) return Alert.alert('Error', validation.error);
      splits = customSplits.map((s) => ({
        userId: s.userId,
        amount: parseFloat(s.amount) || 0,
      }));
    }

    try {
      await createExpense.mutateAsync({
        groupId: groupId!,
        title: title.trim(),
        amount: parsedAmount,
        description: description.trim() || undefined,
        transactionDate,
        splitType,
        payerId,
        splits,
      });
      router.push(`/group/${groupId}`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  if (!group) return null;

  return (
    <Screen scrollable>
      <View style={styles.header}>
        <Button title="Cancel" onPress={() => router.push(`/group/${groupId}`)} variant="ghost" size="sm" />
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Add Expense</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.form}>
        <Input
          label="Title"
          placeholder="e.g. Dinner at Barbeque Nation"
          value={title}
          onChangeText={setTitle}
          autoFocus
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
              {activeMembers.map((m) => (
                <TouchableOpacity
                  key={m.user_id}
                  onPress={() => setPayerId(m.user_id)}
                  style={[
                    styles.memberChip,
                    { backgroundColor: colors.surface },
                    payerId === m.user_id && { backgroundColor: colors.accentDim },
                  ]}
                >
                  <Avatar name={m.profile?.full_name ?? '?'} uri={m.profile?.avatar_url} size={24} />
                  <Text style={[
                    styles.memberChipText,
                    { color: colors.textSecondary },
                    payerId === m.user_id && { color: colors.accent },
                  ]}>
                    {m.user_id === userId ? 'You' : m.profile?.full_name?.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Split Type */}
        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Split Type</Text>
          <View style={styles.splitTypeRow}>
            {(['EQUAL', 'EXACT_AMOUNT', 'PERCENTAGE'] as SplitType[]).map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => {
                  setSplitType(type);
                  if (type !== 'EQUAL') initCustomSplits();
                }}
                style={[
                  styles.splitTypeBtn,
                  { backgroundColor: colors.surface },
                  splitType === type && { backgroundColor: colors.accentDim },
                ]}
              >
                <Text style={[
                  styles.splitTypeText,
                  { color: colors.textSecondary },
                  splitType === type && { color: colors.accent },
                ]}>
                  {type === 'EQUAL' ? 'Equal' : type === 'EXACT_AMOUNT' ? 'Exact ₹' : 'Percentage'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Equal split preview */}
        {splitType === 'EQUAL' && parsedAmount > 0 && (
          <Card>
            <Text style={[styles.splitPreviewTitle, { color: colors.textSecondary }]}>Each person pays</Text>
            <Text style={[styles.splitPreviewAmount, { color: colors.textPrimary }]}>
              {formatCurrency(parsedAmount / activeMembers.length)}
            </Text>
          </Card>
        )}

        {/* Custom splits */}
        {splitType !== 'EQUAL' && (
          <View style={{ gap: SPACING.sm }}>
            {remaining !== 0 && splitType === 'EXACT_AMOUNT' && (
              <Card style={{ backgroundColor: remaining > 0 ? colors.accentDim : colors.dangerDim }}>
                <Text style={{ color: remaining > 0 ? colors.accent : colors.danger, fontSize: 13, fontWeight: '600' }}>
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
          title="Add Expense"
          onPress={handleSubmit}
          loading={createExpense.isPending}
          fullWidth
          size="lg"
          disabled={splitType !== 'EQUAL' && !validation.valid}
        />
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
    fontSize: 17,
    fontWeight: '700',
  },
  form: {
    gap: SPACING.lg,
    paddingBottom: 40,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  memberChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  splitTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  splitTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  splitTypeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  splitPreviewTitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  splitPreviewAmount: {
    fontSize: 24,
    fontWeight: '800',
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
    fontSize: 15,
    fontWeight: '500',
  },
});
