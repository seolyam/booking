import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import RequesterDashboard from "./_components/RequesterDashboard";
import ApproverDashboard, {
  type ApproverDashboardRow,
} from "./_components/ApproverDashboard";
import SuperadminDashboard from "./_components/SuperadminDashboard";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import {
  formatPhp,
  formatDateShort,
  getRequesterDashboardData,
  getApproverDashboardData,
  getSuperadminDashboardData,
} from "@/lib/dashboardData";

// Force dynamic rendering since dashboard data is user-specific
export const dynamic = "force-dynamic";

// Revalidate data every 30 seconds for freshness
export const revalidate = 30;

export default async function DashboardPage() {
  const user = await getAuthUser();

  if (!user) {
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

  // Superadmin dashboard
  if (appUser.role === "superadmin") {
    const data = await getSuperadminDashboardData();

    const firstItemByBudgetId = new Map<string, string>();
    for (const it of data.requesterItems) {
      if (!firstItemByBudgetId.has(it.budget_id)) {
        firstItemByBudgetId.set(it.budget_id, it.description);
      }
    }

    const reviewerFirstItemByBudgetId = new Map<string, string>();
    for (const it of data.reviewerData.items) {
      if (!reviewerFirstItemByBudgetId.has(it.budget_id)) {
        reviewerFirstItemByBudgetId.set(it.budget_id, it.description);
      }
    }

    const approverFirstItemByBudgetId = new Map<string, string>();
    for (const it of data.approverData.items) {
      if (!approverFirstItemByBudgetId.has(it.budget_id)) {
        approverFirstItemByBudgetId.set(it.budget_id, it.description);
      }
    }

    // Calculate requester stats
    const requesterNonDraft = data.allBudgets.filter(
      (b) => b.status !== "draft",
    );
    const requesterTotalSubmitted = requesterNonDraft.length;
    const requesterPendingReview = data.allBudgets.filter(
      (b) =>
        b.status === "submitted" ||
        b.status === "verified" ||
        b.status === "verified_by_reviewer",
    ).length;
    const requesterApproved = data.allBudgets.filter(
      (b) => b.status === "approved",
    ).length;
    const requesterNeedsRevision = data.allBudgets.filter(
      (b) => b.status === "revision_requested",
    ).length;

    const requesterRows = data.allBudgets.slice(0, 4).map((b) => {
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

      return {
        budgetId: b.id,
        displayId: `BUD-${b.budget_number}`,
        projectName: firstItemByBudgetId.get(b.id) ?? "Budget Request",
        projectSub: "",
        type,
        amount: formatPhp(b.total_amount),
        statusLabel,
        dateLabel: formatDateShort(b.created_at),
        actionLabel: "View" as const,
        actionHref: `/dashboard/requests/${b.id}`,
      };
    });

    // Reviewer stats
    const reviewerTotalSubmitted = data.reviewerData.reviewerBudgets.length;
    const reviewerPendingReview = data.reviewerData.reviewerBudgets.filter(
      (b) =>
        b.status === "submitted" ||
        b.status === "verified_by_reviewer" ||
        b.status === "revision_requested",
    ).length;

    const reviewerRows = data.reviewerData.reviewerBudgetsWithDept.map((b) => {
      const type =
        b.budget_type === "capex" ? ("CapEx" as const) : ("OpEx" as const);
      return {
        budgetId: b.id,
        displayId: `BUD-${String(b.budget_number).padStart(3, "0")}`,
        projectName: reviewerFirstItemByBudgetId.get(b.id) ?? "Budget Request",
        projectSub: b.department ?? "",
        type,
        amount: formatPhp(b.total_amount),
        statusLabel: "Pending" as const,
        dateLabel: formatDateShort(b.created_at),
        actionLabel: "View" as const,
        actionHref: `/dashboard/reviewer/${b.id}`,
      };
    });

    // Approver rows
    const approverRows: ApproverDashboardRow[] =
      data.approverData.recentProposals.map((b) => {
        const type =
          b.budget_type === "capex" ? ("CapEx" as const) : ("OpEx" as const);
        const statusLabel =
          b.status === "approved"
            ? ("Approved" as const)
            : b.status === "rejected"
              ? ("Rejected" as const)
              : ("Pending" as const);

        return {
          budgetId: b.id,
          displayId: `BUD-${String(b.budget_number).padStart(3, "0")}`,
          projectName:
            approverFirstItemByBudgetId.get(b.id) ?? "Budget Request",
          projectSub: b.department ?? "",
          type,
          amount: formatPhp(b.total_amount),
          statusLabel,
          dateLabel: formatDateShort(b.created_at),
        };
      });

    return (
      <SuperadminDashboard
        requesterStats={{
          totalSubmitted: requesterTotalSubmitted,
          pendingReview: requesterPendingReview,
          approved: requesterApproved,
          needsRevision: requesterNeedsRevision,
        }}
        requesterRows={requesterRows}
        reviewerStats={{
          totalSubmitted: reviewerTotalSubmitted,
          pendingReview: reviewerPendingReview,
          approved: 0,
        }}
        reviewerRows={reviewerRows}
        approverStats={{
          totalApproved: data.approverData.totalApproved,
          awaitingApproval: data.approverData.awaitingApproval,
          approvedThisMonth: data.approverData.approvedThisMonth,
          rejected: data.approverData.rejected,
        }}
        approverRows={approverRows}
        pendingUserCount={data.pendingUserCount}
      />
    );
  }

  // Approver dashboard
  if (appUser.role === "approver") {
    const data = await getApproverDashboardData();

    const firstItemByBudgetId = new Map<string, string>();
    for (const it of data.items) {
      if (!firstItemByBudgetId.has(it.budget_id)) {
        firstItemByBudgetId.set(it.budget_id, it.description);
      }
    }

    const rows: ApproverDashboardRow[] = data.recentProposals.map((b) => {
      const type =
        b.budget_type === "capex" ? ("CapEx" as const) : ("OpEx" as const);
      const statusLabel =
        b.status === "approved"
          ? ("Approved" as const)
          : b.status === "rejected"
            ? ("Rejected" as const)
            : ("Pending" as const);

      return {
        budgetId: b.id,
        displayId: `BUD-${String(b.budget_number).padStart(3, "0")}`,
        projectName: firstItemByBudgetId.get(b.id) ?? "Budget Request",
        projectSub: b.department ?? "",
        type,
        amount: formatPhp(b.total_amount),
        statusLabel,
        dateLabel: formatDateShort(b.created_at),
      };
    });

    return (
      <ApproverDashboard
        stats={{
          totalApproved: data.totalApproved,
          awaitingApproval: data.awaitingApproval || 1,
          approvedThisMonth: data.approvedThisMonth,
          rejected: data.rejected,
        }}
        rows={rows}
      />
    );
  }

  // Default to requester
  if (appUser.role !== "requester") {
    return (
      <div>
        <div className="text-gray-900 font-semibold">Dashboard</div>
        <div className="text-sm text-gray-500">Role: {appUser.role}</div>
      </div>
    );
  }

  const data = await getRequesterDashboardData(appUser.id);

  const firstItemByBudgetId = new Map<string, string>();
  for (const it of data.items) {
    if (!firstItemByBudgetId.has(it.budget_id)) {
      firstItemByBudgetId.set(it.budget_id, it.description);
    }
  }

  const nonDraft = data.myBudgets.filter((b) => b.status !== "draft");
  const totalSubmitted = nonDraft.length;
  const pendingReview = data.myBudgets.filter(
    (b) =>
      b.status === "submitted" ||
      b.status === "verified" ||
      b.status === "verified_by_reviewer",
  ).length;
  const approved = data.myBudgets.filter((b) => b.status === "approved").length;
  const needsRevision = data.myBudgets.filter(
    (b) => b.status === "revision_requested",
  ).length;

  const recent = data.myBudgets.slice(0, 4);
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
    const isRevisionRequested = b.status === "revision_requested";
    const actionLabel = isRevisionRequested
      ? ("Edit" as const)
      : ("View" as const);
    const actionHref = isRevisionRequested
      ? `/dashboard/budget/edit/${b.id}`
      : `/dashboard/requests/${b.id}`;

    return {
      budgetId: b.id,
      displayId: `BUD-${b.budget_number}`,
      projectName,
      projectSub: appUser.department,
      type,
      amount: formatPhp(b.total_amount),
      statusLabel,
      dateLabel: formatDateShort(b.created_at),
      actionLabel,
      actionHref,
    };
  });

  return (
    <RequesterDashboard
      stats={{ totalSubmitted, pendingReview, approved, needsRevision }}
      rows={rows}
    />
  );
}
