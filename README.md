# Negros Power Budget Submission & Approval Tool

A Next.js application for managing budget submissions with a 3-tier approval workflow (Requester → Reviewer → Approver).

## Tech Stack

- **Framework:** Next.js 16.1.1 (App Router, TypeScript)
- **Database:** PostgreSQL via Supabase
- **ORM:** Drizzle ORM
- **Auth:** Supabase Auth (SSR)
- **Styling:** Tailwind CSS v4 + shadcn/ui components
- **Forms:** React Hook Form + Zod validation

## Getting Started

### 1. Clone and Install

```bash
pnpm install
```

### 2. Environment Setup

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Then update `.env.local` with your Supabase credentials:

```bash
# Required Environment Variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Note:** Supabase now calls the anon key `PUBLISHABLE_DEFAULT_KEY` in their dashboard. This app supports both naming conventions.

### 3. Database Setup

Push the schema to your Supabase database:

```bash
pnpm db:push
```

### 4. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Available Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm db:push      # Push Drizzle schema to database
pnpm db:studio    # Open Drizzle Studio
```

## Deployment on Vercel

### Required Environment Variables

Set these in your Vercel project settings:

1. `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/publishable key
3. `DATABASE_URL` - Supabase Transaction Pooler connection string

### Deploy

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add the environment variables
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/seolyam/budget)

## Documentation

- [Full Documentation](./DOCUMENTATION.md) - Architecture, features, and workflows
- [Supabase Setup Guide](./SUPABASE_SETUP.md) - Database and auth configuration

## Project Structure

```
src/
├── actions/          # Server actions (budget, auth)
├── app/             # Next.js app router pages
├── components/      # UI components (shadcn/ui)
├── db/              # Drizzle schema and client
└── lib/             # Utilities and helpers
```
