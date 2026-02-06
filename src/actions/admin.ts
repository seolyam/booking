"use server";

import { db } from "@/db";
import { users, notifications } from "@/db/schema";
import { getAuthUser } from "@/lib/supabase/server";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import { eq, and, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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

export async function approveUser(userId: string) {
  await requireSuperadmin();

  const [updatedUser] = await db
    .update(users)
    .set({
      approval_status: "approved",
      role: sql`requested_role`, // Promote to requested role
      approved_at: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  if (updatedUser) {
    // Notify user? (If we had email sending, we'd do it here. For now just DB update)
    await db.insert(notifications).values({
      user_id: userId,
      title: "Account Approved",
      message: "Your account has been approved. You can now access the dashboard.",
      type: "success",
      link: "/dashboard",
    });
  }

  revalidatePath("/dashboard/admin/approvals");
  return { success: true };
}

export async function rejectUser(userId: string, reason: string) {
  await requireSuperadmin();

  await db
    .update(users)
    .set({
      approval_status: "rejected",
      rejection_reason: reason,
      rejected_at: new Date(),
    })
    .where(eq(users.id, userId));

  revalidatePath("/dashboard/admin/approvals");
  return { success: true };
}

// Helper for SQL promotion

export async function findPendingUserToApprove(requestedRole: "admin" | "requester" | "superadmin") {
  const user = await db.query.users.findFirst({
    where: and(
      eq(users.requested_role, requestedRole),
      eq(users.approval_status, "pending")
    ),
    orderBy: [desc(users.created_at)],
    columns: { id: true, email: true }
  });
  return user;
}
