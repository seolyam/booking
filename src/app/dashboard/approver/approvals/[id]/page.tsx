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
  archivedBudgets,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  Calendar,
  AlertCircle,
  ChevronLeft,
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
    fiscal_year: budgets.fiscal_year,
    project_code: budgets.project_code,
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

  const [requesterData, items, reviewerLogs] = await Promise.all([
    // Get requester info
    db
      .select({
        id: users.id,
        email: users.email,
        department: users.department,
        full_name: users.full_name,
        position: users.position,
      })
      .from(users)
      .where(eq(users.id, budget.user_id))
      .limit(1),

    // Get budget items
    db
      .select({
        id: budgetItems.id,
        description: budgetItems.description,
        quantity: budgetItems.quantity,
        unit_cost: budgetItems.unit_cost,
        total_cost: budgetItems.total_cost,
        quarter: budgetItems.quarter,
      })
      .from(budgetItems)
      .where(eq(budgetItems.budget_id, budget.id)),

    // Get reviewer assessment from audit logs
    // Looking for the most recent 'verify' action
    db
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
      .limit(1),
  ]);

  const requester = requesterData?.[0];

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

  // Comparison Logic: Fetch Last Year's Budget
  const budgetFiscalYear = budget.fiscal_year || budget.created_at.getFullYear();
  const lastYear = budgetFiscalYear - 1;
  const projectCode = budget.project_code;

  let lastYearBudgetRecord = null;
  let lastYearAmount = null;

  if (projectCode) {
    try {
      // 1. Check Archived Budgets
      const archived = await db
        .select({
          id: archivedBudgets.id,
          total_amount: archivedBudgets.total_amount,
          status: archivedBudgets.status,
          project_code: archivedBudgets.project_code,
          created_at: archivedBudgets.created_at,
        })
        .from(archivedBudgets)
        .where(
          and(
            eq(archivedBudgets.project_code, projectCode),
            eq(archivedBudgets.fiscal_year, lastYear),
          ),
        )
        .limit(1);

      if (archived.length > 0) {
        lastYearBudgetRecord = archived[0];
      } else {
        // 2. Check Active Budgets (in case last year's data isn't archived yet)
        const active = await db
          .select({
            id: budgets.id,
            total_amount: budgets.total_amount,
            status: budgets.status,
            project_code: budgets.project_code,
            created_at: budgets.created_at,
          })
          .from(budgets)
          .where(
            and(
              eq(budgets.project_code, projectCode),
              eq(budgets.fiscal_year, lastYear),
            ),
          )
          .limit(1);

        if (active.length > 0) {
          lastYearBudgetRecord = active[0];
        }
      }
    } catch (error) {
      console.error("Error fetching comparison budget:", error);
      // Fallback or ignore error, displaying no comparison
    }
  }

  if (lastYearBudgetRecord) {
    lastYearAmount = Number(lastYearBudgetRecord.total_amount);
  }

  const lastYearBudgetData = lastYearBudgetRecord
    ? {
        id: lastYearBudgetRecord.id,
        date: formatDate(lastYearBudgetRecord.created_at),
        status: lastYearBudgetRecord.status,
        projectCode: lastYearBudgetRecord.project_code || "Unknown",
      }
    : null;

  const typeLabel = budget.budget_type === "capex" ? "CapEx" : "OpEx";

  // Quick Stats Calculations
  const projectDuration =
    budget.start_date && budget.end_date
      ? `${Math.ceil((budget.end_date.getTime() - budget.start_date.getTime()) / (1000 * 60 * 60 * 24 * 30.44))} Months`
      : "Not set";
  const averageItemsCost =
    items.length > 0 ? Number(budget.total_amount) / items.length : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Floating Action Button for Decision */}
      <div className="fixed bottom-24 md:bottom-12 right-6 md:right-12 lg:right-16 z-50 shadow-2xl rounded-xl">
        <ApprovalDecisionButton
          budgetId={budget.id}
          budgetStatus={budget.status}
          redirectHref="/dashboard/approver/approvals"
        />
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-0">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/approver/approvals"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-900" />
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 tracking-tight">
              Budget approval review
            </h1>
            <p className="text-gray-500 font-medium text-sm md:text-base">
              Review and verify budget details before forwarding to approver
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto mt-4 md:mt-2">
          {/* Action button will be a floating action button (FAB) */}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10 items-start">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-6 md:space-y-10">
          {/* Project Info Card */}
          <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative overflow-hidden">
            <div className="space-y-8">
              {/* Header: Title + Status */}
              <div className="flex flex-row justify-between items-start gap-4">
                {/* Title Section */}
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight break-words">
                      {items[0]?.description || "Substation Transformer Upgrade"}
                    </h2>
                    <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-wider flex-shrink-0">
                      {typeLabel}
                    </span>
                  </div>
                  <p className="text-gray-400 font-medium text-sm tracking-wide">
                    PROJ-{budget.id.slice(0, 8).toUpperCase()} -{" "}
                    {requester?.department || "Infrastructure Department"}
                  </p>
                </div>

                {/* Status Pill */}
                {(() => {
                  const s = budget.status;
                  let colorClass = "bg-gray-100 text-gray-500 border-gray-200";
                  let dotClass = "bg-gray-400";
                  let label = "Unknown";

                  if (s === "approved") {
                    colorClass = "bg-green-50 text-green-700 border-green-100";
                    dotClass = "bg-green-500";
                    label = "Approved";
                  } else if (s === "rejected") {
                    colorClass = "bg-red-50 text-red-700 border-red-100";
                    dotClass = "bg-red-500";
                    label = "Rejected";
                  } else if (s === "revision_requested") {
                    colorClass = "bg-orange-50 text-orange-700 border-orange-100";
                    dotClass = "bg-orange-500";
                    label = "Revision";
                  } else {
                    // Pending / Submitted / Verified
                    colorClass = "bg-blue-50 text-blue-700 border-blue-100";
                    dotClass = "bg-blue-500";
                    label = "Pending Approval";
                  }

                  return (
                    <div className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border w-fit ${colorClass}`}>
                      <div className={`w-2 h-2 rounded-full ${dotClass} ${s !== 'approved' && s !== 'rejected' ? 'animate-pulse' : ''}`} />
                      <span className="text-sm font-bold whitespace-nowrap">{label}</span>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 md:gap-y-10 gap-x-12">
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    Requester
                  </p>
                  <p className="text-lg md:text-xl font-semibold text-gray-900 break-words">
                    {requester?.full_name || "Lebron James"}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    Total amount
                  </p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900">
                    {formatPhp(budget.total_amount)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    Submitted
                  </p>
                  <p className="text-lg md:text-xl font-semibold text-gray-900">
                    {formatDate(budget.created_at)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    Timeline
                  </p>
                  <p className="text-lg md:text-xl font-semibold text-gray-900">
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
          <div className="bg-white rounded-[2rem] md:rounded-4xl p-6 md:p-10 border border-gray-100 shadow-sm space-y-8">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-gray-900">
                ₱ Cost Breakdown
              </span>
            </div>

            {items.length > 0 ? (
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-6 bg-gray-50/50 rounded-2xl flex justify-between items-center border border-gray-100/50"
                  >
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-gray-900">
                        {item.description}
                      </p>
                      <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">
                        Equipment | Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="text-base font-bold text-gray-900">
                      {formatPhp(item.total_cost)}
                    </p>
                  </div>
                ))}
                <div className="flex justify-end pt-6 border-t border-gray-100">
                  <p className="text-xl font-bold text-gray-900">
                    Total:{" "}
                    <span className="font-bold ml-2 text-2xl">
                      {formatPhp(budget.total_amount)}
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-lg font-medium italic p-10 text-center bg-gray-50/30 rounded-2xl border border-dashed border-gray-200">
                No budget items found.
              </div>
            )}
          </div>

          {/* Project Timeline & Milestones */}
          <div className="bg-white rounded-[2rem] md:rounded-4xl p-6 md:p-10 border border-gray-100 shadow-sm space-y-8">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-gray-900" />
              <h2 className="text-xl font-bold text-gray-900">
                Project timeline
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex justify-between items-center p-5 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                <span className="text-sm text-gray-400 font-bold uppercase tracking-wider">
                  Start Date
                </span>
                <span className="text-base font-semibold text-gray-900">
                  {budget.start_date
                    ? formatDate(budget.start_date)
                    : "Not set"}
                </span>
              </div>
              <div className="flex justify-between items-center p-5 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                <span className="text-sm text-gray-400 font-bold uppercase tracking-wider">
                  End Date
                </span>
                <span className="text-base font-semibold text-gray-900">
                  {budget.end_date ? formatDate(budget.end_date) : "Not set"}
                </span>
              </div>
            </div>
          </div>

          {/* Variance Explanation */}
          {budget.variance_explanation && (
            <div className="bg-white rounded-[2rem] md:rounded-4xl p-6 md:p-10 border border-gray-100 shadow-sm space-y-8">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-gray-900" />
                <h2 className="text-xl font-bold text-gray-900">
                  Variance Explanation
                </h2>
              </div>
              <div className="space-y-4">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  Requested by {requester?.full_name || "Lebron James"}
                </p>
                <p className="text-lg text-gray-700 font-medium leading-relaxed italic break-words whitespace-pre-wrap">
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
            departmentName={requester?.department || "Infrastructure"}
            budgetType={typeLabel}
            lastYearAmount={lastYearAmount}
            lastYearBudget={lastYearBudgetData}
            currentYear={budgetFiscalYear}
            lastYear={lastYear}
          />
        </div>

        {/* Sidebar Stats */}
        <div className="lg:col-span-4 lg:sticky lg:top-10 space-y-8">
          {/* Quick Stats */}
          <QuickStatsCard
            projectDuration={projectDuration}
            costItems={items.length}
            averageItemsCost={formatPhp(averageItemsCost)}
          />

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
