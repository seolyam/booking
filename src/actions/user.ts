"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { ZodIssue } from "zod";

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(8, "Password must be at least 8 characters long."),
});

export async function changePassword(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { error: "You must be logged in to change your password." };
  }
  
  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;

  const result = ChangePasswordSchema.safeParse({ currentPassword, newPassword });

  if (!result.success) {
    return { error: result.error.issues.map((e: ZodIssue) => e.message).join(", ") };
  }
  
  // Verify the current password
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: result.data.currentPassword,
  });

  if (signInError) {
    return { error: "Invalid current password." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: result.data.newPassword,
  });

  if (updateError) {
    return { error: updateError.message };
  }

  return { success: "Password updated successfully." };
}
