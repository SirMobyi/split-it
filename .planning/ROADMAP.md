# ROADMAP — Split It (High level)

## Phase 1 — MVP (4–6 weeks)
- User auth (email/phone OTP)
- Group creation and membership management
- Expense CRUD with basic split rules (equal, shares)
- Balance computation and per-group dashboard
- Activity feed with modifier avatars and badges
- Basic RLS rules and migrations

## Phase 2 — Payments & Polishing (4–8 weeks)
- UPI link generation and settlement flow
- PDF export and shareable reports
- Improved offline handling and sync
- Push notifications and invite links

## Phase 3 — Growth & Integrations (ongoing)
- Multi-currency support and exchange handling
- Web client improvements, sharing and analytics
- Third-party integrations (Google Contacts, Apple Contacts, bank links)

## Phase 4 — Enterprise & Scaling (future)
- Fine-grained permissions, audit logs
- Scalable metrics, monitoring and SRE

## Milestones and Next Actions
- M1: Design data model and finish RLS (this repo already has migration history)
- M2: Implement expense split engine and unit tests (`scripts/test-split-math.ts` exists)
- M3: Build activity feed and badges (done UI adjustments present in repo)
- M4: Release internal alpha and collect feedback
