"use server";

import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getAuthUser } from "@/lib/supabase/server";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getNotifications(limit = 20) {
    const user = await getAuthUser();
    if (!user) return [];

    return await db.query.notifications.findMany({
        where: eq(notifications.user_id, user.id),
        orderBy: [desc(notifications.created_at)],
        limit: limit,
    });
}

export async function getUnreadCount() {
    const user = await getAuthUser();
    if (!user) return 0;

    const results = await db
        .select({ count: notifications.id })
        .from(notifications)
        .where(and(eq(notifications.user_id, user.id), eq(notifications.is_read, false)));

    return results.length;
}

export async function markAsRead(id: string) {
    const user = await getAuthUser();
    if (!user) return;

    await db
        .update(notifications)
        .set({ is_read: true })
        .where(and(eq(notifications.id, id), eq(notifications.user_id, user.id)));

    revalidatePath("/dashboard");
}

export async function markAllAsRead() {
    const user = await getAuthUser();
    if (!user) return;

    await db
        .update(notifications)
        .set({ is_read: true })
        .where(eq(notifications.user_id, user.id));

    revalidatePath("/dashboard");
}
