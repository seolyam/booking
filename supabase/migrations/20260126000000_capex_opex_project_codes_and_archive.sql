-- Adds year-resetting CapEx/OpEx project IDs and archive storage for prior-year projects.

-- 1) Add project_code to active budgets
alter table public.budgets
  add column if not exists project_code text;

create unique index if not exists budgets_project_code_year_uq
  on public.budgets (fiscal_year, project_code)
  where project_code is not null;

-- 2) Per-year counters for CapEx/OpEx numbering
create table if not exists public.budget_project_counters (
  fiscal_year integer not null,
  budget_type public.budget_type not null,
  next_number integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (fiscal_year, budget_type)
);

-- 3) Archive tables (prior-year budgets/items/milestones/logs)
create table if not exists public.archived_budgets (
  id uuid primary key default gen_random_uuid(),
  source_budget_id uuid not null,
  user_id uuid not null references public.users (id),
  budget_number bigint not null,
  project_code text,
  budget_type public.budget_type not null,
  fiscal_year integer not null,
  status public.budget_status not null,
  total_amount numeric(15,2) not null default 0,
  variance_explanation text,
  roi_analysis text,
  start_date timestamp,
  end_date timestamp,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  archived_at timestamptz not null default now()
);

create unique index if not exists archived_budgets_source_uq
  on public.archived_budgets (source_budget_id);

create unique index if not exists archived_budgets_project_code_year_uq
  on public.archived_budgets (fiscal_year, project_code)
  where project_code is not null;

create table if not exists public.archived_budget_items (
  id uuid primary key default gen_random_uuid(),
  archived_budget_id uuid not null references public.archived_budgets (id) on delete cascade,
  description text not null,
  quantity integer not null,
  unit_cost numeric(15,2) not null,
  total_cost numeric(15,2) not null,
  quarter text not null
);

create table if not exists public.archived_budget_milestones (
  id uuid primary key default gen_random_uuid(),
  archived_budget_id uuid not null references public.archived_budgets (id) on delete cascade,
  description text not null,
  target_quarter text,
  created_at timestamptz not null
);

create table if not exists public.archived_audit_logs (
  id uuid primary key default gen_random_uuid(),
  archived_budget_id uuid not null references public.archived_budgets (id) on delete cascade,
  actor_id uuid not null references public.users (id),
  action text not null,
  previous_status text,
  new_status text,
  timestamp timestamptz not null,
  comment text
);
