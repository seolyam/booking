-- Add admin policies for storage (now that public.users exists)

drop policy if exists "Admins can view all IDs" on storage.objects;
drop policy if exists "Admins can delete IDs" on storage.objects;

-- RLS Policy: Admins/Superadmins can view all IDs
create policy "Admins can view all IDs"
on storage.objects for select
to authenticated
using (
  bucket_id = 'id-documents' 
  and exists (
    select 1 from public.users 
    where id = auth.uid() 
    and role in ('approver', 'superadmin')
  )
);

-- RLS Policy: Admins can delete IDs
create policy "Admins can delete IDs"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'id-documents' 
  and exists (
    select 1 from public.users 
    where id = auth.uid() 
    and role in ('approver', 'superadmin')
  )
);
