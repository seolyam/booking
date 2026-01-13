"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function updateUserIdDocumentPath(
  userId: string,
  storagePath: string
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    return { error: "Unauthorized" };
  }

  await db
    .update(users)
    .set({ id_document_path: storagePath })
    .where(eq(users.id, userId));

  return { success: true };
}
