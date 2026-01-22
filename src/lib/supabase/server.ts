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
        // In Server Components we must not mutate cookies; swallow writes instead of throwing.
        try {
          for (const { name, value } of cookiesToSet) {
            cookieStore.set({
              name,
              value,
              path: "/",
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
              httpOnly: true,
              maxAge: 60 * 60 * 24 * 7, // 7 days
            });
          }
        } catch {
          // No-op when writes are disallowed (Server Component render path).
        }
      },
    },
  });
}

// Cached version to avoid multiple auth calls within the same request
// This is request-scoped via React's cache()
export const getAuthUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});
