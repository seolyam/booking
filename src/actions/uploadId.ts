"use server";

import { createClient } from "@supabase/supabase-js";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function uploadIdDocument(
  userId: string,
  fileData: string // base64 encoded file
) {
  console.log(`\n[uploadIdDocument] START - userId: ${userId}`);

  if (!userId) {
    console.error("[uploadIdDocument] ERROR: userId is empty");
    return { error: "User ID is required" };
  }

  if (!fileData) {
    console.error("[uploadIdDocument] ERROR: fileData is empty");
    return { error: "File data is required" };
  }

  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!projectUrl || !serviceKey) {
    console.error("[uploadIdDocument] ERROR: Missing Supabase credentials");
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

    console.log(`[uploadIdDocument] File size: ${binaryData.length} bytes`);

    const filePath = `${userId}/id-document.webp`;
    console.log(`[uploadIdDocument] Uploading to: id-documents/${filePath}`);

    // Upload to storage
    const { data, error: uploadError } = await supabase.storage
      .from("id-documents")
      .upload(filePath, binaryData, {
        upsert: true,
        contentType: "image/webp",
      });

    if (uploadError) {
      console.error(
        "[uploadIdDocument] ERROR - Storage upload failed:",
        uploadError
      );
      return { error: `Storage upload failed: ${uploadError.message}` };
    }

    console.log("[uploadIdDocument] Storage upload successful:", data);

    // Verify the file exists in storage
    const { data: files, error: listError } = await supabase.storage
      .from("id-documents")
      .list(userId);

    if (listError) {
      console.warn(
        "[uploadIdDocument] Warning - Could not verify file:",
        listError
      );
    } else {
      console.log(
        `[uploadIdDocument] Verified files in ${userId}:`,
        files?.map((f) => f.name)
      );
    }

    // Update the user record with the path (user should exist from signup)
    console.log(
      `[uploadIdDocument] Updating user record - userId: ${userId}, path: ${filePath}`
    );

    await db
      .update(users)
      .set({ id_document_path: filePath })
      .where(eq(users.id, userId));

    console.log("[uploadIdDocument] Database update completed");

    // Verify the database was updated
    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (updatedUser?.id_document_path === filePath) {
      console.log(
        `[uploadIdDocument] SUCCESS - Path saved to database: ${filePath}`
      );
      return { success: true, path: filePath };
    } else {
      console.error("[uploadIdDocument] ERROR - Path verification failed");
      console.error(`[uploadIdDocument] Expected: ${filePath}`);
      console.error(
        `[uploadIdDocument] Actual: ${updatedUser?.id_document_path}`
      );
      return { error: "Failed to save file path to database" };
    }
  } catch (error) {
    console.error("[uploadIdDocument] EXCEPTION:", error);
    return {
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}
