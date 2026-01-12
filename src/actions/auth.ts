"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";

const AuthSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function signUp(
  email: string,
  password: string,
  redirectTo = "/onboard"
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

  const { error } = await supabase.auth.signUp({
    email: validated.data.email,
    password: validated.data.password,
    options: {
      emailRedirectTo: `${
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      }/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, redirectTo };
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
