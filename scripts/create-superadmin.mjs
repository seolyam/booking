import dotenv from "dotenv";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

// Load env (prefer .env.local)
dotenv.config({ path: ".env.local" });
dotenv.config();

function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function requireEnv(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

async function resolveUserIdByEmail(supabase, email) {
  // Fallback path when createUser says the user already exists.
  // Supabase Admin API doesn't provide a direct get-by-email in all setups.
  const perPage = 200;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;
    const found = data?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (found?.id) return found.id;
    if (!data?.users?.length || data.users.length < perPage) break;
  }
  return null;
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const databaseUrl = requireEnv("DATABASE_URL");

  const email =
    getArg("email") ||
    process.env.SUPERADMIN2_EMAIL ||
    process.env.SUPERADMIN_EMAIL;
  const password = getArg("password") || process.env.SUPERADMIN2_PASSWORD;
  const department =
    getArg("department") ||
    process.env.SUPERADMIN2_DEPARTMENT ||
    "Office of the President";

  if (!email) {
    throw new Error(
      "Missing superadmin email. Provide --email or set SUPERADMIN2_EMAIL in .env.local"
    );
  }

  if (!password) {
    throw new Error(
      "Missing superadmin password. Provide --password or set SUPERADMIN2_PASSWORD in .env.local"
    );
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    const message = String(error.message || "");
    if (
      message.toLowerCase().includes("already") ||
      message.toLowerCase().includes("registered")
    ) {
      userId = await resolveUserIdByEmail(supabase, email);
      if (!userId) {
        throw new Error(
          `Auth user already exists but could not be located via listUsers for email: ${email}`
        );
      }
    } else {
      throw error;
    }
  } else {
    userId = data?.user?.id;
  }

  if (!userId) throw new Error("Failed to resolve auth user id");

  const sql = postgres(databaseUrl, { prepare: false });
  try {
    await sql`
      insert into public.users (id, email, role, department, approval_status, requested_role)
      values (${userId}, ${email}, 'superadmin', ${department}, 'approved', 'superadmin')
      on conflict (id) do update
      set email = excluded.email,
          role = excluded.role,
          department = excluded.department,
          approval_status = excluded.approval_status,
          requested_role = excluded.requested_role;
    `;
  } finally {
    await sql.end({ timeout: 5 });
  }

  // Do not print secrets.
  console.log(`Superadmin provisioned: ${email} (id: ${userId})`);
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
