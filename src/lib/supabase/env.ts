type SupabaseEnv = {
  url: string;
  anonKey: string;
};

/**
 * Gets Supabase environment variables.
 * During build time (when vars might not exist), returns empty strings
 * to allow static analysis. At runtime, throws if missing.
 */
export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Preferred variable name in this repo (Supabase "anon public" key)
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    // Fallback to the name you provided in context/supabase.md
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  // During build time, env vars may not be available
  // Return empty strings to allow build to complete
  // Runtime will fail appropriately when actually used
  if (!url || !anonKey) {
    // Check if we're in a browser context (runtime) vs build
    if (typeof window !== "undefined") {
      if (!url) {
        throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
      }
      if (!anonKey) {
        throw new Error(
          "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY (preferred) or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY (fallback)",
        );
      }
    }
    // Build time - return placeholders that won't be used
    return { url: url ?? "", anonKey: anonKey ?? "" };
  }

  return { url, anonKey };
}
