# Research — Split It

**Date:** 2026-04-02
**Prepared by:** Soubhagya Bhunia (initial)

## Objective

Collect domain context, competitor analysis, user needs and recommended technical approaches to inform Phase 1 (MVP) of Split It.

## Market & Competitors

- Splitwise — Industry standard for shared expenses. Strengths: simple UX, robust group model, multiple split types, web + mobile, social features. Weaknesses: heavier feature set, monetization walls for advanced features.
- Tricount — Focused on travel and trip expense splitting, easy sharing via links.
- Settle Up / Splittr — Lightweight mobile-first experiences with offline support in some clients.

Key takeaways: users expect quick add flows, clear per-person balances, flexible split rules (equal, shares, percentages), and a reliable activity/history feed.

## User Personas

- Travel buddies: need quick add during trips, offline resilience, currency/rounding handling.
- Roommates: recurring shared bills, clear monthly reconciliation.
- Casual groups (dinners, events): quick add and settle with minimal friction.

## Core Feature Set (MVP candidates)

- Sign-in (email/phone) and user profile with optional avatar
- Create groups and invite members (code or link)
- Add expenses with: payer, amount, split type (equal, shares, percent, custom), optional note, date, category
- Per-group balance overview (who owes who and net balance)
- Activity feed showing who added/edited/deleted items with avatars
- Settle flows: manual settle (mark as settled), shareable UPI/payment link (optional)
- Export basic PDF of group balances (later)

## Technical Recommendations

- Frontend: Expo + React Native + TypeScript — fast iteration, single codebase for iOS/Android/web.
- Backend: Supabase (Postgres + auth + storage + RLS) — matches current repo and earlier migrations.
- Icons: lucide/react-native (already in repo)
- Payments: Integrate UPI link generation; defer full payment processing to Phase 2.
- Notifications: Push via Supabase functions / FCM (already present in `src/utils/push-notifications.ts`).

## Data & Privacy

- Use row-level security to ensure group membership-only access (existing migrations indicate RLS work).
- Store minimal PII: display name, avatar_url, public handle.

## Risks & Open Questions

- Offline merging and conflict resolution strategy for concurrent edits.
- Currency and rounding handling when group uses multiple currencies.
- Regulatory considerations for payment facilitation (if we integrate direct payments).

## References

- Splitwise product flows (UX inspiration)
- Supabase docs for RLS and storage
- UPI deep links and intent handling for mobile

## Conclusion & Next Steps

- Implement Phase 1 MVP focusing on group model, expense CRUD, balance computation, and activity feed.
- Add test cases around split math and RLS before opening to external users.