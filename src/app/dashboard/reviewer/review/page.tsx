import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { db } from "@/db";
import { auditLogs, budgets, budgetItems, users } from "@/db/schema";
import { desc, eq, inArray, and } from "drizzle-orm";
import ReviewerDashboard, {
  type ReviewerDashboardRow,
} from "../../_components/ReviewerDashboard";

// Force dynamic rendering - requires auth and DB access
export const dynamic = "force-dynamic";

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

type StatusFilter = "all" | "pending" | "reviewed";

function getStatusFilterFromSearchParam(
  value: string | undefined,
): StatusFilter {
  if (value === "pending" || value === "reviewed") {
    return value;
  }
  return "all";
}

export default async function ReviewerReviewQueuePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const qRaw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const statusRaw = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const activeStatus = getStatusFilterFromSearchParam(statusRaw);

  const user = await getAuthUser();

  if (!user) redirect("/login");

  const appUser = await getOrCreateAppUserFromAuthUser({
    id: user.id,
    email: user.email ?? null,
    user_metadata: (user.user_metadata ?? null) as Record<
      string,
      unknown
    > | null,
  });

  if (appUser.role !== "reviewer" && appUser.role !== "superadmin") {
    redirect("/dashboard");
  }

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
        "verified_by_reviewer",
        "verified",
        "revision_requested",
        "approved",
        "rejected",
      ]),
    )
    .orderBy(desc(budgets.created_at))
    .limit(200);

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

  const reviewedOnOpenBudgetIds = new Set<string>();
  if (budgetIds.length > 0) {
    const opened = await db
      .select({ budget_id: auditLogs.budget_id })
      .from(auditLogs)
      .where(
        and(
          inArray(auditLogs.budget_id, budgetIds),
          eq(auditLogs.actor_id, appUser.id),
          eq(auditLogs.action, "review_opened"),
        ),
      );

    for (const row of opened) reviewedOnOpenBudgetIds.add(row.budget_id);
  }

  const rows: ReviewerDashboardRow[] = reviewQueue.map((b) => {
    const type =
      b.budget_type === "capex" ? ("CapEx" as const) : ("OpEx" as const);

    const isReviewed =
      b.status !== "submitted" || reviewedOnOpenBudgetIds.has(b.id);

    const isReviewableStatus =
      b.status === "submitted" ||
      b.status === "revision_requested" ||
      b.status === "verified_by_reviewer";

    const shouldShowView = isReviewed;

    const statusLabel = (() => {
      return isReviewed ? ("Reviewed" as const) : ("Pending" as const);
    })();

    const actionLabel = shouldShowView ? "View" : "Review";

    const actionHref = isReviewableStatus
      ? `/dashboard/reviewer/${b.id}`
      : `/dashboard/reviewer/${b.id}/tracking`;

    return {
      budgetId: b.id,
      displayId:
        (b as { project_code?: string | null }).project_code ??
        `BUD-${b.budget_number}`,
      projectName: firstItemByBudgetId.get(b.id) ?? "Budget Request",
      projectSub: b.department ?? "",
      type,
      amount: formatPhp(b.total_amount),
      statusLabel,
      dateLabel: formatDateShort(b.created_at),
      actionLabel,
      actionHref,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="p-2 rounded-full hover:bg-gray-100 text-gray-900 transition-colors"
          aria-label="Back to dashboard"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="text-xl font-semibold text-gray-900">
            Budget Review
          </div>
          <div className="text-sm text-gray-500">
            Review and verify budget details before forwarding to approver
          </div>
        </div>
      </div>

      {/* Reuse the same table UI; stats are less relevant on the queue page */}
      <ReviewerDashboard
        stats={{
          reviewedToday: 0,
          pendingReview: 0,
          awaitingApproval: 0,
          needsRevision: 0,
        }}
        showStats={false}
        rows={rows}
        activeFilter={activeStatus}
        searchQuery={qRaw ?? ""}
        enableClientFiltering
      />
    </div>
  );
}
