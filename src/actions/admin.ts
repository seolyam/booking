"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function approveUser(userId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    return { error: "Unauthorized" };
  }

  const appUser = await db.query.users.findFirst({
    where: eq(users.id, currentUser.id),
  });

  if (!appUser || appUser.role !== "superadmin") {
    return { error: "Forbidden: superadmin only" };
  }

  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!targetUser) {
    return { error: "User not found" };
  }

  await db
    .update(users)
    .set({
      approval_status: "approved",
      role: targetUser.requested_role,
      approved_at: new Date(),
      approved_by: currentUser.id,
    })
    .where(eq(users.id, userId));

  revalidatePath("/dashboard/admin/approvals");
  return { success: true };
}

export async function rejectUser(userId: string, reason: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    return { error: "Unauthorized" };
  }

  const appUser = await db.query.users.findFirst({
    where: eq(users.id, currentUser.id),
  });

  if (!appUser || appUser.role !== "superadmin") {
    return { error: "Forbidden: superadmin only" };
  }

  await db
    .update(users)
    .set({
      approval_status: "rejected",
      rejected_at: new Date(),
      rejected_by: currentUser.id,
      rejection_reason: reason,
    })
    .where(eq(users.id, userId));

  revalidatePath("/dashboard/admin/approvals");
  return { success: true };
}

export async function getSignedIdUrl(
  storagePath: string
): Promise<string | null> {
  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient.storage
    .from("id-documents")
    .createSignedUrl(storagePath, 60 * 5); // 5 min expiry

  if (error || !data) {
    return null;
  }

  return data.signedUrl;
}
