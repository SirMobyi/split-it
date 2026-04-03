import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth-store';
import type { Payment, PaymentStatus } from '../types/database';

export function useGroupPayments(groupId: string) {
  return useQuery({
    queryKey: ['payments', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          payer:profiles!payer_id(*),
          payee:profiles!payee_id(*)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!groupId,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async ({
      groupId,
      payeeId,
      amount,
      note,
    }: {
      groupId: string;
      payeeId: string;
      amount: number;
      note?: string;
    }) => {
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('payments')
        .insert({
          group_id: groupId,
          payer_id: userId,
          payee_id: payeeId,
          amount,
          note: note ?? null,
          status: 'PENDING',
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('audit_log').insert({
        payment_id: data.id,
        group_id: groupId,
        modified_by: userId,
        action: 'CREATE',
        entity_type: 'payment',
        new_state: data,
      });

      return data as Payment;
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['payments', groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
    },
  });
}

export function useEditPayment() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async ({
      paymentId,
      groupId,
      updates,
    }: {
      paymentId: string;
      groupId: string;
      updates: { amount?: number; note?: string };
    }) => {
      if (!userId) throw new Error('Not authenticated');

      // Fetch current state for audit trail
      const { data: prev, error: fetchErr } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (fetchErr) throw fetchErr;

      // Only allow editing PENDING payments
      if (prev.status !== 'PENDING') {
        throw new Error('Can only edit pending payments');
      }

      const { data, error } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', paymentId)
        .select()
        .single();

      if (error) throw error;

      // Audit log with diff
      await supabase.from('audit_log').insert({
        payment_id: paymentId,
        group_id: groupId,
        modified_by: userId,
        action: 'UPDATE',
        entity_type: 'payment',
        previous_state: prev,
        new_state: data,
      });

      return data as Payment;
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['payments', groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
    },
  });
}

export function useConfirmPayment() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async ({
      paymentId,
      groupId,
      role,
    }: {
      paymentId: string;
      groupId: string;
      role: 'sender' | 'receiver';
    }) => {
      if (!userId) throw new Error('Not authenticated');

      // Fetch current state for audit
      const { data: prev, error: fetchErr } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (fetchErr) throw fetchErr;

      const updates: Record<string, unknown> = {};
      if (role === 'sender') {
        updates.sender_confirmed_at = new Date().toISOString();
        updates.status = 'PAID';
      } else {
        updates.receiver_confirmed_at = new Date().toISOString();
        updates.status = 'SETTLED';
      }

      const { data, error } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', paymentId)
        .select()
        .single();

      if (error) throw error;

      await supabase.from('audit_log').insert({
        payment_id: paymentId,
        group_id: groupId,
        modified_by: userId,
        action: 'UPDATE',
        entity_type: 'payment',
        previous_state: prev,
        new_state: data,
      });

      return data as Payment;
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['payments', groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
    },
  });
}
