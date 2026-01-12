import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

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
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // No-op when writes are disallowed (Server Component render path).
        }
      },
    },
  });
}
