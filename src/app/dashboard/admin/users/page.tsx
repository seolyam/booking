import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUsers, getBranchOptions } from "@/actions/users";
import { UsersClient } from "./_components/UsersClient";

export const dynamic = "force-dynamic";

export default async function ManageUsersPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/login");

  const appUser = await db.query.users.findFirst({
    where: eq(users.id, authUser.id),
    columns: { id: true, role: true },
  });

  // Strictly superadmin-only
  if (appUser?.role !== "superadmin") {
    redirect("/dashboard");
  }

  const [userRows, branchOptions] = await Promise.all([
    getUsers(),
    getBranchOptions(),
  ]);

  return (
    <div className="space-y-6">
      <UsersClient
        rows={userRows}
        branches={branchOptions}
        currentUserId={appUser.id}
      />
    </div>
  );
}
