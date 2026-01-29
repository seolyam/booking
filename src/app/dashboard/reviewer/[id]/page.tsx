import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import Link from "next/link";
import { db } from "@/db";
import {
  auditLogs,
  budgets,
  budgetItems,
  users,
  reviewChecklists,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import ReviewPageClient from "./ReviewPageClient";
import BudgetComparisonAnalysis from "@/app/dashboard/_components/BudgetComparisonAnalysis";
import { Calendar, AlertCircle, ChevronLeft, Bell, Clock } from "lucide-react";

// Force dynamic rendering - requires auth and DB access
export const dynamic = "force-dynamic";

function formatPhp(amount: string | number) {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "₱0";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function displayName(fullName?: string | null, email?: string | null) {
  if (fullName && fullName.trim()) return fullName.trim();
  if (!email) return "Unknown";
  const local = email.split("@")[0] ?? email;
  const cleaned = local.replace(/[._-]+/g, " ");
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function ReviewBudgetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  // Get budget details
  const budgetData = await db
    .select({
      id: budgets.id,
      budget_type: budgets.budget_type,
      status: budgets.status,
      total_amount: budgets.total_amount,
      variance_explanation: budgets.variance_explanation,
      created_at: budgets.created_at,
      user_id: budgets.user_id,
      start_date: budgets.start_date,
      end_date: budgets.end_date,
    })
    .from(budgets)
    .where(eq(budgets.id, id))
    .limit(1);

  if (!budgetData || budgetData.length === 0) {
    redirect("/dashboard/reviewer");
  }

  const budget = budgetData[0];

  // Mark as reviewed-on-open for this reviewer (idempotent)
  let hasReviewOpened = false;
  try {
    const existingOpened = await db
      .select({ id: auditLogs.id })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.budget_id, budget.id),
          eq(auditLogs.actor_id, appUser.id),
          eq(auditLogs.action, "review_opened"),
        ),
      )
      .limit(1);

    if (existingOpened.length > 0) {
      hasReviewOpened = true;
    } else {
      await db.insert(auditLogs).values({
        budget_id: budget.id,
        actor_id: appUser.id,
        action: "review_opened",
        previous_status: budget.status,
        new_status: budget.status,
        comment: "Opened review",
      });
      hasReviewOpened = true;
    }
  } catch {
    // If audit log insert fails for any reason, do not block the review UI.
    hasReviewOpened = false;
  }

  // Get requester info
  const requesterData = await db
    .select({
      id: users.id,
      email: users.email,
      department: users.department,
      full_name: users.full_name,
    })
    .from(users)
    .where(eq(users.id, budget.user_id))
    .limit(1);

  const requester = requesterData?.[0];

  // Get budget items
  const items = await db
    .select({
      id: budgetItems.id,
      description: budgetItems.description,
      quantity: budgetItems.quantity,
      unit_cost: budgetItems.unit_cost,
      total_cost: budgetItems.total_cost,
      quarter: budgetItems.quarter,
    })
    .from(budgetItems)
    .where(eq(budgetItems.budget_id, budget.id));

  // Get review checklist for this reviewer
  let checklist: (typeof reviewChecklists.$inferSelect)[] = [];
  try {
    checklist = await db
      .select({
        id: reviewChecklists.id,
        budget_id: reviewChecklists.budget_id,
        reviewer_id: reviewChecklists.reviewer_id,
        item_key: reviewChecklists.item_key,
        item_label: reviewChecklists.item_label,
        is_checked: reviewChecklists.is_checked,
        created_at: reviewChecklists.created_at,
        updated_at: reviewChecklists.updated_at,
      })
      .from(reviewChecklists)
      .where(
        and(
          eq(reviewChecklists.budget_id, budget.id),
          eq(reviewChecklists.reviewer_id, appUser.id),
        ),
      );
  } catch {
    // Table may not exist yet - gracefully handle
    console.warn("Review checklists table not found");
  }

  // Create a map for quick lookup
  const checklistMap = new Map(
    checklist.map((c) => [c.item_key, c.is_checked]),
  );

  // Fetch similar approved budgets for comparison
  const similarBudgets = await db
    .select({
      id: budgets.id,
      total_amount: budgets.total_amount,
      created_at: budgets.created_at,
      user_id: budgets.user_id,
    })
    .from(budgets)
    .where(
      and(
        eq(budgets.budget_type, budget.budget_type),
        eq(budgets.status, "approved"),
      ),
    )
    .limit(5);

  // Filter by department (need to join but we have user_id)
  const similarActorIds = [...new Set(similarBudgets.map((b) => b.user_id))];
  const similarUsers =
    similarActorIds.length > 0
      ? await db
        .select({
          id: users.id,
          full_name: users.full_name,
          department: users.department,
        })
        .from(users)
        .where(
          and(
            inArray(users.id, similarActorIds),
            eq(users.department, requester?.department || "Finance"),
          ),
        )
      : [];

  const similarUserMap = new Map(similarUsers.map((u) => [u.id, u]));
  const filteredSimilar = similarBudgets.filter((b) =>
    similarUserMap.has(b.user_id),
  );

  // Fetch descriptions for similar budgets (simplified: just first item)
  const similarBudgetIds = filteredSimilar.map((b) => b.id);
  const similarItems =
    similarBudgetIds.length > 0
      ? await db
        .select({
          budget_id: budgetItems.budget_id,
          description: budgetItems.description,
        })
        .from(budgetItems)
        .where(inArray(budgetItems.budget_id, similarBudgetIds))
      : [];

  const similarItemsMap = new Map();
  similarItems.forEach((it) => {
    if (!similarItemsMap.has(it.budget_id)) {
      similarItemsMap.set(it.budget_id, it.description);
    }
  });

  const comparisonData = filteredSimilar.map((b) => ({
    id: b.id,
    name: similarItemsMap.get(b.id) || "Previous Project",
    amount: b.total_amount,
    date: formatDate(b.created_at),
    requester: similarUserMap.get(b.user_id)?.full_name || "Unknown",
    profit: "5%", // Example placeholder as requested
  }));

  const historicalAmounts = comparisonData.map((d) => Number(d.amount));
  const historicalAverage =
    historicalAmounts.length > 0
      ? historicalAmounts.reduce((a, b) => a + b, 0) / historicalAmounts.length
      : 275000; // Placeholder as in image if none found

  const historicalMin =
    historicalAmounts.length > 0 ? Math.min(...historicalAmounts) : 170500;
  const historicalMax =
    historicalAmounts.length > 0 ? Math.max(...historicalAmounts) : 340650;

  const statusLabelMap: Record<string, string> = {
    draft: "Draft",
    submitted: "Pending Review",
    verified: "Verified",
    verified_by_reviewer: "Reviewed",
    revision_requested: "Revision Requested",
    rejected: "Rejected",
    approved: "Approved",
  };

  const displayStatusLabel =
    budget.status === "submitted" && hasReviewOpened
      ? "Reviewed"
      : statusLabelMap[budget.status] || budget.status;

  const typeLabel = budget.budget_type === "capex" ? "CapEx" : "OpEx";

  const statusCardClass = (() => {
    const s = budget.status;
    if (s === "submitted")
      return "bg-yellow-50 text-yellow-600 border-yellow-100";
    if (s === "verified" || s === "approved")
      return "bg-green-50 text-green-600 border-green-100";
    if (s === "revision_requested")
      return "bg-orange-50 text-orange-600 border-orange-100";
    if (s === "rejected") return "bg-red-50 text-red-600 border-red-100";
    return "bg-gray-50 text-gray-600 border-gray-100";
  })();

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/reviewer"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-900" />
            </Link>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">
              Review Budget Request
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-12">
            Review and verify budget details before forwarding to approver
          </p>
        </div>
        <button className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <Bell className="w-5 h-5 text-gray-900" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-10">
          {/* Project Info Card */}
          <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative overflow-hidden">
            <div
              className={`absolute top-10 right-10 flex items-center gap-2 px-4 py-2 rounded-full border ${statusCardClass}`}
            >
              <Clock className="w-4 h-4" />
              <span className="text-sm font-bold">{displayStatusLabel}</span>
            </div>

            <div className="space-y-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-bold text-gray-900 leading-tight">
                    {items[0]?.description || "Budget Request"}
                  </h2>
                  <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                    {typeLabel}
                  </span>
                </div>
                <p className="text-gray-400 font-bold text-sm tracking-wide">
                  PROJ-{budget.id.slice(0, 8).toUpperCase()} -{" "}
                  {requester?.department || ""}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-y-10 gap-x-12">
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    Requester
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {displayName(requester?.full_name, requester?.email)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    Total amount
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatPhp(budget.total_amount)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    Submitted
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatDate(budget.created_at)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    Timeline
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {budget.start_date || budget.end_date ? (
                      <>
                        {budget.start_date
                          ? formatDate(budget.start_date)
                          : "Not set"}{" "}
                        to{" "}
                        {budget.end_date
                          ? formatDate(budget.end_date)
                          : "Not set"}
                      </>
                    ) : (
                      "No timeline set."
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-lg font-bold text-gray-900">
                ₱ Cost Breakdown
              </span>
            </div>

            {items.length > 0 ? (
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-gray-50/50 rounded-xl flex justify-between items-center"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-gray-900">
                        {item.description}
                      </p>
                      <p className="text-xs text-gray-500 font-medium">
                        Equipment | Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-gray-900">
                      {formatPhp(item.total_cost)}
                    </p>
                  </div>
                ))}
                <div className="flex justify-end pt-4 mt-2">
                  <p className="text-lg font-bold text-gray-900">
                    Total:{" "}
                    <span className="font-bold ml-1">
                      {formatPhp(budget.total_amount)}
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-sm italic">No items found</div>
            )}
          </div>

          {/* Project Timeline & Milestones */}
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-bold text-gray-900">
                Project timeline
              </h2>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between p-3 bg-gray-50/50 rounded-xl">
                <span className="text-sm text-gray-500 font-bold tracking-tight">
                  Start Date
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {budget.start_date
                    ? formatDate(budget.start_date)
                    : "Not set"}
                </span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50/50 rounded-xl">
                <span className="text-sm text-gray-500 font-bold tracking-tight">
                  End Date
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {budget.end_date ? formatDate(budget.end_date) : "Not set"}
                </span>
              </div>
            </div>
          </div>

          {/* Variance Explanation */}
          {budget.variance_explanation && (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-bold text-gray-900">
                  Variance Explanation
                </h2>
              </div>
              <p className="text-sm text-gray-600 font-medium italic leading-relaxed">
                &quot;{budget.variance_explanation}&quot;
              </p>
            </div>
          )}

          {/* Budget Comparison Analysis */}
          <BudgetComparisonAnalysis
            currentAmount={Number(budget.total_amount)}
            historicalAverage={historicalAverage}
            historicalMin={historicalMin}
            historicalMax={historicalMax}
            similarProjects={comparisonData}
            departmentName={requester?.department || "Unknown"}
            budgetType={typeLabel}
          />
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4">
          <ReviewPageClient
            budgetId={budget.id}
            budgetStatus={budget.status}
            checklistDefaults={{
              documented_costs: checklistMap.get("documented_costs") || false,
              reasonable_costs: checklistMap.get("reasonable_costs") || false,
              realistic_timeline:
                checklistMap.get("realistic_timeline") || false,
              variance_clear: checklistMap.get("variance_clear") || false,
              departmental_goals:
                checklistMap.get("departmental_goals") || false,
              budget_policies: checklistMap.get("budget_policies") || false,
            }}
          />
        </div>
      </div>
    </div>
  );
}
