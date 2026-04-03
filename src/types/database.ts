// Types derived from the Supabase schema

export type SplitType = 'EQUAL' | 'EXACT_AMOUNT' | 'PERCENTAGE';
export type PaymentStatus = 'PENDING' | 'PAID' | 'SETTLED';
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type MemberStatus = 'ACTIVE' | 'INACTIVE';
export type Recurrence = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type NotificationType =
  | 'expense_added'
  | 'expense_updated'
  | 'expense_deleted'
  | 'payment_sent'
  | 'payment_confirmed'
  | 'member_joined'
  | 'member_left'
  | 'group_updated';

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  upi_vpa: string | null;
  phone_number: string | null;
  push_token: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  name: string;
  icon_url: string | null;
  invite_code: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  status: MemberStatus;
  joined_at: string;
  left_at: string | null;
}

export interface Expense {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
  amount: number;
  currency: string;
  description: string | null;
  transaction_date: string;
  logging_date: string;
  split_type: SplitType;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Split {
  id: string;
  expense_id: string;
  user_id: string;
  owed_amount: number;
  is_payer: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  group_id: string;
  payer_id: string;
  payee_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  upi_ref: string | null;
  note: string | null;
  sender_confirmed_at: string | null;
  receiver_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringExpense {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
  amount: number;
  currency: string;
  description: string | null;
  split_type: SplitType;
  recurrence: Recurrence;
  next_due: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  expense_id: string | null;
  payment_id: string | null;
  group_id: string;
  modified_by: string;
  action: AuditAction;
  entity_type: string;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  group_id: string | null;
  title: string;
  body: string;
  type: NotificationType;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

// Computed types used in the UI
export interface BalanceSummary {
  userId: string;
  userName: string;
  netBalance: number; // positive = owed to them, negative = they owe
}

export interface DebtEdge {
  from: string;      // payer user ID
  fromName: string;
  to: string;        // payee user ID
  toName: string;
  amount: number;
}

export interface GroupWithMembers extends Group {
  members: (GroupMember & { profile: Profile })[];
}

export interface ExpenseWithSplits extends Expense {
  splits: (Split & { user: Profile })[];
  creator: Profile;
}
