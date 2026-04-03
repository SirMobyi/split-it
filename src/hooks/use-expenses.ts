import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth-store';
import { sendExpenseNotifications } from '../utils/push-notifications';
import type { Expense, ExpenseWithSplits, SplitType } from '../types/database';
import { calculateEqualSplit } from '../lib/debt-engine';

export function useGroupExpenses(groupId: string) {
  return useQuery({
    queryKey: ['expenses', groupId],
    queryFn: async (): Promise<ExpenseWithSplits[]> => {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          splits(
            *,
            user:profiles(*)
          ),
          creator:profiles!created_by(*)
        `)
        .eq('group_id', groupId)
        .eq('is_deleted', false)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      return (data as unknown as ExpenseWithSplits[]) ?? [];
    },
    enabled: !!groupId,
  });
}

export interface CreateExpenseInput {
  groupId: string;
  title: string;
  amount: number;
  description?: string;
  transactionDate: string;
  splitType: SplitType;
  payerId: string;
  splits: { userId: string; amount: number }[];
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async (input: CreateExpenseInput) => {
      if (!userId) throw new Error('Not authenticated');

      // Insert expense
      const { data: expense, error: expErr } = await supabase
        .from('expenses')
        .insert({
          group_id: input.groupId,
          created_by: userId,
          title: input.title,
          amount: input.amount,
          description: input.description ?? null,
          transaction_date: input.transactionDate,
          split_type: input.splitType,
        })
        .select()
        .single();

      if (expErr) throw expErr;

      // Validate splits sum to expense amount
      const splitsSum = input.splits.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(splitsSum - input.amount) > 0.02) {
        throw new Error(
          `Split amounts (${splitsSum.toFixed(2)}) don't match expense total (${input.amount}). Please try again.`
        );
      }

      // Insert splits — use DB column names
      const splitRows = input.splits.map((s) => ({
        expense_id: expense.id,
        user_id: s.userId,
        owed_amount: s.amount,
        is_payer: s.userId === input.payerId,
      }));

      const { error: splitErr } = await supabase
        .from('splits')
        .insert(splitRows);

      if (splitErr) throw splitErr;

      // Create audit log — use consistent DB column format for splits
      await supabase.from('audit_log').insert({
        expense_id: expense.id,
        group_id: input.groupId,
        modified_by: userId,
        action: 'CREATE',
        entity_type: 'expense',
        new_state: { ...expense, splits: splitRows },
      });

      // Send push notifications to involved members (fire-and-forget)
      const creatorProfile = useAuthStore.getState().profile;
      sendExpenseNotifications({
        creatorName: creatorProfile?.full_name ?? 'Someone',
        expenseTitle: input.title,
        amount: `₹${input.amount.toFixed(2)}`,
        involvedUserIds: input.splits.map((s) => s.userId),
        creatorId: userId,
      }).catch(() => {}); // non-blocking

      return expense as Expense;
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', input.groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances', input.groupId] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async ({
      expenseId,
      groupId,
      updates,
      newSplits,
    }: {
      expenseId: string;
      groupId: string;
      updates: Partial<Pick<Expense, 'title' | 'amount' | 'description' | 'transaction_date' | 'split_type'>>;
      newSplits?: { userId: string; amount: number; isPayer: boolean }[];
    }) => {
      if (!userId) throw new Error('Not authenticated');

      // Get current state for audit
      const { data: prev, error: prevErr } = await supabase
        .from('expenses')
        .select('*, splits(*)')
        .eq('id', expenseId)
        .single();

      if (prevErr) throw prevErr;

      // Update expense fields
      const { data: expense, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', expenseId)
        .select()
        .single();

      if (error) throw error;

      // Map newSplits to DB column format for both insert and audit trail
      let dbSplitRows: { expense_id: string; user_id: string; owed_amount: number; is_payer: boolean }[] | undefined;

      if (newSplits) {
        dbSplitRows = newSplits.map((s) => ({
          expense_id: expenseId,
          user_id: s.userId,
          owed_amount: s.amount,
          is_payer: s.isPayer,
        }));

        // Validate: splits should sum to expense amount
        const splitsSum = dbSplitRows.reduce((sum, s) => sum + s.owed_amount, 0);
        const expenseAmount = updates.amount ?? prev.amount;
        if (Math.abs(splitsSum - expenseAmount) > 0.02) {
          throw new Error(
            `Split amounts (${splitsSum.toFixed(2)}) don't match expense total (${expenseAmount}). Please try again.`
          );
        }

        // Delete old splits — CHECK FOR ERRORS
        const { error: delErr } = await supabase
          .from('splits')
          .delete()
          .eq('expense_id', expenseId);

        if (delErr) {
          console.error('Failed to delete old splits:', delErr);
          throw new Error(`Failed to update splits: ${delErr.message}. The expense amount was updated but splits could not be changed.`);
        }

        // Insert new splits — CHECK FOR ERRORS
        const { error: insErr } = await supabase
          .from('splits')
          .insert(dbSplitRows);

        if (insErr) {
          console.error('Failed to insert new splits:', insErr);
          // Try to restore old splits since delete succeeded but insert failed
          if (prev.splits && Array.isArray(prev.splits)) {
            const oldSplitRows = (prev.splits as any[]).map((s: any) => ({
              expense_id: expenseId,
              user_id: s.user_id,
              owed_amount: s.owed_amount,
              is_payer: s.is_payer,
            }));
            try { await supabase.from('splits').insert(oldSplitRows); } catch {}
          }
          throw new Error(`Failed to save new splits: ${insErr.message}. Changes have been rolled back.`);
        }

        // Verify splits were actually written
        const { data: verifySplits, error: verifyErr } = await supabase
          .from('splits')
          .select('owed_amount')
          .eq('expense_id', expenseId);

        if (verifyErr || !verifySplits || verifySplits.length === 0) {
          console.error('Split verification failed:', verifyErr);
          throw new Error('Splits were not saved correctly. Please try editing again.');
        }

        const verifySum = verifySplits.reduce((sum, s) => sum + Number(s.owed_amount), 0);
        if (Math.abs(verifySum - (updates.amount ?? prev.amount)) > 0.02) {
          console.error(`Split verification: sum=${verifySum}, expected=${updates.amount ?? prev.amount}`);
        }
      }

      // Audit log — use consistent DB column names in new_state
      await supabase.from('audit_log').insert({
        expense_id: expenseId,
        group_id: groupId,
        modified_by: userId,
        action: 'UPDATE',
        entity_type: 'expense',
        previous_state: prev,
        new_state: { ...expense, splits: dbSplitRows ?? prev.splits },
      });

      return expense;
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async ({ expenseId, groupId }: { expenseId: string; groupId: string }) => {
      if (!userId) throw new Error('Not authenticated');

      const { data: prev, error: prevErr } = await supabase
        .from('expenses')
        .select('*, splits(*)')
        .eq('id', expenseId)
        .single();

      if (prevErr) throw prevErr;

      // Soft delete
      const { error: delErr } = await supabase
        .from('expenses')
        .update({ is_deleted: true })
        .eq('id', expenseId);

      if (delErr) throw delErr;

      await supabase.from('audit_log').insert({
        expense_id: expenseId,
        group_id: groupId,
        modified_by: userId,
        action: 'DELETE',
        entity_type: 'expense',
        previous_state: prev,
      });
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
