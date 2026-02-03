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
  archivedBudgets,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
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
      fiscal_year: budgets.fiscal_year,
      project_code: budgets.project_code,
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

  // Determine Fiscal Year Context
  // If fiscal_year is set in the record, use it. Otherwise, assume current year (e.g., 2025).
  // Note: fiscal_year is now selected above.
  const currentYear = budget.fiscal_year;
  const lastYear = currentYear - 1;

  // Fetch Previous Year's Budget for the SAME Project Code
  // Strategy: Check 'archived_budgets' first (approved/finalized history).
  // If not found, check active 'budgets' table (maybe it's still live but from last year).

  let lastYearBudgetRecord = null;
  let lastYearAmount: number | null = null;

  if (budget.project_code) {
    // 1. Check Archives
    const archivedMatches = await db
      .select({
        id: archivedBudgets.id,
        total_amount: archivedBudgets.total_amount,
        created_at: archivedBudgets.created_at, // use created_at as proxy for date if needed, or archived_at
        status: archivedBudgets.status,
        project_code: archivedBudgets.project_code,
      })
      .from(archivedBudgets)
      .where(
        and(
          eq(archivedBudgets.project_code, budget.project_code),
          eq(archivedBudgets.fiscal_year, lastYear),
          eq(archivedBudgets.status, "approved"), // We generally only care about approved history
        ),
      )
      .orderBy(desc(archivedBudgets.created_at))
      .limit(1);

    if (archivedMatches.length > 0) {
      const match = archivedMatches[0];
      lastYearBudgetRecord = {
        id: match.id,
        date: formatDate(match.created_at),
        status: match.status,
        projectCode: match.project_code || "N/A",
      };
      lastYearAmount = Number(match.total_amount);
    } else {
      // 2. Check Active Budgets (Fallback)
      const activeMatches = await db
        .select({
          id: budgets.id,
          total_amount: budgets.total_amount,
          created_at: budgets.created_at,
          status: budgets.status,
          project_code: budgets.project_code,
        })
        .from(budgets)
        .where(
          and(
            eq(budgets.project_code, budget.project_code),
            eq(budgets.fiscal_year, lastYear),
            eq(budgets.status, "approved"),
          ),
        )
        .orderBy(desc(budgets.created_at))
        .limit(1);

      if (activeMatches.length > 0) {
        const match = activeMatches[0];
        lastYearBudgetRecord = {
          id: match.id,
          date: formatDate(match.created_at),
          status: match.status,
          projectCode: match.project_code || "N/A",
        };
        lastYearAmount = Number(match.total_amount);
      }
    }
  }

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/reviewer"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-900" />
            </Link>
            <h1 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight">
              Review Budget Request
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-12 text-sm md:text-base">
            Review and verify budget details before forwarding to approver
          </p>
        </div>
        <button className="hidden md:block p-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <Bell className="w-5 h-5 text-gray-900" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10 items-start">
        {/* Main Content */}
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
                      {items[0]?.description || "Budget Request"}
                    </h2>
                    <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider flex-shrink-0">
                      {typeLabel}
                    </span>
                  </div>
                  <p className="text-gray-400 font-bold text-sm tracking-wide">
                    PROJ-{budget.id.slice(0, 8).toUpperCase()} -{" "}
                    {requester?.department || ""}
                  </p>
                </div>

                {/* Status Pill */}
                <div
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border w-fit ${statusCardClass}`}
                >
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-bold whitespace-nowrap">{displayStatusLabel}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 md:gap-y-10 gap-x-12">
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    Requester
                  </p>
                  <p className="text-lg md:text-xl font-bold text-gray-900 break-words">
                    {displayName(requester?.full_name, requester?.email)}
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
                  <p className="text-lg md:text-xl font-bold text-gray-900">
                    {formatDate(budget.created_at)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    Timeline
                  </p>
                  <p className="text-lg md:text-xl font-bold text-gray-900">
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
          <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 shadow-sm">
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
          <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 shadow-sm space-y-6">
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
            <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 shadow-sm">
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
            departmentName={requester?.department || "Unknown"}
            budgetType={typeLabel}
            lastYearAmount={lastYearAmount}
            lastYearBudget={lastYearBudgetRecord}
            currentYear={currentYear}
            lastYear={lastYear}
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
