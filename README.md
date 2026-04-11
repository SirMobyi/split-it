# Split-It

A free, open-source expense splitting app. Built because Splitwise decided a paywall was more important than a usable product.

## Why?

Splitwise used to be great. Then they locked basic features behind a paywall and ruined the UX in the process. There were plenty of ways to monetize without making the core experience worse — but they chose the lazy route. So I built Split-It: a free alternative that does the job without nickel-and-diming you.

> Still in active development.

## Features

- **Groups** — Create groups, invite friends via code or QR, manage members
- **Expense Splitting** — Add expenses, split them across members, track who owes what
- **Smart Balances** — Automatic debt simplification so you settle with fewer transactions
- **Payments** — Record settlements, track payment history
- **Activity Feed** — Full audit trail of every expense, payment, and edit
- **Expense Filters** — Filter by date range or payer
- **PDF Export** — Export group expenses as PDF
- **Dark Mode** — Deep purple dark theme by default (because your eyes deserve better)
- **Cross-Platform** — iOS, Android, and Web from a single codebase
- **Deep Linking** — Share invite links that open directly in the app

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | React Native + Expo |
| Navigation | Expo Router |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| State | Zustand + TanStack React Query |
| UI | Custom component library + Lucide icons |
| Auth | Google OAuth + OTP |

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your Supabase URL and anon key

# Start the dev server
npx expo start
```

Scan the QR code with Expo Go (iOS/Android) or press `w` for web.

## License

MIT
