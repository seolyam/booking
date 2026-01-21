import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";

export const dynamic = "force-dynamic";

export default async function CallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { code } = await searchParams;

  // Exchange code for session if present (OAuth callback)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      redirect("/login?error=auth_callback_failed");
    }
  }

  // Get the session after exchange or refresh
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login?error=auth_callback_failed");
  }

  // Provision a DB profile on first sign-in (avoids missing /onboard flow)
  await getOrCreateAppUserFromAuthUser({
    id: session.user.id,
    email: session.user.email ?? null,
    user_metadata: (session.user.user_metadata ?? null) as Record<
      string,
      unknown
    > | null,
  });

  redirect("/dashboard");
}
