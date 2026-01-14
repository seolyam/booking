import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import Link from "next/link";
import { db } from "@/db";
import { budgets, budgetItems, users, auditLogs, reviewChecklists } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import ReviewDecisionModal from "@/components/ReviewDecisionModal";
import ReviewChecklist from "@/components/ReviewChecklist";

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
  let checklist: typeof reviewChecklists.$inferSelect[] = [];
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
          eq(reviewChecklists.reviewer_id, appUser.id)
        )
      );
  } catch {
    // Table may not exist yet - gracefully handle
    console.warn("Review checklists table not found");
  }

  // Create a map for quick lookup
  const checklistMap = new Map(checklist.map((c) => [c.item_key, c.is_checked]));

  // Group items by quarter
  const itemsByQuarter = new Map<string, typeof items>();
  for (const item of items) {
    if (!itemsByQuarter.has(item.quarter)) {
      itemsByQuarter.set(item.quarter, []);
    }
    itemsByQuarter.get(item.quarter)!.push(item);
  }

  const quarterOrder = ["Q1", "Q2", "Q3", "Q4"];
  const sortedQuarters = Array.from(itemsByQuarter.keys()).sort(
    (a, b) => quarterOrder.indexOf(a) - quarterOrder.indexOf(b)
  );

  const statusLabelMap: Record<string, string> = {
    draft: "Draft",
    submitted: "Pending Review",
    verified: "Verified",
    verified_by_reviewer: "Verified",
    revision_requested: "Revision Requested",
    rejected: "Rejected",
    approved: "Approved",
  };

  const statusColorMap: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    submitted: "bg-yellow-100 text-yellow-800",
    verified: "bg-blue-100 text-blue-800",
    verified_by_reviewer: "bg-blue-100 text-blue-800",
    revision_requested: "bg-orange-100 text-orange-800",
    rejected: "bg-red-100 text-red-800",
    approved: "bg-green-100 text-green-800",
  };

  const typeLabel = budget.budget_type === "capex" ? "CapEx" : "OpEx";

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/reviewer"
              className="text-gray-500 hover:text-gray-700"
            >
              ←
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Review Budget Request
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Review and verify budget details before forwarding to approver
              </p>
            </div>
          </div>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            statusColorMap[budget.status] || "bg-gray-100 text-gray-800"
          }`}
        >
          {statusLabelMap[budget.status] || budget.status}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Budget Overview Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Budget Overview
            </h2>

            {/* First Item Description */}
            {items.length > 0 && (
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {items[0].description}
                </h3>
                <div className="text-sm text-gray-500">
                  {typeLabel} • {requester?.department || ""}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b border-gray-200">
              <div>
                <div className="text-sm font-medium text-gray-600">
                  Requester
                </div>
                <div className="text-gray-900 font-semibold">
                  {requester?.full_name || requester?.email || "Unknown"}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">
                  Total Amount
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatPhp(budget.total_amount)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">
                  Submitted
                </div>
                <div className="text-gray-900 font-semibold">
                  {formatDate(budget.created_at)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Type</div>
                <div className="text-gray-900 font-semibold">{typeLabel}</div>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Cost Breakdown
            </h2>

            {sortedQuarters.length > 0 ? (
              <div className="space-y-6">
                {sortedQuarters.map((quarter) => {
                  const quarterItems = itemsByQuarter.get(quarter) || [];
                  const quarterTotal = quarterItems.reduce(
                    (sum, item) => sum + Number(item.total_cost),
                    0
                  );

                  return (
                    <div key={quarter}>
                      <h3 className="font-semibold text-gray-900 mb-3">
                        {quarter}
                      </h3>
                      <div className="space-y-2 ml-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                        {quarterItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between text-sm"
                          >
                            <div className="flex-1">
                              <div className="text-gray-900">
                                {item.description}
                              </div>
                              <div className="text-xs text-gray-500">
                                Qty: {item.quantity} × {formatPhp(item.unit_cost)}
                              </div>
                            </div>
                            <div className="text-gray-900 font-semibold whitespace-nowrap ml-4">
                              {formatPhp(item.total_cost)}
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm font-semibold pt-2 mt-2 border-t border-gray-200">
                          <div className="text-gray-700">{quarter} Total</div>
                          <div className="text-gray-900">
                            {formatPhp(quarterTotal)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-500 text-sm">No items found</div>
            )}
          </div>

          {/* Timeline & Milestones */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Project Timeline & Milestones
            </h2>

            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-600">
                  Start Date
                </div>
                <div className="text-gray-900 font-semibold">
                  {formatDate(budget.created_at)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">End Date</div>
                <div className="text-gray-900 font-semibold">
                  {new Date(budget.created_at.getTime() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString("en-PH")}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-2">
                  Milestones
                </div>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Planning & Procurement - Q1</li>
                  <li>Implementation - Q2-Q3</li>
                  <li>Testing & Commissioning - Q4</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Variance Explanation */}
          {budget.variance_explanation && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Variance Explanation
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {budget.variance_explanation}
              </p>
            </div>
          )}

          {/* Review History */}
          {logs.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Review History
              </h2>
              <div className="space-y-3">
                {logs
                  .sort(
                    (a, b) =>
                      new Date(b.timestamp).getTime() -
                      new Date(a.timestamp).getTime()
                  )
                  .map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 pb-3 border-b border-gray-100 last:border-0 last:pb-0"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {log.action
                              .split("_")
                              .map(
                                (w) => w.charAt(0).toUpperCase() + w.slice(1)
                              )
                              .join(" ")}
                          </span>
                          <span className="text-xs text-gray-500">
                            by {actorMap.get(log.actor_id) || "Unknown"}
                          </span>
                        </div>
                        {log.comment && (
                          <p className="text-sm text-gray-600 mt-1">
                            {log.comment}
                          </p>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(log.timestamp).toLocaleString("en-PH")}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Review Decision Panel */}
        <div className="col-span-1">
          <div className="sticky top-6 space-y-6">
            {/* Review Checklist */}
            <ReviewChecklist
              budgetId={budget.id}
              items={[
                {
                  key: "documented_costs",
                  label: "All costs are documented",
                  defaultChecked:
                    checklistMap.get("documented_costs") || false,
                },
                {
                  key: "reasonable_costs",
                  label: "Unit Costs are reasonable",
                  defaultChecked: checklistMap.get("reasonable_costs") || false,
                },
                {
                  key: "realistic_timeline",
                  label: "Timeline is realistic",
                  defaultChecked: checklistMap.get("realistic_timeline") || false,
                },
                {
                  key: "variance_clear",
                  label: "Variance explanation is clear",
                  defaultChecked: checklistMap.get("variance_clear") || false,
                },
                {
                  key: "departmental_goals",
                  label: "Aligns with departmental goals",
                  defaultChecked:
                    checklistMap.get("departmental_goals") || false,
                },
                {
                  key: "budget_policies",
                  label: "Complies with budget policies",
                  defaultChecked: checklistMap.get("budget_policies") || false,
                },
              ]}
            />

            {/* Review Decision Modal */}
            <ReviewDecisionModal budgetId={budget.id} budgetStatus={budget.status} />
          </div>
        </div>
      </div>
    </div>
  );
}
