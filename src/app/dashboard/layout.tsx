import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import RequesterShell from "./_components/RequesterShell";
import {
  getDisplayProfileFromAuthUser,
  getOrCreateAppUserFromAuthUser,
} from "@/lib/appUser";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const appUser = await getOrCreateAppUserFromAuthUser({
    id: user.id,
    email: user.email ?? null,
    user_metadata: (user.user_metadata ?? null) as Record<
      string,
      unknown
    > | null,
  });

  if (appUser.role === "requester") {
    const profile = getDisplayProfileFromAuthUser({
      email: user.email ?? null,
      user_metadata: (user.user_metadata ?? null) as Record<
        string,
        unknown
      > | null,
    });

    // Default active state is "dashboard"; pages can override by rendering their own shell if needed.
    return (
      <RequesterShell profile={profile} active="dashboard">
        {children}
      </RequesterShell>
    );
  }

  return <>{children}</>;
}
