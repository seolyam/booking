"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { redirect } from "next/navigation";
import { z } from "zod";

const AuthSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function signUp(
  email: string,
  password: string,
  data?: {
    fullName: string;
    idNumber: string;
    branchId: string;
    position: string;
    requestedRole?: string;
  }
) {
  const validated = AuthSchema.safeParse({ email, password });
  if (!validated.success) {
    return {
      error:
        Object.values(validated.error.flatten().fieldErrors)[0]?.[0] ||
        "Validation failed",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: authData, error } = await supabase.auth.signUp({
    email: validated.data.email,
    password: validated.data.password,
    options: {
      emailRedirectTo: `${
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      }/auth/callback`,
      data: data,
    },
  });

  if (error) {
    return { error: error.message };
  }

  const userId = authData.user?.id;
  if (!userId) {
    return { error: "Failed to create user account" };
  }

  // Create app user record immediately so we can update it with the ID document path
  try {
    const requestedRole = (data?.requestedRole as "requester" | "admin") || "requester";
    await db
      .insert(users)
      .values({
        id: userId,
        email: validated.data.email,
        branch_id: data?.branchId || null,
        role: "requester",
        requested_role: requestedRole === "admin" ? "admin" : "requester",
        full_name: data?.fullName || null,
        position: data?.position || null,
        id_number: data?.idNumber || null,
      })
      .onConflictDoNothing({ target: users.id });
  } catch {
    // Don't return error - the record might already exist or be created by auth callback
  }

  // Return the user ID so the client can upload the ID document to the correct path
  return { success: true, userId };
}

export async function signIn(email: string, password: string) {
  const validated = AuthSchema.safeParse({ email, password });
  if (!validated.success) {
    return {
      error:
        Object.values(validated.error.flatten().fieldErrors)[0]?.[0] ||
        "Validation failed",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: validated.data.email,
    password: validated.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
