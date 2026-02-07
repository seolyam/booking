import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabaseEnv();

  return createBrowserClient(url, anonKey, {
    cookies: {
      getAll() {
        return document.cookie.split(";").map((cookie) => {
          const [name, ...rest] = cookie.trim().split("=");
          return { name, value: rest.join("=") };
        });
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          document.cookie = [
            `${name}=${value}`,
            `path=${options?.path ?? "/"}`,
            `max-age=${options?.maxAge ?? 60 * 60 * 24 * 7}`,
            `samesite=${options?.sameSite ?? "lax"}`,
            `${(options?.secure ?? process.env.NODE_ENV === "production") ? "secure" : ""}`,
          ].filter(Boolean).join("; ");
        });
      },
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
  });
}
