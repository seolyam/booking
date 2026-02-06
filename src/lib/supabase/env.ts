type SupabaseEnv = {
  url: string;
  anonKey: string;
};

export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (typeof window !== "undefined") {
      if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
      if (!anonKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
    return { url: url ?? "", anonKey: anonKey ?? "" };
  }

  return { url, anonKey };
}
