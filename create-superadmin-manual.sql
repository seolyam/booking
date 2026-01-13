-- ============================================
-- CREATE SUPERADMIN ACCOUNT
-- ============================================
-- Copy/paste this entire block into Supabase Dashboard > SQL Editor
-- and click RUN
-- ============================================

-- Step 1: Create auth user (paste this FIRST)
-- Note: You'll need to do this via Dashboard > Authentication > Add User instead
-- Email: superadmin@budget.local
-- Password: SuperAdmin2026!
-- Auto Confirm: YES

-- Step 2: After creating the auth user, run THIS to provision in public.users:

INSERT INTO public.users (id, email, role, department)
SELECT 
  id,
  'superadmin@budget.local',
  'superadmin',
  'Office of the President'
FROM auth.users
WHERE email = 'superadmin@budget.local'
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  department = EXCLUDED.department;

-- Done! Test login at your app.
