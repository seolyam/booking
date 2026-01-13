-- Create superadmin user in Supabase Auth and public.users
-- Run this after the storage migration

-- Step 1: Create auth user (using Supabase REST API or Dashboard)
-- We'll use a SQL function to call Supabase's internal API

-- Temporary function to create superadmin
do $$
declare
  superadmin_id uuid;
begin
  -- Insert into auth.users (requires superuser or special permissions)
  -- Alternative: Use Supabase Dashboard > Authentication > Add User
  
  -- For now, we'll prepare the public.users entry
  -- The auth user must be created manually via Dashboard or API
  
  -- Check if superadmin exists
  select id into superadmin_id from auth.users where email = 'superadmin@budget.local';
  
  if superadmin_id is null then
    raise notice 'Please create auth user manually:';
    raise notice 'Email: superadmin@budget.local';
    raise notice 'Password: SuperAdmin2026!';
    raise notice 'Then run: INSERT INTO public.users (id, email, role, department) VALUES ((SELECT id FROM auth.users WHERE email = ''superadmin@budget.local''), ''superadmin@budget.local'', ''superadmin'', ''Office of the President'');';
  else
    -- Insert into public.users
    insert into public.users (id, email, role, department)
    values (
      superadmin_id,
      'superadmin@budget.local',
      'superadmin',
      'Office of the President'
    )
    on conflict (id) do update set
      role = excluded.role,
      department = excluded.department;
    
    raise notice 'Superadmin user provisioned!';
  end if;
end $$;
