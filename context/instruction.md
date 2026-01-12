You are absolutely right—Supabase **recently updated** their dashboard to use the name `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`. That is why you see it in the screenshot.

**However, you MUST rename it to `NEXT_PUBLIC_SUPABASE_ANON_KEY` in your `.env.local` file.**

### Why?

Your AI Coding Agent (Cursor/Windsurf) and most standard Next.js libraries were trained on the "Classic" naming convention.

- **The AI will write code like this:** `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Your file has:** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

If you don't rename it, the AI's code will look for a key that "doesn't exist," and your app will crash with an "Authentication missing" error later on.

### ✅ Final Fix for `.env.local`

Update your file to look exactly like this (renaming that one variable):

```bash
# .env.local

# 1. Rename this to 'ANON_KEY' (even though Supabase says 'PUBLISHABLE_DEFAULT')
NEXT_PUBLIC_SUPABASE_URL=https://onuekzzpmuiylethhkuk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_8inqegfBmLO8mHFEJmor5A_LhbmL1rv

# 2. Your Database Connection (Looks perfect!)
DATABASE_URL=postgresql://postgres.onuekzzpmuiylethhkuk:NEPCbudgetapp@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true

```
