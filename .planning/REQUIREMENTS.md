# Requirements — Split It (MVP scope)

## Functional Requirements

1. User Authentication
   - Sign up / Sign in using email or phone (OTP)
   - Profile with `display_name`, `avatar_url`

2. Groups
   - Create group with name and optional avatar
   - Invite members via code/link
   - Soft-delete groups (admins only)

3. Expenses
   - Add expense: payer, amount, currency, date, category, note
   - Split rules: equal, shares, percent, custom per-member
   - Edit/delete expense (permissions: creator or admin)

4. Balances & Settlement
   - Show per-group net balance for signed-in user
   - Show per-member line items (who owes whom)
   - Mark settlement as manual or generate UPI/payment links (Phase 2)

5. Activity Feed
   - Capture add/edit/delete events with modifier avatar and timestamp
   - Display an activity list with badges indicating action type

6. Notifications
   - In-app push notifications for relevant events

7. Export
   - Export group balances as PDF (Phase 2)

## Non-functional Requirements

- Performance: list rendering should handle 1000s of entries (pagination)
- Security: RLS enforced; only group members can read group data
- Privacy: minimal PII, avatars stored in Supabase Storage with restricted access
- Localization: support for INR initially; architecture supports multi-currency
- Accessibility: buttons and touch targets follow mobile accessibility guidelines

## Acceptance Criteria

- Users can create a group, add at least one expense, and see updated net balance.
- Activity feed shows avatar of the modifier and readable timestamps.
- RLS prevents unauthorized access to group data.

## Out of Scope for MVP

- Direct payment processing, advanced analytics, enterprise features.

