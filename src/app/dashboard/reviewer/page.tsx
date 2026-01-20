import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { auditLogs, budgets, budgetItems, users } from "@/db/schema";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import ReviewerDashboard, {
  type ReviewerDashboardRow,
} from "../_components/ReviewerDashboard";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";

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

export default async function ReviewerDashboardPage() {
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

  if (appUser.role !== "reviewer" && appUser.role !== "superadmin") {
    redirect("/dashboard");
  }

  // Calculate stats
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const reviewedTodayResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.actor_id, appUser.id),
        eq(auditLogs.action, "verify"),
        gte(auditLogs.timestamp, startOfDay),
      ),
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
    .where(eq(budgets.status, "verified"));
  const awaitingApproval = Number(awaitingApprovalResult[0]?.count ?? 0);

  const needsRevisionResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(budgets)
    .where(eq(budgets.status, "revision_requested"));
  const needsRevision = Number(needsRevisionResult[0]?.count ?? 0);

  // Get review queue
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
        "rejected",
      ]),
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

  const rows: ReviewerDashboardRow[] = reviewQueue.map((b, idx) => {
    const type =
      b.budget_type === "capex" ? ("CapEx" as const) : ("OpEx" as const);

    const statusLabel = (() => {
      if (b.status === "revision_requested") return "Revision" as const;
      if (b.status === "rejected") return "Rejected" as const;
      if (b.status === "verified") return "Verified" as const;
      if (b.status === "verified_by_reviewer") return "Reviewed" as const;
      return "Pending" as const;
    })();

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
