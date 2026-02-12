"use server";

import { db } from "@/db";
import { users, notifications } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/auth";

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
