-- ============================================
-- Supabase Storage Setup for ID Documents
-- ============================================
-- Run this in: Supabase Dashboard > SQL Editor
-- Or via: psql / Supabase CLI
-- ============================================

-- 1. Create storage bucket for ID documents
insert into storage.buckets (id, name, public)
values ('id-documents', 'id-documents', false)
on conflict (id) do nothing;

-- 2. RLS Policy: Users can upload their own ID
create policy "Users can upload their own ID"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'id-documents' 
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. RLS Policy: Users can view their own ID
create policy "Users can view their own ID"
on storage.objects for select
to authenticated
using (
  bucket_id = 'id-documents' 
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. RLS Policy: Admins/Superadmins can view all IDs
create policy "Admins can view all IDs"
on storage.objects for select
to authenticated
using (
  bucket_id = 'id-documents' 
  and exists (
    select 1 from public.users 
    where id = auth.uid() 
    and role in ('admin', 'superadmin')
  )
);

-- 5. RLS Policy: Admins can delete IDs (optional)
create policy "Admins can delete IDs"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'id-documents' 
  and exists (
    select 1 from public.users 
    where id = auth.uid() 
    and role in ('admin', 'superadmin')
  )
);

-- ============================================
-- Done! Storage bucket "id-documents" is ready
-- ============================================
