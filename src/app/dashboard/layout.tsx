import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import DashboardShell from "./_components/DashboardShell";
import {
  getDisplayProfileFromAuthUser,
  getOrCreateAppUserFromAuthUser,
} from "@/lib/appUser";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getAuthUser();

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

  // Superadmins bypass approval checks
  if (appUser.role !== "superadmin" && appUser.approvalStatus !== "approved") {
    redirect("/dashboard/pending");
  }

  const profile = getDisplayProfileFromAuthUser({
    email: user.email ?? null,
    user_metadata: (user.user_metadata ?? null) as Record<
      string,
      unknown
    > | null,
  });

  // Use the unified shell for all roles so the dashboard UI is consistent.
  // Superadmins get an expanded nav (requester + admin features).
  return (
    <DashboardShell profile={profile} role={appUser.role}>
      {children}
    </DashboardShell>
  );
}
