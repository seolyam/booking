# Negros Power Budget Submission & Approval Tool

## 1. Project Overview

Internal application for Negros Electric and Power Corp to manage budget requests through a strict 3-Tier Approval Workflow. The system facilitates the creation, review, and approval of departmental budgets, ensuring compliance with corporate strategies.

## 2. Tech Stack used

- **Framework**: Next.js 14+ (App Router, TypeScript)
- **Database**: PostgreSQL (Supabase)
- **ORM**: Drizzle ORM
- **Authentication**: Supabase Auth (Mocked in current phase)
- **Styling**: Tailwind CSS + Shadcn/UI (simplified)
- **State Management**: React Server Actions

## 3. Data Flow (Budget Lifecycle)

1.  **Creation (Draft)**: Requester creates a budget (OpEx/CapEx) and adds line items.
2.  **Submission**: Encodes variance explanation if total exceeds 50,000. Status moves to `submitted`.
3.  **Review (Gatekeeping)**: Finance Analyst (Reviewer) checks the budget.
    - _Valid_: Status -> `verified`.
    - _Invalid_: Status -> `revision_requested`.
4.  **Approval (Decision)**: VP/President (Approver) reviews budget + ROI analysis.
    - _Approve_: Status -> `approved`.
    - _Reject_: Status -> `rejected`.

## 4. Database Schema

Defined in `src/db/schema.ts`.

- **users**: Links to auth, stores role & department.
- **budgets**: Main record (fiscal_year, type, status, total).
- **budget_items**: Line items (qty, cost, quarter).
- **audit_logs**: Tracks history of all status changes.

## 5. Folder Structure

```
src/
├── actions/        # Server Actions (Business Logic)
│   └── budget.ts
├── app/            # Next.js App Router
│   ├── dashboard/  # Protected Routes
│   │   └── budget/
│   │       └── create/
│   │           └── page.tsx
├── components/     # React Components
│   ├── ui/         # Reusable UI (Card, Label, etc.)
│   └── CreateBudgetWizard.tsx
├── db/             # Database Configuration
│   ├── index.ts    # Drizzle Setup
│   └── schema.ts   # Table Definitions
└── lib/            # Utilities (shadcn utils)
```

## 6. Setup Instructions

1.  **Install Dependencies**:
    ```bash
    pnpm install
    ```
2.  **Environment Variables**:
    Create `.env` file with:
    ```
    DATABASE_URL=postgres://user:pass@host:port/db
    ```
3.  **Run Development Server**:
    ```bash
    pnpm dev
    ```
4.  **Database Migration**:
    Use `drizzle-kit` to push schema changes (not configured in package.json yet but installed).
    ```bash
    npx drizzle-kit push
    ```

## 7. Known Limitations (Phase 1)

- Authentication `getUser()` is currently mocked to return a fixed user ID.
- UI components are simplified versions of Shadcn/UI.
- `drizzle.config.ts` needs to be created for migration commands to work seamlessly.
