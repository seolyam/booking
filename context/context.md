1. Overview
   We are building an internal "Budget Submission & Approval Tool" for Negros Power. This application allows various departments to create budget requests which pass through a specific 3-Tier Approval Workflow (Requester -> Reviewer -> Approver).
2. Tech Stack
   Framework: Next.js 14+ (App Router, TypeScript)
   Styling: Tailwind CSS + Shadcn/UI (using Lucide React for icons)
   Backend & Auth: Supabase (PostgreSQL Database + Auth)
   ORM: Drizzle ORM
   State Management: React Server Actions
   Package Manager: pnpm
3. User Roles (External Entities)
   The system must support these 4 specific roles:
   Requester: The provider who initiates the data flow (e.g., Department Head).
   Reviewer: The "Gatekeeper" (e.g., Finance Analyst). They sanitize/check data before it reaches the Approver. Can send back for revision.
   Approver: The Decision-Maker (e.g., VP/President). They see "Hidden Details" (ROI, Strategic Data) not visible to Requesters.
   Superadmin: Overseer with direct access to modify/delete data or bypass workflows.
4. Departments (Budget Units)
   Office of the President, CESRA, Customer Care, HCM, Controllership, Admin/Gen Services, Finance, Procurement, Legal, NDOG.
5. The Data Flow & Lifecycle (The Processes)
   Create & Submit (1.0): Requester inputs Budget Type (CapEx/OpEx), Costs, Timeline, and Variance Explanation. Submits to Reviewer.
   Review & Compare (2.0): Reviewer checks the proposal.
   If invalid: Sends "Revise" signal (Status -> revision_requested).
   If valid: Verifies it (Status -> verified_by_reviewer). Now visible to Approver.
   Final Approval (3.0): Approver views data + Hidden Details (ROI/Strategy).
   Decision: Approve or Reject.
   Administration (4.0): Superadmin can force-update statuses or delete stalled budgets.
