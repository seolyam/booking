import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/server";
import { getOrCreateAppUserFromAuthUser, getDisplayProfileFromAuthUser } from "@/lib/appUser";
import DashboardShell from "./_components/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
const authUser = await getAuthUser();
if (!authUser) redirect("/login");

const appUser = await getOrCreateAppUserFromAuthUser({
  id: authUser.id,
  email: authUser.email ?? null,
  user_metadata: authUser.user_metadata ?? null,
});

if (appUser.role !== "superadmin" && appUser.approvalStatus !== "approved") {
  redirect("/pending");
}
// Redirect requester away from dashboard overview
if (appUser.role === "requester") {
  redirect("/dashboard/requests");
}


  const profile = getDisplayProfileFromAuthUser({
    email: authUser.email ?? null,
    user_metadata: authUser.user_metadata ?? null,
  });

  return (
    <DashboardShell profile={profile} role={appUser.role}>
      {children}
    </DashboardShell>
  );
}
