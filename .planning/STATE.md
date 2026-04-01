# STATE — Split It (project memory)

**Decisions**

- Backend: Supabase (Postgres + Auth + Storage + RLS)
- Frontend: Expo + React Native + TypeScript
- Icons: lucide (react-native)
- Payments: UPI links for Phase 2 (defer full payment processing)

**Known artifacts in repo**

- `supabase/migrations/` contains initial schema and RLS-related fixes
- `src/utils/upi.ts` and `src/utils/push-notifications.ts` — useful utilities
- `scripts/test-split-math.ts` — test harness for split logic

**Open Questions**

- Preferred method for creating PRs and release process for this repo
- Whether to support currency conversion in Phase 1

**Next Steps**

- Start Phase 1 implementation tasks (see ROADMAP.md)
- Add automated tests for split math and RLS scenarios
