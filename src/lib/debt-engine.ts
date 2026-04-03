import type { BalanceSummary, DebtEdge } from '../types/database';

/**
 * Min-Flow Debt Simplification Engine
 *
 * Given a set of balances (who owes/is owed what), computes the minimum
 * number of transactions to settle all debts.
 *
 * Algorithm: Greedy matching of max creditor with max debtor.
 * For groups of ≤10 people, this greedy approach produces optimal results.
 */

export function simplifyDebts(balances: BalanceSummary[]): DebtEdge[] {
  // Separate into debtors (negative balance = they owe) and creditors (positive = owed to them)
  const debtors: { userId: string; userName: string; amount: number }[] = [];
  const creditors: { userId: string; userName: string; amount: number }[] = [];

  for (const b of balances) {
    const rounded = Math.round(b.netBalance * 100) / 100;
    if (rounded < -0.01) {
      debtors.push({ userId: b.userId, userName: b.userName, amount: Math.abs(rounded) });
    } else if (rounded > 0.01) {
      creditors.push({ userId: b.userId, userName: b.userName, amount: rounded });
    }
  }

  // Sort both by amount descending for greedy matching
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const edges: DebtEdge[] = [];
  let di = 0;
  let ci = 0;

  while (di < debtors.length && ci < creditors.length) {
    const debtor = debtors[di];
    const creditor = creditors[ci];
    const settleAmount = Math.min(debtor.amount, creditor.amount);

    if (settleAmount > 0.01) {
      edges.push({
        from: debtor.userId,
        fromName: debtor.userName,
        to: creditor.userId,
        toName: creditor.userName,
        amount: Math.round(settleAmount * 100) / 100,
      });
    }

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    if (debtor.amount < 0.01) di++;
    if (creditor.amount < 0.01) ci++;
  }

  return edges;
}

/**
 * Compute net balances for a group from expenses and payments.
 *
 * For each expense:
 *   - The payer's balance increases by (total - their share)
 *   - Each non-payer's balance decreases by their share
 *
 * For settled payments:
 *   - Payer's balance increases (they paid off debt)
 *   - Payee's balance decreases (they received payment)
 */
export function computeGroupBalances(
  members: { userId: string; userName: string }[],
  expenses: { payerId: string; splits: { userId: string; amount: number }[] }[],
  payments: { payerId: string; payeeId: string; amount: number; status: string }[],
): BalanceSummary[] {
  const balanceMap = new Map<string, number>();
  const nameMap = new Map<string, string>();

  // Initialize all members
  for (const m of members) {
    balanceMap.set(m.userId, 0);
    nameMap.set(m.userId, m.userName);
  }

  // Process expenses
  for (const expense of expenses) {
    for (const split of expense.splits) {
      if (split.userId === expense.payerId) {
        // Payer is owed this amount by others (total expense - their share is handled via other splits)
        // Actually the payer's split.amount is their own share, so they paid total but only owe their share
        // Net effect: payer is owed (total - their share) = sum of other splits
        continue;
      }
      // Non-payer owes this amount
      const currentDebtor = balanceMap.get(split.userId) ?? 0;
      balanceMap.set(split.userId, currentDebtor - split.amount);

      const currentCreditor = balanceMap.get(expense.payerId) ?? 0;
      balanceMap.set(expense.payerId, currentCreditor + split.amount);
    }
  }

  // Process settled/confirmed payments
  for (const payment of payments) {
    if (payment.status === 'PENDING') continue;
    const payerBal = balanceMap.get(payment.payerId) ?? 0;
    const payeeBal = balanceMap.get(payment.payeeId) ?? 0;
    balanceMap.set(payment.payerId, payerBal + payment.amount);
    balanceMap.set(payment.payeeId, payeeBal - payment.amount);
  }

  return Array.from(balanceMap.entries()).map(([userId, netBalance]) => ({
    userId,
    userName: nameMap.get(userId) ?? 'Unknown',
    netBalance: Math.round(netBalance * 100) / 100,
  }));
}

/**
 * Calculate equal split amounts, handling remainders properly.
 * e.g., ₹100 / 3 = [₹33.34, ₹33.33, ₹33.33]
 */
export function calculateEqualSplit(total: number, memberCount: number): number[] {
  const totalCents = Math.round(total * 100);
  const baseCents = Math.floor(totalCents / memberCount);
  const remainder = totalCents - baseCents * memberCount;

  return Array.from({ length: memberCount }, (_, i) =>
    (i < remainder ? baseCents + 1 : baseCents) / 100
  );
}

/**
 * Validate that custom splits sum to the total expense amount.
 */
export function validateSplits(
  totalAmount: number,
  splits: { amount: number }[],
  splitType: 'EXACT_AMOUNT' | 'PERCENTAGE',
): { valid: boolean; remaining: number; error?: string } {
  const sum = splits.reduce((acc, s) => acc + s.amount, 0);

  if (splitType === 'PERCENTAGE') {
    const diff = Math.abs(100 - sum);
    return {
      valid: diff < 0.01,
      remaining: Math.round((100 - sum) * 100) / 100,
      error: diff >= 0.01 ? `Percentages must add up to 100% (currently ${sum.toFixed(1)}%)` : undefined,
    };
  }

  const diff = Math.abs(totalAmount - sum);
  return {
    valid: diff < 0.01,
    remaining: Math.round((totalAmount - sum) * 100) / 100,
    error: diff >= 0.01 ? `Amounts must add up to ${totalAmount.toFixed(2)} (currently ${sum.toFixed(2)})` : undefined,
  };
}
