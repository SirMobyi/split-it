import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatCurrency } from '../constants/theme';
import type { ExpenseWithSplits, Payment, Profile, AuditLogEntry } from '../types/database';

interface AuditLogWithModifier extends AuditLogEntry {
  modifier?: { full_name: string } | null;
}

export async function exportGroupPDF({
  groupName,
  expenses,
  payments,
  members,
  auditLogs,
}: {
  groupName: string;
  expenses: ExpenseWithSplits[];
  payments: (Payment & { payer: Profile; payee: Profile })[];
  members: { profile: Profile }[];
  auditLogs?: AuditLogWithModifier[];
}) {
  const expenseRows = expenses
    .map(
      (e) => {
        const payerSplit = e.splits?.find((s) => s.is_payer);
        const payer = payerSplit?.user ?? e.creator;
        return `
      <tr>
        <td>${e.transaction_date}</td>
        <td>${e.title}</td>
        <td>${payer?.full_name ?? 'Unknown'}</td>
        <td style="text-align:right">${formatCurrency(e.amount)}</td>
        <td>${e.split_type}</td>
      </tr>`;
      }
    )
    .join('');

  const paymentRows = payments
    .map(
      (p) => `
      <tr>
        <td>${new Date(p.created_at).toLocaleDateString('en-IN')}</td>
        <td>${(p as any).payer?.full_name ?? 'Unknown'}</td>
        <td>${(p as any).payee?.full_name ?? 'Unknown'}</td>
        <td style="text-align:right">${formatCurrency(p.amount)}</td>
        <td>${p.status}</td>
      </tr>`
    )
    .join('');

  const html = `
    <html>
    <head>
      <style>
        body { font-family: -apple-system, sans-serif; padding: 24px; color: #1a1a1a; }
        h1 { font-size: 24px; margin-bottom: 4px; }
        h2 { font-size: 18px; margin-top: 32px; color: #333; border-bottom: 2px solid #10B981; padding-bottom: 4px; }
        .subtitle { color: #666; font-size: 13px; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
        th { background: #f5f5f5; padding: 8px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #ddd; }
        td { padding: 8px 12px; border-bottom: 1px solid #eee; }
        tr:nth-child(even) { background: #fafafa; }
        .total { font-weight: 700; font-size: 15px; margin-top: 8px; }
      </style>
    </head>
    <body>
      <h1>Split-It Report: ${groupName}</h1>
      <p class="subtitle">Generated on ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
      <p class="subtitle">Members: ${members.map((m) => m.profile.full_name).join(', ')}</p>

      <h2>Expenses</h2>
      <table>
        <thead>
          <tr><th>Date</th><th>Title</th><th>Paid By</th><th style="text-align:right">Amount</th><th>Split</th></tr>
        </thead>
        <tbody>${expenseRows || '<tr><td colspan="5" style="text-align:center;color:#999">No expenses</td></tr>'}</tbody>
      </table>
      <p class="total">Total: ${formatCurrency(expenses.reduce((sum, e) => sum + e.amount, 0))}</p>

      <h2>Settlements</h2>
      <table>
        <thead>
          <tr><th>Date</th><th>From</th><th>To</th><th style="text-align:right">Amount</th><th>Status</th></tr>
        </thead>
        <tbody>${paymentRows || '<tr><td colspan="5" style="text-align:center;color:#999">No settlements</td></tr>'}</tbody>
      </table>

      ${auditLogs && auditLogs.length > 0 ? `
      <h2 style="border-color: #F59E0B;">Activity Log</h2>
      <table>
        <thead>
          <tr><th>Date</th><th>User</th><th>Action</th><th>Type</th><th>Details</th></tr>
        </thead>
        <tbody>${auditLogs.map((log) => {
          const state = log.new_state ?? log.previous_state;
          const nameOrTitle = state ? (state.title || state.name || '') : '';
          const amount = state?.amount ? formatCurrency(Number(state.amount)) : '';
          const details = [nameOrTitle, amount].filter(Boolean).join(' · ');
          const actionColor = log.action === 'CREATE' ? '#10B981' : log.action === 'DELETE' ? '#EF4444' : '#F59E0B';
          return `
          <tr>
            <td>${new Date(log.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
            <td>${log.modifier?.full_name ?? 'Unknown'}</td>
            <td style="color:${actionColor};font-weight:600">${log.action}</td>
            <td>${log.entity_type}</td>
            <td>${details}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>
      ` : ''}
    </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
}
