> **Context:**
> Currently, we have to manually insert user details via SQL, which is inefficient. I need to implement a "Pending Approval" workflow where new signups are automatically added to the `public.users` table with a 'pending' status, and an Admin can verify them later.
> **Objective:**
> Please implement the following 4-step solution. Write the necessary code for each step.
> **Step 1: Database Automation (Supabase SQL)**
> Create a Supabase migration or SQL script to:
>
> 1. Create a Trigger Function `handle_new_user` that runs after a new user is inserted into `auth.users`.
> 2. The function must automatically insert a row into `public.users` with:
>
> - `id`: references `new.id`
> - `email`: references `new.email`
> - `role`: set default to `'pending'`
> - `department`: set default to `'Unassigned'`
>
> 3. Create the Trigger `on_auth_user_created` to execute this function on every signup.
>
> **Step 2: Row Level Security (RLS)**
> Update RLS policies on the `public.users` table:
>
> 1. **General Users:** Can only `SELECT` their own row (`auth.uid() = id`).
> 2. **Admins:** Can `SELECT` and `UPDATE` all rows (check if the requesting user has `role = 'admin'`).
> 3. **Pending Users:** Should be strictly limited (they cannot see organization data until approved).
>
> **Step 3: Admin Approval Interface (Next.js)**
> Create a new page at `/app/admin/users/page.tsx` that:
>
> 1. Fetches all users where `role === 'pending'`.
> 2. Displays them in a table (Email, Joined Date).
> 3. Provides a UI (Select/Dropdown) to assign a **Role** (e.g., 'requester', 'approver') and a **Department** (e.g., 'Finance', 'IT').
> 4. Includes a "Approve/Save" button that calls a Server Action to update that specific user's row.
>
> **Step 4: Middleware & UX**
>
> 1. Modify `middleware.ts` or the login logic: If a user logs in and their role is `'pending'`, redirect them to a generic `/pending-approval` page that says "Your account is waiting for administrator approval."
> 2. Prevent 'pending' users from accessing the main dashboard.
>
> **Tech Stack:** Next.js 15 (App Router), Supabase SSR, Tailwind CSS, Lucide React (for icons).
> Please generate the code for the **SQL Triggers**, the **Server Action**, and the **Admin Page Component**.

---
