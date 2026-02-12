"use server";

import { createClient } from "@supabase/supabase-js";
import { db } from "@/db";
import { users, branches, notifications } from "@/db/schema";
import { getAuthUser } from "@/lib/supabase/server";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

async function requireSuperadmin() {
  const authUser = await getAuthUser();
  if (!authUser) throw new Error("Not authenticated");

  const appUser = await getOrCreateAppUserFromAuthUser({
    id: authUser.id,
    email: authUser.email ?? null,
    user_metadata: authUser.user_metadata ?? null,
  });

  if (appUser.role !== "superadmin") {
    throw new Error("Unauthorized: Superadmin access required");
  }
  return appUser;
}

/**
 * Creates a Supabase Admin client using the service role key.
 * This is the ONLY secure way to create/manage auth users server-side
 * without affecting the current user's session.
 */
function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase service role credentials");
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const CreateUserSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["requester", "admin", "superadmin"]),
  branchId: z.string().uuid("Invalid branch").nullable(),
  position: z.string().optional(),
  department: z.string().optional(),
});

const UpdateUserSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().min(1, "Full name is required"),
  role: z.enum(["requester", "admin", "superadmin"]),
  branchId: z.string().uuid("Invalid branch").nullable(),
  position: z.string().optional(),
  department: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export type UserRow = {
  id: string;
  email: string;
  fullName: string | null;
  role: "requester" | "admin" | "superadmin";
  branchName: string | null;
  branchId: string | null;
  position: string | null;
  department: string | null;
  approvalStatus: "pending" | "approved" | "rejected";
  createdAt: string;
};

export async function getUsers(search?: string): Promise<UserRow[]> {
  await requireSuperadmin();

  const conditions = [];
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(users.full_name, term),
        ilike(users.email, term),
      ),
    );
  }

  const result = await db.query.users.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    with: {
      branch: { columns: { name: true } },
    },
    orderBy: [desc(users.created_at)],
  });

  return result.map((u) => ({
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    role: u.role,
    branchName: u.branch?.name ?? null,
    branchId: u.branch_id,
    position: u.position,
    department: u.department,
    approvalStatus: u.approval_status,
    createdAt: u.created_at.toISOString(),
  }));
}

export async function getBranchOptions() {
  const result = await db.query.branches.findMany({
    where: eq(branches.is_active, true),
    columns: { id: true, name: true },
    orderBy: (b, { asc }) => [asc(b.name)],
  });
  return result;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createUser(data: {
  fullName: string;
  email: string;
  password: string;
  role: "requester" | "admin" | "superadmin";
  branchId: string | null;
  position?: string;
  department?: string;
}) {
  await requireSuperadmin();

  const validated = CreateUserSchema.safeParse(data);
  if (!validated.success) {
    const firstError = Object.values(validated.error.flatten().fieldErrors)[0]?.[0];
    return { error: firstError || "Validation failed" };
  }

  const { fullName, email, password, role, branchId, position, department } = validated.data;

  // Validate branch exists if provided
  if (branchId) {
    const branchExists = await db.query.branches.findFirst({
      where: eq(branches.id, branchId),
      columns: { id: true },
    });
    if (!branchExists) return { error: "Selected branch does not exist" };
  }

  // Check if email already exists in our users table
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true },
  });
  if (existingUser) return { error: "A user with this email already exists" };

  try {
    // Step 1: Create the Supabase Auth user via Admin API.
    // This does NOT send a confirmation email and does NOT affect the
    // superadmin's current session (unlike supabase.auth.signUp).
    const supabaseAdmin = createSupabaseAdmin();
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification for admin-created users
      user_metadata: { fullName, position, department },
    });

    if (authError) {
      return { error: authError.message };
    }

    const userId = authData.user.id;

    // Step 2: Insert the public users table row
    await db.insert(users).values({
      id: userId,
      email,
      full_name: fullName,
      role,
      requested_role: role,
      branch_id: branchId,
      position: position || null,
      department: department || null,
      approval_status: "approved", // Admin-created users are pre-approved
      approved_at: new Date(),
    }).onConflictDoNothing({ target: users.id });

    // Step 3: Notify the new user
    await db.insert(notifications).values({
      user_id: userId,
      title: "Welcome",
      message: "Your account has been created by an administrator. You can now log in.",
      type: "success",
      link: "/dashboard",
    });

    revalidatePath("/dashboard/admin/users");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to create user",
    };
  }
}

export async function updateUser(data: {
  userId: string;
  fullName: string;
  role: "requester" | "admin" | "superadmin";
  branchId: string | null;
  position?: string;
  department?: string;
}) {
  const currentUser = await requireSuperadmin();

  const validated = UpdateUserSchema.safeParse(data);
  if (!validated.success) {
    const firstError = Object.values(validated.error.flatten().fieldErrors)[0]?.[0];
    return { error: firstError || "Validation failed" };
  }

  const { userId, fullName, role, branchId, position, department } = validated.data;

  // Prevent superadmin from demoting themselves
  if (userId === currentUser.id && role !== "superadmin") {
    return { error: "You cannot change your own role" };
  }

  // Validate branch
  if (branchId) {
    const branchExists = await db.query.branches.findFirst({
      where: eq(branches.id, branchId),
      columns: { id: true },
    });
    if (!branchExists) return { error: "Selected branch does not exist" };
  }

  try {
    await db
      .update(users)
      .set({
        full_name: fullName,
        role,
        requested_role: role,
        branch_id: branchId,
        position: position || null,
        department: department || null,
      })
      .where(eq(users.id, userId));

    // Also update Supabase Auth metadata to keep in sync
    const supabaseAdmin = createSupabaseAdmin();
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { fullName, position, department },
    });

    revalidatePath("/dashboard/admin/users");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update user",
    };
  }
}

export async function toggleUserStatus(userId: string) {
  const currentUser = await requireSuperadmin();

  if (userId === currentUser.id) {
    return { error: "You cannot deactivate your own account" };
  }

  // Fetch current status
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { approval_status: true, full_name: true },
  });

  if (!user) return { error: "User not found" };

  const newStatus = user.approval_status === "approved" ? "rejected" : "approved";
  const action = newStatus === "rejected" ? "suspended" : "reactivated";

  try {
    await db
      .update(users)
      .set({
        approval_status: newStatus,
        ...(newStatus === "rejected"
          ? { rejection_reason: "Account suspended by administrator", rejected_at: new Date() }
          : { approved_at: new Date(), rejection_reason: null }),
      })
      .where(eq(users.id, userId));

    // Also disable/enable the Supabase Auth user to prevent login entirely
    const supabaseAdmin = createSupabaseAdmin();
    if (newStatus === "rejected") {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: "876000h", // ~100 years = effectively permanent
      });
    } else {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: "none",
      });
    }

    // Notify user
    await db.insert(notifications).values({
      user_id: userId,
      title: newStatus === "rejected" ? "Account Suspended" : "Account Reactivated",
      message: newStatus === "rejected"
        ? "Your account has been suspended by an administrator."
        : "Your account has been reactivated. You can now log in.",
      type: newStatus === "rejected" ? "error" : "success",
      link: "/dashboard",
    });

    revalidatePath("/dashboard/admin/users");
    return { success: true, action };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : `Failed to ${action} user`,
    };
  }
}
