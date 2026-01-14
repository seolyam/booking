-- Create storage bucket for ID documents
insert into storage.buckets (id, name, public)
values ('id-documents', 'id-documents', false)
on conflict (id) do nothing;

-- Drop existing policies if they exist (idempotent)
drop policy if exists "Users can upload their own ID" on storage.objects;
drop policy if exists "Users can view their own ID" on storage.objects;
drop policy if exists "Admins can view all IDs" on storage.objects;
drop policy if exists "Admins can delete IDs" on storage.objects;

-- RLS Policy: Users can upload their own ID
create policy "Users can upload their own ID"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'id-documents' 
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy: Users can view their own ID
create policy "Users can view their own ID"
on storage.objects for select
to authenticated
using (
  bucket_id = 'id-documents' 
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy: Admins/Superadmins can view all IDs (deferred until public.users exists)
-- This will be added in a later migration after schema is set up
