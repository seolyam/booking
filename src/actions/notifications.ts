"use server";

import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getAuthUser } from "@/lib/supabase/server";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import { eq, desc, and, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function requireAppUser() {
  const authUser = await getAuthUser();
  if (!authUser) throw new Error("Not authenticated");
  return getOrCreateAppUserFromAuthUser({
    id: authUser.id,
    email: authUser.email ?? null,
    user_metadata: authUser.user_metadata ?? null,
  });
}

export async function getNotifications() {
  const appUser = await requireAppUser();

  return db
    .select()
    .from(notifications)
    .where(eq(notifications.user_id, appUser.id))
    .orderBy(desc(notifications.created_at))
    .limit(50);
}

export async function getUnreadCount() {
  const appUser = await requireAppUser();

  const [result] = await db
    .select({ count: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.user_id, appUser.id),
        eq(notifications.is_read, false)
      )
    );

  return result?.count ?? 0;
}

export async function markAsRead(id: string) {
  const appUser = await requireAppUser();

  await db
    .update(notifications)
    .set({ is_read: true })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.user_id, appUser.id)
      )
    );

  revalidatePath("/dashboard");
}

export async function markAllAsRead() {
  const appUser = await requireAppUser();

  await db
    .update(notifications)
    .set({ is_read: true })
    .where(eq(notifications.user_id, appUser.id));

  revalidatePath("/dashboard");
}
