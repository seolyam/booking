import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, requests } from "@/db/schema";
import { eq, or, and } from "drizzle-orm";
import Link from "next/link";
import ApprovalsTabs from "./_components/ApprovalsTabs";
import UserApprovalsList from "./_components/UserApprovalsList";
import RequestApprovalsList from "./_components/RequestApprovalsList";

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

  // Fetch pending/rejected users ONLY if superadmin
  let pendingUsers: Awaited<ReturnType<typeof db.query.users.findMany>> = [];
  if (appUser.role === "superadmin") {
    pendingUsers = await db.query.users.findMany({
      where: or(
        eq(users.approval_status, "pending"),
        eq(users.approval_status, "rejected"),
      ),
      orderBy: (users, { desc }) => [desc(users.created_at)],
    });
  }

  // Fetch 'reviewed' requests (pending final approval)
  const pendingRequests = await db.query.requests.findMany({
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
  });

  // Transform data to match component expectations
  const usersForList = pendingUsers.map(u => ({
    ...u,
    rejection_reason: u.rejection_reason || null,
  }));

  const requestsForList = pendingRequests.map(r => ({
    id: r.id,
    title: r.title,
    category: r.category,
    priority: r.priority,
    status: r.status,
    created_at: r.created_at,
    requester: r.requester,
    branch: r.branch,
    form_data: r.form_data as Record<string, unknown>,
  }));


  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Approvals</h1>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          ← Back to dashboard
        </Link>
      </div>

      <ApprovalsTabs
        userApprovals={<UserApprovalsList users={usersForList} />}
        requestApprovals={<RequestApprovalsList requests={requestsForList} />}
        showUserApprovals={appUser.role === "superadmin"}
      />
    </div>
  );
}
