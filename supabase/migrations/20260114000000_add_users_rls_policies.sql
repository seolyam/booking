-- Add Row Level Security (RLS) policies for public.users table
-- This was deferred from setup_id_storage migration until schema was fully defined

-- Enable RLS on users table
alter table public.users enable row level security;

-- Drop existing policies if they exist (idempotent)
drop policy if exists "Users can view their own row" on public.users;
drop policy if exists "Users can insert their own row" on public.users;
drop policy if exists "Users can update their own row" on public.users;
drop policy if exists "Approvers and Superadmins can view all users" on public.users;
drop policy if exists "Approvers and Superadmins can update any user" on public.users;

-- RLS Policy: Authenticated users can view their own row
create policy "Users can view their own row"
on public.users for select
to authenticated
using (auth.uid() = id);

-- RLS Policy: Authenticated users can insert their own row (for registration)
create policy "Users can insert their own row"
on public.users for insert
to authenticated
with check (auth.uid() = id);

-- RLS Policy: Authenticated users can update their own row
create policy "Users can update their own row"
on public.users for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- RLS Policy: Approvers and Superadmins can view all users
create policy "Approvers and Superadmins can view all users"
on public.users for select
to authenticated
using (
  exists (
    select 1 from public.users
    where id = auth.uid()
    and role in ('approver', 'superadmin')
  )
);

-- RLS Policy: Approvers and Superadmins can update any user (for approval workflow)
create policy "Approvers and Superadmins can update any user"
on public.users for update
to authenticated
using (
  exists (
    select 1 from public.users
    where id = auth.uid()
    and role in ('approver', 'superadmin')
  )
)
with check (
  exists (
    select 1 from public.users
    where id = auth.uid()
    and role in ('approver', 'superadmin')
  )
);
