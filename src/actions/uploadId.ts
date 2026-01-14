"use server";

import { createClient } from "@supabase/supabase-js";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function uploadIdDocument(
  userId: string,
  fileData: string, // base64 encoded file
  fileName: string
) {
  // Create a service role client that bypasses RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role bypasses RLS
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  try {
    // Convert base64 back to blob
    const base64Data = fileData.split(",")[1];
    const binaryData = Buffer.from(base64Data, "base64");

    const filePath = `${userId}/id-document.webp`;

    // Upload with service role (bypasses RLS)
    const { error: uploadError } = await supabase.storage
      .from("id-documents")
      .upload(filePath, binaryData, {
        upsert: true,
        contentType: "image/webp",
      });

    if (uploadError) {
      return { error: `Upload failed: ${uploadError.message}` };
    }

    // Update user record with storage path (Drizzle bypasses RLS)
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
