import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import Link from "next/link";
import { db } from "@/db";
import {
  budgets,
  budgetItems,
  users,
  auditLogs,
  reviewChecklists,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  Calendar,
  AlertCircle,
  ChevronLeft,
  Bell,
  CheckCircle2,
} from "lucide-react";
import BudgetComparisonAnalysis from "@/app/dashboard/_components/BudgetComparisonAnalysis";
import ReviewerAssessmentCard from "../../../_components/ReviewerAssessmentCard";
import QuickStatsCard from "../../../_components/QuickStatsCard";
import ApprovalDecisionButton from "@/app/dashboard/_components/ApprovalDecisionButton";

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

export default async function ApproverReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;

  const decodedId = decodeURIComponent(rawId);
  const looksLikeBudgetNumber =
    /^BUD-\d+$/i.test(decodedId) || /^\d+$/.test(decodedId);
  const budgetNumber = looksLikeBudgetNumber
    ? Number.parseInt(decodedId.replace(/^BUD-/i, ""), 10)
    : null;

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

  if (appUser.role !== "approver" && appUser.role !== "superadmin") {
    redirect("/dashboard");
  }

  // Get budget details
  const budgetSelect = {
    id: budgets.id,
    budget_type: budgets.budget_type,
    status: budgets.status,
    total_amount: budgets.total_amount,
    variance_explanation: budgets.variance_explanation,
    created_at: budgets.created_at,
    user_id: budgets.user_id,
    start_date: budgets.start_date,
    end_date: budgets.end_date,
    budget_number: budgets.budget_number,
  };

  let budgetData =
    budgetNumber !== null
      ? await db
          .select(budgetSelect)
          .from(budgets)
          .where(eq(budgets.budget_number, budgetNumber))
          .limit(1)
      : [];

  if (!budgetData || budgetData.length === 0) {
    // Prefer matching by project_code when the route param is a human display ID.
    budgetData = await db
      .select(budgetSelect)
      .from(budgets)
      // project_code is optional; if it doesn't match, fall back to UUID lookup below.
      .where(eq(budgets.project_code, decodedId))
      .limit(1);
  }

  if (!budgetData || budgetData.length === 0) {
    // Fallback to UUID
    budgetData = await db
      .select(budgetSelect)
      .from(budgets)
      .where(eq(budgets.id, decodedId))
      .limit(1);
  }

  if (!budgetData || budgetData.length === 0) {
    redirect("/dashboard/approver/approvals");
  }

  const budget = budgetData[0];

  // Get requester info
  const requesterData = await db
    .select({
      id: users.id,
      email: users.email,
      department: users.department,
      full_name: users.full_name,
      position: users.position,
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

  // Get reviewer assessment from audit logs
  // Looking for the most recent 'verify' action
  const reviewerLogs = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      comment: auditLogs.comment,
      actor_id: auditLogs.actor_id,
      timestamp: auditLogs.timestamp,
    })
    .from(auditLogs)
    .where(
      and(eq(auditLogs.budget_id, budget.id), eq(auditLogs.action, "verify")),
    )
    .orderBy(desc(auditLogs.timestamp))
    .limit(1);

  let reviewerAssessment = {
    name: "Unknown Reviewer",
    comment: "No assessment provided.",
  };
  if (reviewerLogs.length > 0) {
    const reviewer = await db
      .select({ full_name: users.full_name })
      .from(users)
      .where(eq(users.id, reviewerLogs[0].actor_id))
      .limit(1);

    const reviewerComment = (reviewerLogs[0].comment ?? "").trim();

    reviewerAssessment = {
      name: reviewer[0]?.full_name || "Reviewer",
      comment: reviewerComment || "No assessment provided.",
    };
  }

  // Get review checklist for this budget (from the most recent reviewer who verified it)
  const reviewerId = reviewerLogs[0]?.actor_id;
  let checklist: (typeof reviewChecklists.$inferSelect)[] = [];

  try {
    if (reviewerId) {
      checklist = await db
        .select()
        .from(reviewChecklists)
        .where(
          and(
            eq(reviewChecklists.budget_id, budget.id),
            eq(reviewChecklists.reviewer_id, reviewerId),
          ),
        );
    }
  } catch (err) {
    console.error("Error fetching review checklist:", err);
  }

  const checklistMap = new Map(
    checklist.map((c) => [c.item_key, c.is_checked]),
  );

  // Comparison Data (Mocked similarly to reviewer side for consistency)
  const historicalAverage = 275000;
  const historicalMin = 170500;
  const historicalMax = 340650;
  const comparisonData = [
    {
      id: "1",
      name: "Previous Upgrade",
      amount: "250000",
      date: "01/15/2025",
      requester: "John Doe",
      profit: "5%",
    },
    {
      id: "2",
      name: "System Maintenance",
      amount: "180000",
      date: "11/20/2024",
      requester: "Jane Smith",
      profit: "3%",
    },
  ];

  const typeLabel = budget.budget_type === "capex" ? "CapEx" : "OpEx";

  // Quick Stats Calculations
  const projectDuration =
    budget.start_date && budget.end_date
      ? `${Math.ceil((budget.end_date.getTime() - budget.start_date.getTime()) / (1000 * 60 * 60 * 24 * 30.44))} Months`
      : "Not set";
  const averageItemsCost =
    items.length > 0 ? Number(budget.total_amount) / items.length : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/approver/approvals"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-900" />
            </Link>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">
              Budget approval review
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-12">
            Review and verify budget details before forwarding to approver
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ApprovalDecisionButton
            budgetId={budget.id}
            budgetStatus={budget.status}
            redirectHref="/dashboard/approver/approvals"
          />
          <button className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
            <Bell className="w-5 h-5 text-gray-900" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-10">
          {/* Project Info Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 relative overflow-hidden">
            {/* Status Pill */}
            <div className="absolute top-6 right-6 flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-sm font-bold text-orange-600">Pending</span>
            </div>

            <div className="space-y-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                    {items[0]?.description || "Substation Transformer Upgrade"}
                  </h2>
                  <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                    {typeLabel}
                  </span>
                </div>
                <p className="text-gray-400 font-bold text-sm tracking-wide">
                  PROJ-{budget.id.slice(0, 8).toUpperCase()} -{" "}
                  {requester?.department || "Infrastructure Department"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-y-10 gap-x-12">
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    Requester
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {requester?.full_name || "Lebron James"}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    Total amount
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
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
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-gray-900">
                ₱ Cost Breakdown
              </span>
            </div>

            {items.length > 0 ? (
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-gray-50 rounded-xl flex justify-between items-center"
                  >
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-gray-900">
                        {item.description}
                      </p>
                      <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">
                        Equipment | Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="text-lg font-black text-gray-900">
                      {formatPhp(item.total_cost)}
                    </p>
                  </div>
                ))}
                <div className="flex justify-end pt-6 border-t border-gray-200">
                  <p className="text-xl font-bold text-gray-900">
                    Total:{" "}
                    <span className="font-bold ml-2 text-2xl">
                      {formatPhp(budget.total_amount)}
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-base font-medium italic p-10 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                No budget items found.
              </div>
            )}
          </div>

          {/* Project Timeline & Milestones */}
          <div className="bg-white rounded-4xl p-10 border border-gray-100 shadow-sm space-y-8">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-gray-900" />
              <h2 className="text-2xl font-black text-gray-900">
                Project timeline
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Start Date
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {budget.start_date
                    ? formatDate(budget.start_date)
                    : "Not set"}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  End Date
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {budget.end_date ? formatDate(budget.end_date) : "Not set"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <QuickStatsCard
            projectDuration={projectDuration}
            costItems={items.length}
            averageItemsCost={formatPhp(averageItemsCost)}
          />

          {/* Variance Explanation */}
          {budget.variance_explanation && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Variance Explanation
                </h2>
              </div>
              <div className="space-y-4">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  Requested by {requester?.full_name || "Lebron James"}
                </p>
                <p className="text-sm text-gray-700 font-medium leading-relaxed italic">
                  &ldquo;{budget.variance_explanation}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* Reviewer's Assessment */}
          <ReviewerAssessmentCard
            reviewerName={reviewerAssessment.name}
            comment={reviewerAssessment.comment}
          />

          {/* Budget Comparison Analysis */}
          <BudgetComparisonAnalysis
            currentAmount={Number(budget.total_amount)}
            historicalAverage={historicalAverage}
            historicalMin={historicalMin}
            historicalMax={historicalMax}
            similarProjects={comparisonData}
            departmentName={requester?.department || "Infrastructure"}
            budgetType={typeLabel}
          />
        </div>

        {/* Sidebar Stats */}
        <div className="lg:col-span-4 lg:sticky lg:top-10 space-y-8">
          {/* Review Checklist */}
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-gray-900" />
              <h2 className="text-xl font-bold text-gray-900">
                Review Checklist
              </h2>
            </div>
            <div className="space-y-4">
              {[
                { key: "documented_costs", label: "All costs are documented" },
                { key: "reasonable_costs", label: "Unit Costs are reasonable" },
                { key: "realistic_timeline", label: "Timeline is realistic" },
                {
                  key: "variance_clear",
                  label: "Variance explanation is clear",
                },
                {
                  key: "departmental_goals",
                  label: "Aligns with departmental goals",
                },
                {
                  key: "budget_policies",
                  label: "Complies with budget policies",
                },
              ].map((item) => (
                <div key={item.key} className="flex items-center gap-3 group">
                  <div
                    className={`p-1 rounded-md ${checklistMap.get(item.key) ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-sm font-bold ${checklistMap.get(item.key) ? "text-gray-900" : "text-gray-400"}`}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
