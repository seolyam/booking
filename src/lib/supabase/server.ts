import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";
import { cache } from "react";

export async function createSupabaseServerClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value } of cookiesToSet) {
            cookieStore.set({
              name,
              value,
              path: "/",
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
              httpOnly: true,
              maxAge: 60 * 60 * 24 * 7,
            });
          }
        } catch {
          // No-op in Server Component render path
        }
      },
    },
  });
}

export const getAuthUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});
