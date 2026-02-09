import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// We need to import the schema, but we might run into issues with imports if paths aren't aliased correctly in ts-node or similar.
// But based on existing scripts like approve-admin.ts using "@/db/schema", it seems to work if configured.
// However, since we are writing a new file, let's stick to the pattern used in `approve-admin.ts`.
import { users, adminBranches, branches } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DB_URL = process.env.DIRECT_URL!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !DB_URL) {
    console.error("Missing env vars. Ensure NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DIRECT_URL are set in .env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

const sql = postgres(DB_URL, { prepare: false, ssl: "require" }); // Added SSL and prepare: false based on other scripts
const db = drizzle(sql, { schema: { users, adminBranches, branches } });

async function main() {
    const email = "admin@gmail.com";
    const password = "admin123";

    console.log(`Creating/Updating admin user: ${email}`);

    // 1. Create or Get Supabase Auth User
    let userId: string | null = null;

    const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: "Admin User", role: "admin" }
    });

    if (createError) {
        if (createError.message?.includes("already registered") || createError.status === 422 || createError.code === "email_exists") {
            console.log("User already exists in Auth. Fetching ID...");

            // Try to find in DB first to save API calls
            const existingDbUser = await db.query.users.findFirst({
                where: eq(users.email, email)
            });

            if (existingDbUser) {
                userId = existingDbUser.id;
                console.log(`Found existing DB user ID: ${userId}`);
            } else {
                // Fetch from Auth API
                const { data: { users: allUsers } } = await supabase.auth.admin.listUsers();
                const found = allUsers.find(u => u.email === email);
                if (found) {
                    userId = found.id;
                    console.log(`Found user ID in Auth: ${userId}`);
                } else {
                    console.error("User exists according to create error, but could not be found in list.");
                    process.exit(1);
                }
            }

        } else {
            console.error("Failed to create user:", createError);
            process.exit(1);
        }
    } else {
        userId = createdUser.user.id;
        console.log(`User created in Auth with ID: ${userId}`);
    }

    if (!userId) {
        console.error("Could not determine User ID");
        process.exit(1);
    }

    // 2. Upsert into public.users
    console.log("Upserting into public.users...");
    await db.insert(users).values({
        id: userId,
        email,
        role: "admin",
        approval_status: "approved",
        full_name: "Admin User",
        requested_role: "admin",
        approved_at: new Date(),
    }).onConflictDoUpdate({
        target: users.id,
        set: {
            role: "admin",
            approval_status: "approved",
        }
    });

    // 3. Assign to all branches
    console.log("Assigning to all branches...");
    const allBranches = await db.query.branches.findMany();

    if (allBranches.length === 0) {
        console.log("No branches found to assign. Please seed branches first.");
    } else {
        for (const branch of allBranches) {
            // Check if assigned
            const existingAssignment = await db.query.adminBranches.findFirst({
                where: and(
                    eq(adminBranches.admin_id, userId),
                    eq(adminBranches.branch_id, branch.id)
                )
            });

            if (!existingAssignment) {
                await db.insert(adminBranches).values({
                    admin_id: userId,
                    branch_id: branch.id
                });
                console.log(`Assigned to branch: ${branch.name}`);
            } else {
                // console.log(`Already assigned to branch: ${branch.name}`);
            }
        }
    }

    console.log("Success! Admin user ready.");
    process.exit(0);
}

main().catch(err => {
    console.error("Script failed:", err);
    process.exit(1);
});
