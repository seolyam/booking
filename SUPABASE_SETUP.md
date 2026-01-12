# Supabase Setup Guide (Negros Power Budget Tool)

This project uses:

- **Supabase Auth** for authentication (user sessions)
- **Supabase Postgres** for data storage
- **Drizzle ORM** (direct Postgres connection via `DATABASE_URL`) for database reads/writes

Because Drizzle connects directly to Postgres, **Row Level Security (RLS) is not automatically enforced** the way it is with Supabase PostgREST. Treat this as an **internal app** and enforce permissions in server actions.

## 1) Create a Supabase Project

1. Go to Supabase Dashboard and create a new project.
2. Choose a region close to your users.
3. Save the **Database password** (you’ll need it for connection strings).

## 2) Get Your Project Keys

In Supabase Dashboard:

- Project Settings → **API**
  - Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
  - Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - If you already have it as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`, this repo supports that as a fallback.

Important:

- Do **NOT** put Supabase **secret** keys in `NEXT_PUBLIC_*` variables.
- Never commit database passwords or secret keys into Git.

## 3) Configure Environment Variables

Create a local `.env` file (or set env vars in your deployment) based on [.env.example](.env.example).

Minimum required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL`

### Choosing `DATABASE_URL`

In Supabase Dashboard:

- Project Settings → Database → **Connection string**

Recommended for serverless / Next.js dev:

- Use **Transaction pooler** connection string (pgBouncer).

Then set:

- `DATABASE_URL=...`

## 4) Configure Auth Settings

In Supabase Dashboard:

- Authentication → **Providers**

  - Enable Email (magic link or password) depending on your internal policy.

- Authentication → **URL Configuration**
  - Add these redirect URLs for local dev:
    - `http://localhost:3000/**`

## 5) Create Tables in Supabase (Drizzle)

This repo includes Drizzle schema in `src/db/schema.ts` and a Drizzle config in `drizzle.config.ts`.

Run:

```bash
pnpm db:push
```

This will create (or update) tables:

- `users`
- `budgets`
- `budget_items`
- `audit_logs`

## 6) Provision App Users (IMPORTANT)

The app expects **every authenticated user** to have a matching row in `public.users` with:

- `id` (UUID from Supabase Auth user)
- `email`
- `role` (`requester` | `reviewer` | `approver` | `superadmin`)
- `department` (one of the allowed department enum values)

If `public.users` does not have the matching row, server actions will return:

> “Your account is not yet provisioned in the app…”

### Recommended onboarding flow (internal tool)

1. Admin creates/invites users in Supabase Auth.
2. Admin inserts matching rows into `public.users` with correct `role` and `department`.

Example SQL (run in Supabase SQL editor):

```sql
insert into public.users (id, email, role, department)
values (
  '00000000-0000-0000-0000-000000000000',
  'user@negrospower.com',
  'requester',
  'Finance'
);
```

## 7) Sanity Check

1. Start dev server:

```bash
pnpm dev
```

2. Sign in (once auth UI exists).
3. Visit:

- `/dashboard/budget/create`

If you get the “not provisioned” message, insert the `public.users` row as described above.

## 8) Where Supabase is Wired in Code

- `src/lib/supabase/server.ts`: creates server-side Supabase client using cookies
- `src/lib/supabase/client.ts`: creates browser client for future login UI
- `middleware.ts`: refreshes sessions (recommended by Supabase SSR patterns)
- `src/actions/budget.ts`: reads the authenticated user from Supabase and requires a matching app user row
