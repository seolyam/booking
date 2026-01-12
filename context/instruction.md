1. PROJECT CONTEXT
   We are building an internal Budget Submission & Approval Tool for Negros Electric and Power Corp (Negros Power). This app allows departments to request budgets, which then pass through a strict 3-Tier Approval Workflow before final approval.

The 3-Tier Workflow (Strict Logic)
Requester: (e.g., Dept Head) Creates a budget -> Submits it.

Input: Budget Type (CapEx/OpEx), Line Items, Variance Explanation.

Reviewer: (e.g., Finance Analyst) The "Gatekeeper".

Action: Checks the budget. Can Verify (forward to Approver) or Request Revision (send back to Requester).

Approver: (e.g., President/VP) The Decision Maker.

Action: Sees the budget + "Hidden Details" (ROI/Strategy). Can Approve (Final) or Reject.

The Departments (Enum)
Use these exact Department names:

Office of the President

CESRA (Corp Energy Sourcing & Reg Affairs)

Customer Care

HCM (Human Capital Management)

Controllership

Admin and General Services

Finance

Procurement

Legal

NDOG (Network Dev & Ops Group)

2. TECH STACK (STRICT)
   Framework: Next.js 14+ (App Router, TypeScript).

Database: Supabase (PostgreSQL) + Drizzle ORM.

Auth: Supabase Auth (User ID links to public.users table).

UI Library: Shadcn/UI + Tailwind CSS + Lucide React Icons.

State/Data: React Server Actions (No API routes).

Validation: Zod (for both frontend forms and backend server actions).

3. UI/UX GUIDELINES ("MoreLinx" Style)
   Layout: Persistent Sidebar on the left.

Color Palette:

Primary Brand: Dark Green (#2F5E3D) - used for Sidebar and Primary Buttons.

Background: Light Gray (#F3F4F6).

Cards: Clean White (#FFFFFF) with subtle shadow.

Form Style: Use a "Wizard" pattern (Step-by-Step) for creating budgets.

4. CODING INSTRUCTIONS
   Acting as a Senior Full Stack Developer, please generate the code for Phase 1.

STEP A: The Drizzle Schema (src/db/schema.ts)
Create the database schema with these specific tables:

users: Links to Supabase Auth. Includes role (enum: 'requester', 'reviewer', 'approver', 'superadmin') and department (enum).

budgets: The main record.

id (uuid)

budget_type (enum: 'capex', 'opex')

fiscal_year (int)

status (enum: 'draft', 'submitted', 'revision_requested', 'verified', 'approved', 'rejected')

total_amount (decimal)

variance_explanation (text, nullable)

roi_analysis (text/json, nullable) - Only visible to Approver

budget_items: Line items linked to a budget.

description, quantity, unit_cost, total_cost, quarter (Q1, Q2, Q3, Q4).

audit_logs: Tracks every status change.

budget_id, actor_id, action, previous_status, new_status, timestamp.

STEP B: Server Actions (src/actions/budget.ts)
Write the Server Actions to handle the logic. Use Zod for validation.

createBudgetDraft: Creates a new row in draft status.

submitBudget: Checks if total_amount > 0. If total_amount > (threshold), require variance_explanation. Updates status to submitted.

reviewBudget:

Input: budgetId, action ('verify' | 'request_revision'), comment.

Logic: If 'verify', status -> verified. If 'revision', status -> revision_requested.

finalizeBudget:

Input: budgetId, decision ('approve' | 'reject').

Logic: Updates status. Logs to audit_logs.

STEP C: The "Create Budget" Wizard Page
Scaffold the page at /dashboard/budget/create/page.tsx.

Use a stateful "Multi-Step Form" component.

Step 1: Select Project & Type (CapEx/OpEx).

Step 2: Add Line Items (Dynamic table to add rows).

Step 3: Variance Check (Show warning if high).

Step 4: Summary & Submit.
