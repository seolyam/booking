const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const superadminEmail = process.env.SUPERADMIN_EMAIL;
const superadminPassword = process.env.SUPERADMIN_PASSWORD;

if (!serviceRoleKey) {
  console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY not found in .env.local");
  console.log(
    "Please add it from: Supabase Dashboard > Settings > API > service_role key"
  );
  process.exit(1);
}

if (!superadminEmail || !superadminPassword) {
  console.error(
    "ERROR: Missing SUPERADMIN_EMAIL or SUPERADMIN_PASSWORD in .env.local"
  );
  console.log("Add these to .env.local, then rerun:");
  console.log("  SUPERADMIN_EMAIL=superadmin@yourdomain.com");
  console.log("  SUPERADMIN_PASSWORD=use-a-strong-password");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

(async () => {
  let userId;

  // Create or find superadmin auth user
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: superadminEmail,
      password: superadminPassword,
      email_confirm: true,
      user_metadata: {
        fullName: "Super Admin",
        department: "Office of the President",
        position: "Administrator",
        role: "superadmin",
      },
    });

  if (authError) {
    const msg = authError.message || "";
    if (
      msg.toLowerCase().includes("already") &&
      msg.toLowerCase().includes("registered")
    ) {
      const { data: listData, error: listError } =
        await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listError) {
        console.error("Auth Error (listUsers):", listError.message);
        process.exit(1);
      }
      const existing = (listData.users || []).find(
        (u) => u.email === superadminEmail
      );
      if (!existing) {
        console.error(
          "Auth Error: user already exists, but could not find it via listUsers"
        );
        process.exit(1);
      }
      userId = existing.id;
      console.log("✅ Superadmin already exists in auth.users");
      console.log("   User ID:", userId);
    } else {
      console.error("Auth Error:", authError.message);
      process.exit(1);
    }
  } else {
    userId = authData.user.id;
    console.log("✅ Superadmin created in auth.users");
    console.log("   User ID:", userId);
  }

  // Upsert into public.users
  const { error: dbError } = await supabase.from("users").upsert(
    {
      id: userId,
      email: superadminEmail,
      role: "superadmin",
      department: "Office of the President",
      approval_status: "approved",
      requested_role: "superadmin",
      full_name: "Super Admin",
      position: "Administrator",
    },
    { onConflict: "id" }
  );

  if (dbError) {
    console.error("DB Error:", dbError.message);
    process.exit(1);
  }

  console.log("✅ Superadmin provisioned in public.users");
  console.log("\nSuperadmin ready:");
  console.log("   Email:", superadminEmail);
  console.log("   Password: (from SUPERADMIN_PASSWORD in .env.local)");
})();
