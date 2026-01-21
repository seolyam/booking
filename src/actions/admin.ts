"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function approveUser(userId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  const appUser = await db.query.users.findFirst({
    where: eq(users.id, currentUser.id),
  });

  if (!appUser || appUser.role !== "superadmin") {
    throw new Error("Forbidden: superadmin only");
  }

  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!targetUser) {
    throw new Error("User not found");
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

  // Revalidate dashboard paths to reflect user approval
  revalidatePath("/dashboard/admin/approvals");
  revalidatePath("/dashboard");
}

export async function rejectUser(
  userId: string,
  reason: string,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  const appUser = await db.query.users.findFirst({
    where: eq(users.id, currentUser.id),
  });

  if (!appUser || appUser.role !== "superadmin") {
    throw new Error("Forbidden: superadmin only");
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

  // Revalidate dashboard paths to reflect user rejection
  revalidatePath("/dashboard/admin/approvals");
  revalidatePath("/dashboard");
}

export async function getSignedIdUrl(
  storagePath: string,
): Promise<string | null> {
  try {
    const adminClient = createSupabaseAdminClient();
    console.log(`Getting signed URL for: ${storagePath}`);

    const { data, error } = await adminClient.storage
      .from("id-documents")
      .createSignedUrl(storagePath, 60 * 60); // 1 hour expiry

    if (error) {
      console.error(`Supabase storage error:`, error);
      return null;
    }

    if (!data?.signedUrl) {
      console.error(`No signed URL returned for: ${storagePath}`);
      return null;
    }

    console.log(`Signed URL created: ${data.signedUrl.substring(0, 100)}...`);
    return data.signedUrl;
  } catch (err) {
    console.error(`Exception in getSignedIdUrl:`, err);
    return null;
  }
}
