import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { budgets, budgetItems, users } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import RequesterDashboard from "./_components/RequesterDashboard";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Settings } from "lucide-react";
import Link from "next/link";

function formatPhp(amount: string) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "₱0";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDateShort(d: Date) {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${month}-${day}-${yy}`;
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Layout already redirects unauth users; this is a safety net.
    return null;
  }

  const appUser = await getOrCreateAppUserFromAuthUser({
    id: user.id,
    email: user.email ?? null,
    user_metadata: (user.user_metadata ?? null) as Record<
      string,
      unknown
    > | null,
  });

  // Redirect reviewers to their dedicated dashboard
  if (appUser.role === "reviewer") {
    redirect("/dashboard/reviewer");
  }

  // If not requester, keep the old generic page minimal for now.
  if (appUser.role === "superadmin") {
    const pendingCount = await db.query.users.findMany({
      where: eq(users.approval_status, "pending"),
    });

    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Approvals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Review and approve pending user applications
              </p>
              {pendingCount.length > 0 && (
                <p className="text-2xl font-bold text-green-600">
                  {pendingCount.length} pending
                </p>
              )}
              <Link href="/dashboard/admin/approvals">
                <Button className="bg-[#358334] hover:bg-[#2F5E3D]">
                  View Applications
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Configure system-wide settings and policies
              </p>
              <Button variant="outline" disabled>
                Coming soon
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (appUser.role === "reviewer") {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const reviewedTodayResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.actor_id, appUser.id),
          eq(auditLogs.action, "verify"),
          gte(auditLogs.timestamp, startOfDay)
        )
      );
    const reviewedToday = Number(reviewedTodayResult[0]?.count ?? 0);

    const pendingReviewResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(budgets)
      .where(eq(budgets.status, "submitted"));
    const pendingReview = Number(pendingReviewResult[0]?.count ?? 0);

    const awaitingApprovalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(budgets)
      .where(inArray(budgets.status, ["verified", "verified_by_reviewer"]));
    const awaitingApproval = Number(awaitingApprovalResult[0]?.count ?? 0);

    const needsRevisionResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(budgets)
      .where(eq(budgets.status, "revision_requested"));
    const needsRevision = Number(needsRevisionResult[0]?.count ?? 0);

    const reviewQueue = await db
      .select({
        id: budgets.id,
        budget_number: budgets.budget_number,
        budget_type: budgets.budget_type,
        total_amount: budgets.total_amount,
        status: budgets.status,
        created_at: budgets.created_at,
        department: users.department,
      })
      .from(budgets)
      .leftJoin(users, eq(budgets.user_id, users.id))
      .where(
        inArray(budgets.status, [
          "submitted",
          "verified",
          "verified_by_reviewer",
          "revision_requested",
        ])
      )
      .orderBy(desc(budgets.created_at))
      .limit(20);

    const budgetIds = reviewQueue.map((b) => b.id);
    const items =
      budgetIds.length === 0
        ? []
        : await db
            .select({
              budget_id: budgetItems.budget_id,
              description: budgetItems.description,
            })
            .from(budgetItems)
            .where(inArray(budgetItems.budget_id, budgetIds));

    const firstItemByBudgetId = new Map<string, string>();
    for (const it of items) {
      if (!firstItemByBudgetId.has(it.budget_id)) {
        firstItemByBudgetId.set(it.budget_id, it.description);
      }
    }

    const rows: ReviewerDashboardRow[] = reviewQueue.map((b) => {
      const type =
        b.budget_type === "capex" ? ("CapEx" as const) : ("OpEx" as const);

      const statusLabel =
        b.status === "revision_requested"
          ? ("Revision" as const)
          : b.status === "submitted"
          ? ("Pending" as const)
          : ("Reviewed" as const);

      const projectName = firstItemByBudgetId.get(b.id) ?? "Budget Request";
      const projectSub = b.department ?? "";

      const actionLabel = b.status === "submitted" ? "Review" : "View";

      return {
        budgetId: b.id,
        displayId: `BUD-${b.budget_number}`,
        projectName,
        projectSub,
        type,
        amount: formatPhp(b.total_amount),
        statusLabel,
        dateLabel: formatDateShort(b.created_at),
        actionLabel,
        actionHref: `/dashboard/budget/${b.id}`,
      };
    });

    return (
      <ReviewerDashboard
        stats={{
          reviewedToday,
          pendingReview,
          awaitingApproval,
          needsRevision,
        }}
        rows={rows}
      />
    );
  }

  if (appUser.role !== "requester") {
    return (
      <div>
        <div className="text-gray-900 font-semibold">Dashboard</div>
        <div className="text-sm text-gray-500">Role: {appUser.role}</div>
      </div>
    );
  }

  const myBudgets = await db.query.budgets.findMany({
    where: eq(budgets.user_id, appUser.id),
    orderBy: [desc(budgets.created_at)],
    limit: 50,
  });

  const budgetIds = myBudgets.map((b) => b.id);
  const items =
    budgetIds.length === 0
      ? []
      : await db
          .select({
            budget_id: budgetItems.budget_id,
            description: budgetItems.description,
          })
          .from(budgetItems)
          .where(inArray(budgetItems.budget_id, budgetIds));

  const firstItemByBudgetId = new Map<string, string>();
  for (const it of items) {
    if (!firstItemByBudgetId.has(it.budget_id)) {
      firstItemByBudgetId.set(it.budget_id, it.description);
    }
  }

  const nonDraft = myBudgets.filter((b) => b.status !== "draft");
  const totalSubmitted = nonDraft.length;
  const pendingReview = myBudgets.filter(
    (b) =>
      b.status === "submitted" ||
      b.status === "verified" ||
      b.status === "verified_by_reviewer"
  ).length;
  const approved = myBudgets.filter((b) => b.status === "approved").length;
  const needsRevision = myBudgets.filter(
    (b) => b.status === "revision_requested"
  ).length;

  const recent = myBudgets.slice(0, 4);
  const rows = recent.map((b) => {
    const type =
      b.budget_type === "capex" ? ("CapEx" as const) : ("OpEx" as const);

    const statusLabel =
      b.status === "approved"
        ? ("Approved" as const)
        : b.status === "revision_requested"
        ? ("Revision" as const)
        : b.status === "rejected"
        ? ("Rejected" as const)
        : ("Pending" as const);

    const projectName = firstItemByBudgetId.get(b.id) ?? "Budget Request";
    const projectSub = appUser.department;

    return {
      budgetId: b.id,
      displayId: `BUD-${b.budget_number}`,
      projectName,
      projectSub,
      type,
      amount: formatPhp(b.total_amount),
      statusLabel,
      dateLabel: formatDateShort(b.created_at),
    };
  });

  return (
    <RequesterDashboard
      stats={{ totalSubmitted, pendingReview, approved, needsRevision }}
      rows={rows}
    />
  );
}
