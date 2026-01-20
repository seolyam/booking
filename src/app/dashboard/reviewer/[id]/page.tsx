import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import Link from "next/link";
import { db } from "@/db";
import {
  budgets,
  budgetItems,
  budgetMilestones,
  users,
  reviewChecklists,
  auditLogs,
} from "@/db/schema";
import { eq, and, inArray, asc } from "drizzle-orm";
import ReviewPageClient from "./ReviewPageClient";
import BudgetComparisonAnalysis from "@/app/dashboard/_components/BudgetComparisonAnalysis";
import { Calendar, AlertCircle } from "lucide-react";

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

export default async function ReviewBudgetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  const milestones = await db.query.budgetMilestones.findMany({
    where: eq(budgetMilestones.budget_id, budget.id),
    orderBy: [asc(budgetMilestones.created_at)],
  });

  // Get audit logs for this budget
  const logs = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      timestamp: auditLogs.timestamp,
      comment: auditLogs.comment,
      actor_id: auditLogs.actor_id,
    })
    .from(auditLogs)
    .where(eq(auditLogs.budget_id, budget.id));

  // Get actor names for audit logs
  const actorIds = [...new Set(logs.map((l) => l.actor_id))];
  const actorsData =
    actorIds.length === 0
      ? []
      : await db
          .select({
            id: users.id,
            full_name: users.full_name,
          })
          .from(users)
          .where(inArray(users.id, actorIds));

  const actorMap = new Map(actorsData.map((a) => [a.id, a.full_name]));

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

  const statusColorMap: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    submitted: "bg-gray-100 text-gray-800",
    verified: "bg-green-100 text-green-700",
    verified_by_reviewer: "bg-yellow-100 text-yellow-800",
    revision_requested: "bg-orange-100 text-orange-800",
    rejected: "bg-red-100 text-red-800",
    approved: "bg-green-100 text-green-800",
  };

  const typeLabel = budget.budget_type === "capex" ? "CapEx" : "OpEx";

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/reviewer"
            className="text-gray-500 hover:text-gray-700"
          >
            ←
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">
                {items[0]?.description || "Review Budget Request"}
              </h1>
              <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-md text-xs font-semibold">
                {typeLabel}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              PROJ-{budget.id.slice(0, 8).toUpperCase()} -{" "}
              {requester?.department || ""}
            </p>
          </div>
        </div>
        <div
          className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
            statusColorMap[budget.status] || "bg-gray-100 text-gray-800"
          }`}
        >
          {statusLabelMap[budget.status] || budget.status}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="col-span-2 space-y-8">
          {/* Budget Overview (Transparent/Light Background) */}
          <div className="bg-gray-50/50 rounded-2xl p-8 border border-transparent">
            <div className="grid grid-cols-2 gap-y-8 gap-x-12">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-400">Requester</p>
                <p className="text-lg font-bold text-gray-900">
                  {requester?.full_name || requester?.email || "Unknown"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-400">
                  Total amount
                </p>
                <p className="text-2xl font-black text-gray-900">
                  {formatPhp(budget.total_amount)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-400">Submitted</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatDate(budget.created_at)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-400">Timeline</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatDate(budget.start_date ?? budget.created_at)} to{" "}
                  {formatDate(
                    budget.end_date ??
                      new Date(
                        budget.created_at.getTime() +
                          365 * 24 * 60 * 60 * 1000,
                      ),
                  )}
                </p>
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
                    <span className="font-black ml-1">
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
                Project timeline & milestones
              </h2>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between p-3 bg-gray-50/50 rounded-xl">
                <span className="text-sm text-gray-500 font-bold tracking-tight">
                  Start Date
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {formatDate(budget.start_date ?? budget.created_at)}
                </span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50/50 rounded-xl">
                <span className="text-sm text-gray-500 font-bold tracking-tight">
                  End Date
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {formatDate(
                    budget.end_date ??
                      new Date(
                        budget.created_at.getTime() +
                          365 * 24 * 60 * 60 * 1000,
                      ),
                  )}
                </span>
              </div>
            </div>

            <div className="p-5 bg-gray-50/30 rounded-2xl border border-gray-50">
              <p className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider opacity-60">
                Milestones:
              </p>
              {milestones.length === 0 ? (
                <div className="text-sm text-gray-600">No milestones set.</div>
              ) : (
                <ul className="space-y-2">
                  {milestones.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-start gap-2 text-sm font-semibold text-gray-600"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5" />
                      <div className="min-w-0">
                        <div className="truncate">{m.description}</div>
                        {m.target_quarter ? (
                          <div className="text-xs text-gray-500">
                            {m.target_quarter}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
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
                "{budget.variance_explanation}"
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

        {/* Right Sidebar - Review Decision Panel */}
        <div className="col-span-1">
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
