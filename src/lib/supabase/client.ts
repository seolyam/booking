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
          const cookieOptions = {
            path: options?.path ?? "/",
            maxAge: options?.maxAge ?? 60 * 60 * 24 * 7,
            sameSite: (options?.sameSite ?? "lax") as "lax" | "strict" | "none",
            secure: options?.secure ?? process.env.NODE_ENV === "production",
          };

          let cookieString = `${name}=${value}`;
          if (cookieOptions.path)
            cookieString += `; path=${cookieOptions.path}`;
          if (cookieOptions.maxAge)
            cookieString += `; max-age=${cookieOptions.maxAge}`;
          if (cookieOptions.sameSite)
            cookieString += `; samesite=${cookieOptions.sameSite}`;
          if (cookieOptions.secure) cookieString += "; secure";

          document.cookie = cookieString;
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
