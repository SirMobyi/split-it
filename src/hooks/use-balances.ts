import { useQuery, useQueries } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { computeGroupBalances, simplifyDebts } from '../lib/debt-engine';
import type { BalanceSummary, DebtEdge } from '../types/database';

async function fetchGroupBalances(groupId: string): Promise<{
  balances: BalanceSummary[];
  simplifiedDebts: DebtEdge[];
}> {
  // Fetch members
  const { data: members, error: memErr } = await supabase
    .from('group_members')
    .select('user_id, profile:profiles(full_name)')
    .eq('group_id', groupId);

  if (memErr) throw memErr;

  // Fetch expenses with splits
  const { data: expenses, error: expErr } = await supabase
    .from('expenses')
    .select('id, created_by, splits(user_id, owed_amount, is_payer)')
    .eq('group_id', groupId)
    .eq('is_deleted', false);

  if (expErr) throw expErr;

  // Fetch settled payments
  const { data: payments, error: payErr } = await supabase
    .from('payments')
    .select('payer_id, payee_id, amount, status')
    .eq('group_id', groupId)
    .in('status', ['PAID', 'SETTLED']);

  if (payErr) throw payErr;

  const memberList = (members ?? []).map((m: any) => ({
    userId: m.user_id,
    userName: m.profile?.full_name ?? 'Unknown',
  }));

  const expenseList = (expenses ?? []).map((e: any) => {
    const payer = e.splits?.find((s: any) => s.is_payer);
    return {
      payerId: payer?.user_id ?? e.created_by,
      splits: (e.splits ?? []).map((s: any) => ({
        userId: s.user_id,
        amount: Number(s.owed_amount),
      })),
    };
  });

  const paymentList = (payments ?? []).map((p: any) => ({
    payerId: p.payer_id,
    payeeId: p.payee_id,
    amount: Number(p.amount),
    status: p.status,
  }));

  const balances = computeGroupBalances(memberList, expenseList, paymentList);
  const simplifiedDebts = simplifyDebts(balances);

  return { balances, simplifiedDebts };
}

export function useGroupBalances(groupId: string) {
  return useQuery({
    queryKey: ['balances', groupId],
    queryFn: () => fetchGroupBalances(groupId),
    enabled: !!groupId,
  });
}

/** Fetch balances for multiple groups in parallel (used by dashboard) */
export function useAllGroupBalances(groupIds: string[]) {
  return useQueries({
    queries: groupIds.map((gid) => ({
      queryKey: ['balances', gid],
      queryFn: () => fetchGroupBalances(gid),
      enabled: !!gid,
      staleTime: 30_000, // don't re-fetch every render
    })),
  });
}
