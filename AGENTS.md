# Agent Guide (booking)

This is a Next.js (App Router) + TypeScript app using Supabase (SSR helpers) and Drizzle ORM (Postgres).

Cursor/Copilot repo rules:
- No `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md` found.

## Commands

Package manager: `pnpm`.

```bash
pnpm install
pnpm dev
pnpm lint
pnpm exec tsc --noEmit
pnpm build
pnpm start
```

Single-file "focused check" (closest thing to single test today):
```bash
pnpm exec eslint "src/app/login/page.tsx"
```

Tests:
- No test runner configured (no vitest/jest/playwright/cypress found).
- Use `pnpm lint && pnpm exec tsc --noEmit && pnpm build` as the current CI-style safety net.

## Database / Drizzle

Config: `drizzle.config.ts` (loads `.env.local`).

```bash
pnpm db:generate
pnpm db:push
pnpm db:migrate
pnpm db:studio
```

Scripts (run with `tsx`; these also load `.env.local`):
```bash
pnpm exec tsx src/scripts/seed.ts
pnpm exec tsx src/scripts/approve-admin.ts
```

Dangerous (drops tables/types):
```bash
pnpm exec tsx src/scripts/reset-db.ts
```

## Project Layout

- `src/app/*`: App Router pages/layouts/routes.
- `src/actions/*`: Server actions (must start with `"use server"`).
- `src/lib/*`: Shared helpers (Supabase clients, caching, formatting).
- `src/db/*`: Drizzle schema + db instance.
- `src/components/ui/*`: Reusable UI components (Radix + Tailwind + CVA).

Path aliases:
- `@/*` maps to `src/*` (see `tsconfig.json`).

## Env / Secrets

- `.env*` is gitignored; never commit secrets.
- Server-only secrets (example): `SUPABASE_SERVICE_ROLE_KEY` must never be imported/used from client components.
- Common keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, `DATABASE_URL`, `DIRECT_URL`.

## Code Style (follow existing patterns)

Formatting:
- Prefer double quotes for strings/imports (most files).
- Semicolons are mixed (some shadcn-style files omit them); match the file you are editing and avoid repo-wide reformatting.
- Use trailing commas in multiline objects/arrays.
- No Prettier/Biome config found; keep formatting consistent by imitation.

Import order (keep a blank line between groups):
1) React/Next (`react`, `next/*`)
2) Third-party (`zod`, `drizzle-orm`, `@supabase/*`, `lucide-react`)
3) Aliases (`@/lib/*`, `@/db/*`, `@/components/*`)
4) Relative (`./*`, `../*`)

Types:
- TS is `strict: true` (`tsconfig.json`). Prefer `unknown` over `any` and narrow at boundaries.
- Reuse Drizzle-exported types from `src/db/schema.ts` (e.g. `type Request = ...`).
- Validate env where needed; do not assume `process.env.X!` unless the file already follows that pattern.
- Prefer Zod for input validation in server actions (`safeParse` for user-facing errors, `parse` when throwing is OK).

Server vs client boundaries:
- DB access (`src/db/index.ts`) is server-only; never import it into `"use client"` components.
- Service role usage must remain server-only (example: `src/actions/uploadId.ts`).
- Prefer putting mutations in `src/actions/*` and calling them from client components.

Naming:
- Components: `PascalCase`; hooks: `useSomething`.
- Server actions/helpers: verb-first `camelCase` (`createRequest`, `updateRequestStatus`).
- Zod schemas: `PascalCase` (`AuthSchema`).
- DB columns: `snake_case` in schema; map to `camelCase` in app-level props/types.

Error handling:
- User-facing flows often return `{ error: string }` (see `src/actions/auth.ts`).
- Authorization/invariant failures typically `throw new Error(...)` (see `requireAppUser` patterns in actions).
- Do not leak secrets/connection strings to the client; keep logs minimal.
- After mutations that affect rendered data, call `revalidatePath()` for affected routes.

Caching / data fetching:
- Some dashboard reads use `unstable_cache` with tags (see `src/lib/dashboardData.ts`).
- If you add new cached reads, choose stable cache keys and revalidate tags/paths after writes.

Next.js / React:
- Put `"use client"` / `"use server"` at the very top (before imports).
- Server components/actions can use `redirect()`; route handlers use `NextResponse`.
- Prefer shared auth helpers: `src/lib/supabase/server.ts` (`createSupabaseServerClient`, `getAuthUser`).
- Client code must not import server-only modules (DB, service keys).

Supabase:
- Env accessor: `src/lib/supabase/env.ts` (`getSupabaseEnv`).
- Server client: `src/lib/supabase/server.ts` handles cookie bridging for SSR.
- Client-side direct Supabase queries should only use `NEXT_PUBLIC_*` keys.

UI / Tailwind:
- Tailwind v4 is enabled via `src/app/globals.css`.
- Use `cn()` from `src/lib/utils.ts` for class merging.
- UI primitives follow Radix + CVA patterns; keep variants consistent (see `src/components/ui/button.tsx`).
- Prefer semantic status variants driven by config (`STATUS_CONFIG` in `src/db/schema.ts`).

Small implementation conventions:
- Prefer early returns for auth/permission checks.
- Keep server actions deterministic: validate input, authorize, mutate/query, then `revalidatePath()`.
- Avoid adding new console logging unless it materially helps; never log env values or tokens.

## Linting

ESLint: `eslint.config.mjs` uses Next core-web-vitals + TypeScript configs and explicitly ignores `.next/`, `out/`, `build/`, `next-env.d.ts`.

## Agent Safety Notes

- Never commit `.env.local` / `.env*`.
- Avoid running `src/scripts/reset-db.ts` unless you are sure the target DB is disposable.
- Prefer small, reviewable diffs; keep behavior consistent with existing server action patterns.
