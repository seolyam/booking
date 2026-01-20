import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import Link from "next/link";
import { db } from "@/db";
import { budgets, budgetItems, users } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import ReviewerDashboard, {
  type ReviewerDashboardRow,
} from "../../_components/ReviewerDashboard";

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

export default async function ReviewerReviewQueuePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
        "verified",
        "verified_by_reviewer",
        "revision_requested",
        "rejected",
      ]),
    )
    .orderBy(desc(budgets.created_at))
    .limit(50);

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

    const statusLabel = (() => {
      if (b.status === "revision_requested") return "Revision" as const;
      if (b.status === "rejected") return "Rejected" as const;
      if (b.status === "verified") return "Verified" as const;
      if (b.status === "verified_by_reviewer") return "Reviewed" as const;
      return "Pending" as const;
    })();

    const isPendingDecision =
      b.status === "submitted" || b.status === "verified_by_reviewer";

    const actionLabel = isPendingDecision ? "Review" : "View";

    const actionHref = isPendingDecision
      ? `/dashboard/reviewer/${b.id}`
      : `/dashboard/reviewer/${b.id}/tracking`;

    return {
      budgetId: b.id,
      displayId: `BUD-${b.budget_number}`,
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
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-semibold text-gray-900">
            Budget Review
          </div>
          <div className="text-sm text-gray-500">
            All budgets in the review pipeline
          </div>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-gray-600 hover:underline"
        >
          Back to dashboard
        </Link>
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
      />
    </div>
  );
}
