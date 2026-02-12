import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, requests } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import Link from "next/link";
import UserApprovalsList from "./_components/UserApprovalsList";

// Force dynamic rendering - requires auth and DB access
export const dynamic = "force-dynamic";

export default async function AdminApprovalsPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const appUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  });

  if (!appUser || (appUser.role !== "superadmin" && appUser.role !== "admin")) {
    redirect("/dashboard");
  }

  // Fetch pending/rejected users AND reviewed requests in parallel
  const [pendingUsers, pendingRequests] = await Promise.all([
    // Fetch pending/rejected users ONLY if superadmin
    appUser.role === "superadmin"
      ? db.query.users.findMany({
          where: or(
            eq(users.approval_status, "pending"),
            eq(users.approval_status, "rejected"),
          ),
          orderBy: (users, { desc }) => [desc(users.created_at)],
        })
      : Promise.resolve([]),
    // Fetch 'reviewed' requests (pending final approval)
    db.query.requests.findMany({
      where: eq(requests.status, "reviewed"),
      orderBy: (requests, { desc }) => [desc(requests.created_at)],
      with: {
        requester: {
          columns: {
            full_name: true,
            email: true,
            department: true,
          },
        },
        branch: {
          columns: {
            name: true,
          },
        },
      },
    }),
  ]);

  // Transform data to match component expectations
  const usersForList = pendingUsers.map(u => ({
    ...u,
    rejection_reason: u.rejection_reason || null,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">User Approvals</h1>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          ← Back to dashboard
        </Link>
      </div>

      <UserApprovalsList users={usersForList} />
    </div>
  );
}
