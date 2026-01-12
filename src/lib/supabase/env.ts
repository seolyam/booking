type SupabaseEnv = {
  url: string;
  anonKey: string;
};

export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Preferred variable name in this repo (Supabase "anon public" key)
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    // Fallback to the name you provided in context/supabase.md
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY (preferred) or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY (fallback)"
    );
  }

  return { url, anonKey };
}
