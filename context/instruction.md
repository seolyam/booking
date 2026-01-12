Great, your configuration looks perfect. You are using the correct **Transaction Pooler URL** (port 6543) and have the correct anon keys.

**One quick security note:** Since you posted your real password in the chat, be careful sharing this chat history with others. You might want to change your database password later in the Supabase Dashboard -> Database -> Settings after you finish setting this up.

### **Next Step: Generate the Code**

Now that your environment is ready, we need to tell your AI Agent (Cursor/Windsurf) exactly what to build.

**Copy the entire block below and paste it into your AI Agent's chat.** This is the "Master Prompt" that combines your specific environment with the Negros Power requirements.

---

# MASTER PROMPT: NEGROS POWER BUDGET APP (Phase 1)

**I have already set up my `.env.local` file with the Supabase URL, Anon Key, and the Drizzle Transaction Pooler URL.**

## 1. PROJECT CONTEXT

We are building an internal **Budget Submission & Approval Tool** for **Negros Electric and Power Corp (Negros Power)**. This app allows departments to request budgets, which then pass through a strict **3-Tier Approval Workflow**.

### The 3-Tier Workflow (Strict Logic)

1. **Requester:** (e.g., Dept Head) Creates a budget -> Submits it.

- _Input:_ Budget Type (CapEx/OpEx), Line Items, Variance Explanation.

2. **Reviewer:** (e.g., Finance Analyst) The "Gatekeeper".

- _Action:_ Checks the budget. Can **Verify** (forward to Approver) or **Request Revision** (send back to Requester).

3. **Approver:** (e.g., President/VP) The Decision Maker.

- _Action:_ Sees the budget + "Hidden Details" (ROI/Strategy). Can **Approve** (Final) or **Reject**.

### The Departments (Enum)

Use these exact Department names:

- Office of the President
- CESRA (Corp Energy Sourcing & Reg Affairs)
- Customer Care
- HCM (Human Capital Management)
- Controllership
- Admin and General Services
- Finance
- Procurement
- Legal
- NDOG (Network Dev & Ops Group)

## 2. TECH STACK (STRICT)

- **Framework:** Next.js 14+ (App Router, TypeScript).
- **Database:** Supabase (PostgreSQL) + Drizzle ORM.
- **Auth:** Supabase Auth (User ID links to `public.users` table).
- **UI Library:** Shadcn/UI + Tailwind CSS + Lucide React Icons.
- **State/Data:** React Server Actions (No API routes).
- **Validation:** Zod (for both frontend forms and backend server actions).

## 3. UI/UX GUIDELINES ("MoreLinx" Style)

- **Layout:** Persistent Sidebar on the left (Dark Green `#2F5E3D`).
- **Cards:** Clean White (`#FFFFFF`) with subtle shadow.
- **Form Style:** Use a **"Wizard" pattern** (Step-by-Step) for creating budgets.

---

## 4. CODING INSTRUCTIONS

_Acting as a Senior Full Stack Developer, please generate the code for Phase 1._

### STEP A: The Drizzle Schema (`src/db/schema.ts`)

Create the database schema with these specific tables:

1. **`users`**: Links to Supabase Auth. Includes `role` (enum: 'requester', 'reviewer', 'approver', 'superadmin') and `department` (enum).
2. **`budgets`**: The main record.

- `id` (uuid)
- `budget_type` (enum: 'capex', 'opex')
- `fiscal_year` (int)
- `status` (enum: 'draft', 'submitted', 'revision_requested', 'verified', 'approved', 'rejected')
- `total_amount` (decimal)
- `variance_explanation` (text, nullable)
- `roi_analysis` (text/json, nullable) - _Only visible to Approver_

3. **`budget_items`**: Line items linked to a budget.

- `description`, `quantity`, `unit_cost`, `total_cost`, `quarter` (Q1, Q2, Q3, Q4).

4. **`audit_logs`**: Tracks every status change.

- `budget_id`, `actor_id`, `action`, `previous_status`, `new_status`, `timestamp`.

### STEP B: Server Actions (`src/actions/budget.ts`)

Write the Server Actions to handle the logic. **Use Zod for validation.**

1. **`createBudgetDraft`**: Creates a new row in `draft` status.
2. **`submitBudget`**: Checks if `total_amount > 0`. If `total_amount` > (threshold), require `variance_explanation`. Updates status to `submitted`.
3. **`reviewBudget`**:

- Input: `budgetId`, `action` ('verify' | 'request_revision'), `comment`.
- Logic: If 'verify', status -> `verified`. If 'revision', status -> `revision_requested`.

4. **`finalizeBudget`**:

- Input: `budgetId`, `decision` ('approve' | 'reject').
- Logic: Updates status. Logs to `audit_logs`.

### STEP C: The "Create Budget" Wizard Page

Scaffold the page at `/dashboard/budget/create/page.tsx`.

- Use a stateful "Multi-Step Form" component.
- **Step 1:** Select Project & Type (CapEx/OpEx).
- **Step 2:** Add Line Items (Dynamic table to add rows).
- **Step 3:** Variance Check (Show warning if high).
- **Step 4:** Summary & Submit.

**Start by creating the `src/db/schema.ts` file.**
