# Agent Guide
# Repository: Negros Power Budget Submission & Approval Tool

This file provides comprehensive instructions for agentic coding assistants working on this repository.
It covers local build/test commands, coding style expectations, and architectural patterns.
Adhere to these guidelines unless a specific file clearly establishes a different local pattern.

## 1. Stack Snapshot
- **Framework:** Next.js 16.1 (App Router)
- **Language:** TypeScript 5 (Strict Mode)
- **UI:** React 19, Tailwind CSS v4, shadcn/ui
- **Backend:** Supabase (SSR Auth), Postgres
- **ORM:** Drizzle ORM
- **Package Manager:** pnpm

## 2. Setup & Environment
- **Install Dependencies:** `pnpm install`
- **Environment Variables:**
  - Copy `.env.example` to `.env.local`.
  - Required: Supabase URL/Key, `DATABASE_URL` (transaction mode).
- **Database Management:**
  - Push schema changes: `pnpm db:push`
  - Generate migrations (if needed): `pnpm db:generate`
  - Open Drizzle Studio: `pnpm db:studio`

## 3. Build, Lint, and Test
### Standard Commands
- **Start Dev Server:** `pnpm dev` (http://localhost:3000)
- **Build for Production:** `pnpm build`
- **Start Production Server:** `pnpm start`
- **Lint Codebase:** `pnpm lint` (runs `eslint .`)

### Running Specific Checks
- **Lint a Single File:**
  ```bash
  pnpm lint -- src/path/to/file.tsx
  ```
- **Tests:**
  - *Note:* No test runner (Jest/Vitest) is currently configured in `package.json`.
  - If you are asked to add tests, please install Vitest/Jest and update this file.
  - Future command pattern: `pnpm test -- src/path/to/test.ts`

## 4. Project Structure & Architecture
- **`src/actions/`**: Server Actions for mutations (create, update, delete).
  - Use these instead of API routes for form submissions.
  - Always validate inputs with Zod.
- **`src/app/`**: Next.js App Router.
  - `page.tsx`: Server Component by default.
  - `layout.tsx`: Layouts.
  - `_components/`: Colocated components specific to a route.
- **`src/components/`**: Shared UI components.
  - `ui/`: shadcn/ui primitives (do not modify logic heavily).
- **`src/db/`**: Database configuration.
  - `schema.ts`: Single source of truth for DB schema.
  - `index.ts`: Drizzle client instance.
- **`src/lib/`**: Utilities.
  - `supabase/`: Auth clients (Server vs Client).
  - `utils.ts`: Tailwind `cn` helper.

## 5. Coding Style & Conventions

### TypeScript & Formatting
- **Strict Mode:** `strict: true` is enabled. Avoid `any`.
- **Semicolons:**
  - Application code (`src/app`, `src/components`): Generally uses semicolons.
  - Utility/Config code: May omit them (check local file style).
  - **Rule:** Mimic the style of the file you are editing.
- **Exports:** Prefer explicit return types for exported functions.

### Imports
- **Alias:** Use `@/` for `src/`.
- **Ordering:**
  1.  React / Next.js built-ins
  2.  External libraries (Lucide, Zod, etc.)
  3.  Internal components/lib (`@/components/...`)
  4.  Relative imports (`./utils`)
- **Type Imports:** Use `import type { ... }` for type-only imports.

### Naming Conventions
- **Files/Components:** `PascalCase.tsx` (e.g., `BudgetCard.tsx`).
- **Hooks:** `camelCase` prefixed with `use` (e.g., `useBudget`).
- **Server Actions:** `verbNoun` (e.g., `submitBudget`, `verifyRequest`).
- **Database:**
  - **Schema:** Snake_case columns (`project_code`, `created_at`).
  - **Drizzle Queries:** Returned objects typically match column names (snake_case).
  - **Application Objects:** Map to camelCase when transforming for UI if needed, but Drizzle objects will be snake_case.

### Error Handling
- **Server Actions:**
  - Do not just throw errors; return structured objects: `{ success: boolean, message?: string, errors?: ZodError }`.
  - Catch errors, log them (`console.error`), and return a user-friendly message.
- **UI:** Use Toast notifications for success/error feedback.

## 6. Development Workflows

### Database Changes
1.  Modify `src/db/schema.ts`.
2.  Run `pnpm db:push` to sync with the dev database.
3.  Restart the dev server if types are cached.

### Adding New Features
1.  **UI:** Build server components for data fetching. Use client components for interactivity.
2.  **Forms:** Use `react-hook-form` + `zod` schema validation.
3.  **Auth:** Use `getAuthUser()` helper in server components/actions.
4.  **Authorization:** Check roles (`appUser.role`) before performing actions.

### Common Patterns
- **Authentication Guard:**
  ```ts
  const user = await getAuthUser();
  if (!user) redirect("/login");
  const appUser = await ensureAppUser(user.id); // Checks roles
  ```
- **Budget Verification:**
  - Requesters submit -> Status: `submitted`
  - Reviewers check -> Status: `verified_by_reviewer` (or `revision_requested`)
  - Approvers approve -> Status: `approved`

## 7. Cursor / Copilot Rules
- No specific `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md` are defined for this project.
- Rely on this `AGENTS.md` and the existing code patterns.

## Git Workflow & Version Control
1. **Atomic Commits**: You are authorized and encouraged to stage and commit changes immediately after completing a task or a logical sub-task.
2. **Verification First**: BEFORE committing, always run the build or lint command (e.g., `pnpm build` or `pnpm lint`) to ensure you aren't breaking the build.
3. **Commit Messages**: Use Conventional Commits format:
   - `feat: ...` for new features
   - `fix: ...` for bug fixes
   - `chore: ...` for maintenance/refactoring
   - `docs: ...` for documentation
   - Example: `feat(auth): implement supabase login handler`
