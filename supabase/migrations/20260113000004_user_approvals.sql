-- Adds user application approval workflow fields.

do $$ begin
  create type application_status as enum ('pending','approved','rejected');
exception
  when duplicate_object then null;
end $$;

alter table public.users
  add column if not exists approval_status application_status not null default 'pending',
  add column if not exists requested_role user_role not null default 'requester',
  add column if not exists full_name text,
  add column if not exists position text,
  add column if not exists id_number text,
  add column if not exists id_document_path text,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.users(id),
  add column if not exists rejected_at timestamptz,
  add column if not exists rejected_by uuid references public.users(id),
  add column if not exists rejection_reason text;

-- Existing users were created before approvals existed; treat them as approved.
update public.users
set approval_status = 'approved'
where approval_status is null;
