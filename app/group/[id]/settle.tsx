import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CircleCheck } from 'lucide-react-native';
import { Screen, Button, Input, Card, Avatar, BalanceText, Badge, BottomSheet } from '../../../src/components/ui';
import { useGroup } from '../../../src/hooks/use-groups';
import { useGroupBalances } from '../../../src/hooks/use-balances';
import { useGroupPayments, useCreatePayment, useConfirmPayment, useEditPayment } from '../../../src/hooks/use-payments';
import { useAuthStore } from '../../../src/stores/auth-store';
import { launchUPIPayment, isUPIAvailable } from '../../../src/lib/upi';
import { SPACING, formatCurrency } from '../../../src/constants/theme';
import { useColors } from '../../../src/hooks/use-colors';
import { format } from 'date-fns';

export default function SettleScreen() {
  const colors = useColors();
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.session?.user.id);
  const profile = useAuthStore((s) => s.profile);
  const { data: group } = useGroup(groupId!);
  const { data: balanceData } = useGroupBalances(groupId!);
  const { data: payments } = useGroupPayments(groupId!);
  const createPayment = useCreatePayment();
  const confirmPayment = useConfirmPayment();
  const editPayment = useEditPayment();

  const [selectedPayee, setSelectedPayee] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [tab, setTab] = useState<'settle' | 'history'>('settle');
  const [error, setError] = useState('');

  // Edit payment state
  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editError, setEditError] = useState('');

  const myDebts = useMemo(() => {
    if (!balanceData) return [];
    return balanceData.simplifiedDebts.filter((d) => d.from === userId);
  }, [balanceData, userId]);

  const myCredits = useMemo(() => {
    if (!balanceData) return [];
    return balanceData.simplifiedDebts.filter((d) => d.to === userId);
  }, [balanceData, userId]);

  const handlePay = async () => {
    setError('');
    if (!selectedPayee || !amount) return;
    const parsedAmount = parseFloat(amount);
    if (parsedAmount <= 0) { setError('Amount must be positive'); return; }

    try {
      await createPayment.mutateAsync({
        groupId: groupId!,
        payeeId: selectedPayee,
        amount: parsedAmount,
        note: `Settlement from ${profile?.full_name}`,
      });

      // Try UPI launch on native
      const payee = group?.members?.find((m) => m.user_id === selectedPayee);
      const payeeProfile = payee?.profile;

      if (payeeProfile?.upi_vpa) {
        const launched = await launchUPIPayment({
          vpa: payeeProfile.upi_vpa,
          name: payeeProfile.full_name,
          amount: parsedAmount,
          note: `Split-It: ${group?.name}`,
        });

        if (!launched) {
          setError('No UPI app found. Payment recorded — ask receiver to confirm.');
        }
      }

      setSelectedPayee(null);
      setAmount('');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleConfirmReceipt = async (paymentId: string) => {
    try {
      await confirmPayment.mutateAsync({
        paymentId,
        groupId: groupId!,
        role: 'receiver',
      });
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleEditPayment = async () => {
    setEditError('');
    if (!editingPayment) return;
    const parsedAmount = parseFloat(editAmount);
    if (parsedAmount <= 0) { setEditError('Amount must be positive'); return; }

    try {
      await editPayment.mutateAsync({
        paymentId: editingPayment,
        groupId: groupId!,
        updates: {
          amount: parsedAmount,
          note: editNote.trim() || undefined,
        },
      });
      setEditingPayment(null);
    } catch (e: any) {
      setEditError(e.message);
    }
  };

  if (!group) return null;

  return (
    <Screen scrollable>
      <View style={styles.header}>
        <Button title="Close" onPress={() => router.push(`/group/${groupId}`)} variant="ghost" size="sm" />
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settle Up</Text>
        <View style={{ width: 60 }} />
      </View>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.dangerDim }]}>
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : null}

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity
          style={[styles.tab, tab === 'settle' && { borderBottomWidth: 2, borderBottomColor: colors.accent }]}
          onPress={() => setTab('settle')}
        >
          <Text style={[styles.tabText, { color: colors.textTertiary }, tab === 'settle' && { color: colors.accent }]}>Settle</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'history' && { borderBottomWidth: 2, borderBottomColor: colors.accent }]}
          onPress={() => setTab('history')}
        >
          <Text style={[styles.tabText, { color: colors.textTertiary }, tab === 'history' && { color: colors.accent }]}>History</Text>
        </TouchableOpacity>
      </View>

      {tab === 'settle' ? (
        <View style={styles.content}>
          {myDebts.length > 0 && (
            <View style={{ gap: SPACING.sm }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>You Owe</Text>
              {myDebts.map((debt, i) => (
                <Card
                  key={i}
                  onPress={() => {
                    setSelectedPayee(debt.to);
                    setAmount(debt.amount.toFixed(2));
                  }}
                  style={selectedPayee === debt.to ? { borderColor: colors.accent } : undefined}
                >
                  <View style={styles.debtRow}>
                    <Avatar name={debt.toName} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.debtName, { color: colors.textPrimary }]}>{debt.toName}</Text>
                      <Text style={{ color: colors.danger, fontSize: 13 }}>
                        You owe {formatCurrency(debt.amount)}
                      </Text>
                    </View>
                    <Button title="Pay" onPress={() => {
                      setSelectedPayee(debt.to);
                      setAmount(debt.amount.toFixed(2));
                    }} size="sm" />
                  </View>
                </Card>
              ))}
            </View>
          )}

          {myCredits.length > 0 && (
            <View style={{ gap: SPACING.sm, marginTop: SPACING.xl }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Owed to You</Text>
              {myCredits.map((debt, i) => (
                <Card key={i}>
                  <View style={styles.debtRow}>
                    <Avatar name={debt.fromName} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.debtName, { color: colors.textPrimary }]}>{debt.fromName}</Text>
                      <Text style={{ color: colors.accent, fontSize: 13 }}>
                        Owes you {formatCurrency(debt.amount)}
                      </Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}

          {myDebts.length === 0 && myCredits.length === 0 && (
            <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
              <View style={{ marginBottom: 8 }}>
                <CircleCheck size={32} color={colors.accent} />
              </View>
              <Text style={[styles.settledText, { color: colors.accent }]}>All settled up!</Text>
            </Card>
          )}

          {selectedPayee && (
            <Card style={{ gap: SPACING.md, marginTop: SPACING.lg }}>
              <Text style={[styles.formTitle, { color: colors.textSecondary }]}>Settlement Amount</Text>
              <Input
                prefix="₹"
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
              <Text style={[styles.hint, { color: colors.textTertiary }]}>
                You can pay partially — enter any amount up to the full balance.
              </Text>
              <Button
                title="Record Payment"
                onPress={handlePay}
                loading={createPayment.isPending}
                fullWidth
              />
            </Card>
          )}
        </View>
      ) : (
        <View style={styles.content}>
          {(!payments || payments.length === 0) ? (
            <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
              <Text style={{ color: colors.textSecondary }}>No payment history</Text>
            </Card>
          ) : (
            <View style={{ gap: SPACING.sm }}>
              {payments.map((p: any) => {
                const isPayer = p.payer_id === userId;
                const needsMyConfirmation = p.payee_id === userId && p.status === 'PAID';
                const canEdit = isPayer && p.status === 'PENDING';

                return (
                  <Card key={p.id}>
                    <View style={{ gap: 8 }}>
                      <View style={styles.paymentHeader}>
                        <Text style={[styles.paymentTitle, { color: colors.textPrimary }]}>
                          {p.payer?.full_name} → {p.payee?.full_name}
                        </Text>
                        <Badge
                          label={p.status}
                          variant={p.status === 'SETTLED' ? 'success' : p.status === 'PAID' ? 'warning' : 'neutral'}
                        />
                      </View>
                      <Text style={[styles.paymentAmount, { color: colors.textPrimary }]}>{formatCurrency(p.amount)}</Text>
                      {p.note && (
                        <Text style={[styles.paymentNote, { color: colors.textTertiary }]}>{p.note}</Text>
                      )}
                      <Text style={[styles.paymentDate, { color: colors.textTertiary }]}>
                        {format(new Date(p.created_at), 'dd MMM yyyy, hh:mm a')}
                      </Text>

                      {/* Action buttons */}
                      <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: 4 }}>
                        {needsMyConfirmation && (
                          <Button
                            title="Confirm Receipt"
                            onPress={() => handleConfirmReceipt(p.id)}
                            size="sm"
                            variant="primary"
                          />
                        )}
                        {isPayer && p.status === 'PENDING' && (
                          <Button
                            title="I've Paid"
                            onPress={async () => {
                              await confirmPayment.mutateAsync({
                                paymentId: p.id,
                                groupId: groupId!,
                                role: 'sender',
                              });
                            }}
                            size="sm"
                            variant="secondary"
                          />
                        )}
                        {canEdit && (
                          <Button
                            title="Edit"
                            onPress={() => {
                              setEditingPayment(p.id);
                              setEditAmount(String(p.amount));
                              setEditNote(p.note ?? '');
                              setEditError('');
                            }}
                            size="sm"
                            variant="ghost"
                          />
                        )}
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Edit Payment Bottom Sheet */}
      <BottomSheet
        visible={!!editingPayment}
        onClose={() => setEditingPayment(null)}
        title="Edit Payment"
      >
        <View style={{ gap: SPACING.lg, paddingTop: 8 }}>
          {editError ? (
            <View style={[styles.errorBox, { backgroundColor: colors.dangerDim }]}>
              <Text style={[styles.errorText, { color: colors.danger }]}>{editError}</Text>
            </View>
          ) : null}
          <Input
            label="Amount"
            prefix="₹"
            placeholder="0.00"
            value={editAmount}
            onChangeText={setEditAmount}
            keyboardType="decimal-pad"
          />
          <Input
            label="Note"
            placeholder="Add a note..."
            value={editNote}
            onChangeText={setEditNote}
          />
          <Button
            title="Save Changes"
            onPress={handleEditPayment}
            loading={editPayment.isPending}
            fullWidth
          />
          <Text style={{ fontSize: 12, color: colors.textTertiary, textAlign: 'center' }}>
            Only pending payments can be edited. Changes are logged in the audit trail.
          </Text>
        </View>
      </BottomSheet>
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
  errorBox: {
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  errorText: {
    fontSize: 15,
    fontWeight: '500',
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  debtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  debtName: {
    fontSize: 15,
    fontWeight: '600',
  },
  settledText: {
    fontSize: 18,
    fontWeight: '700',
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  paymentNote: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  paymentDate: {
    fontSize: 13,
  },
});
