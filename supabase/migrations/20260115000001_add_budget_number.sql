-- Add a stable, globally-incrementing budget number for display (BUD-1, BUD-2, ...)

-- 1) Create sequence
create sequence if not exists public.budget_number_seq;

-- 2) Add column (nullable initially for backfill)
alter table public.budgets
add column if not exists budget_number bigint;

-- 3) Backfill existing rows deterministically (oldest first)
with ordered as (
  select
    id,
    row_number() over (order by created_at asc) as rn
  from public.budgets
  where budget_number is null
)
update public.budgets b
set budget_number = o.rn
from ordered o
where b.id = o.id;

-- 4) Set sequence to current max so nextval continues correctly
select setval(
  'public.budget_number_seq',
  (select coalesce(max(budget_number), 0) from public.budgets)
);

-- 5) Enforce not-null + default and uniqueness
alter table public.budgets
  alter column budget_number set default nextval('public.budget_number_seq'),
  alter column budget_number set not null;

create unique index if not exists budgets_budget_number_key
  on public.budgets (budget_number);
