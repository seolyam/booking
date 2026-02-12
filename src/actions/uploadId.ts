"use server";

import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function uploadIdDocument(
  userId: string,
  fileData: string // base64 encoded file
) {
  // Verify the caller is authenticated and matches the target userId
  const supabaseServer = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabaseServer.auth.getUser();

  if (!authUser) {
    return { error: "Not authenticated" };
  }

  // Only allow users to upload their own ID document
  if (authUser.id !== userId) {
    return { error: "Unauthorized: Cannot upload ID for another user" };
  }

  if (!userId) {
    return { error: "User ID is required" };
  }

  if (!fileData) {
    return { error: "File data is required" };
  }

  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!projectUrl || !serviceKey) {
    return { error: "Server configuration error: Missing service role key" };
  }

  const supabase = createClient(projectUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Extract base64 data
    const base64Parts = fileData.split(",");
    const base64Data = base64Parts.length > 1 ? base64Parts[1] : fileData;
    const binaryData = Buffer.from(base64Data, "base64");

    const filePath = `${userId}/id-document.webp`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("id-picture")
      .upload(filePath, binaryData, {
        upsert: true,
        contentType: "image/webp",
      });

    if (uploadError) {
      return { error: `Storage upload failed: ${uploadError.message}` };
    }

    // Update the user record with the path
    await db
      .update(users)
      .set({ id_document_path: filePath })
      .where(eq(users.id, userId));

    return { success: true, path: filePath };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}
