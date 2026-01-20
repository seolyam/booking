import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import Link from "next/link";
import { db } from "@/db";
import { budgets, budgetItems, users, reviewChecklists, auditLogs } from "@/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import ReviewDecisionModal from "@/components/ReviewDecisionModal";
import ReviewChecklist from "@/components/ReviewChecklist";
import BudgetComparisonAnalysis from "@/app/dashboard/_components/BudgetComparisonAnalysis";
import { Calendar, AlertCircle, ChevronLeft, Bell, Clock } from "lucide-react";

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
        eq(budgets.status, "approved")
      )
    )
    .limit(5);

  // Filter by department (need to join but we have user_id)
  const similarActorIds = [...new Set(similarBudgets.map((b) => b.user_id))];
  const similarUsers = similarActorIds.length > 0 ? await db
    .select({ id: users.id, full_name: users.full_name, department: users.department })
    .from(users)
    .where(and(
      inArray(users.id, similarActorIds),
      eq(users.department, requester?.department || "Finance")
    )) : [];

  const similarUserMap = new Map(similarUsers.map(u => [u.id, u]));
  const filteredSimilar = similarBudgets.filter(b => similarUserMap.has(b.user_id));

  // Fetch descriptions for similar budgets (simplified: just first item)
  const similarBudgetIds = filteredSimilar.map(b => b.id);
  const similarItems = similarBudgetIds.length > 0 ? await db
    .select({ budget_id: budgetItems.budget_id, description: budgetItems.description })
    .from(budgetItems)
    .where(inArray(budgetItems.budget_id, similarBudgetIds)) : [];

  const similarItemsMap = new Map();
  similarItems.forEach(it => {
    if (!similarItemsMap.has(it.budget_id)) {
      similarItemsMap.set(it.budget_id, it.description);
    }
  });

  const comparisonData = filteredSimilar.map(b => ({
    id: b.id,
    name: similarItemsMap.get(b.id) || "Previous Project",
    amount: b.total_amount,
    date: formatDate(b.created_at),
    requester: similarUserMap.get(b.user_id)?.full_name || "Unknown",
    profit: "5%" // Example placeholder as requested
  }));

  const historicalAmounts = comparisonData.map(d => Number(d.amount));
  const historicalAverage = historicalAmounts.length > 0
    ? historicalAmounts.reduce((a, b) => a + b, 0) / historicalAmounts.length
    : 275000; // Placeholder as in image if none found

  const historicalMin = historicalAmounts.length > 0 ? Math.min(...historicalAmounts) : 170500;
  const historicalMax = historicalAmounts.length > 0 ? Math.max(...historicalAmounts) : 340650;

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
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/reviewer" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6 text-gray-900" />
            </Link>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Review Budget Request</h1>
          </div>
          <p className="text-gray-500 font-medium ml-12">Review and verify budget details before forwarding to approver</p>
        </div>
        <button className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <Bell className="w-5 h-5 text-gray-900" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-10">

          {/* Project Info Card */}
          <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative overflow-hidden">
            {/* Status Pill */}
            <div className="absolute top-10 right-10 flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-full border border-yellow-100">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-bold text-yellow-600">
                {statusLabelMap[budget.status] || "Pending"}
              </span>
            </div>

            <div className="space-y-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-black text-gray-900 leading-tight">
                    {items[0]?.description || "Substation Transformer Upgrade"}
                  </h2>
                  <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                    {typeLabel}
                  </span>
                </div>
                <p className="text-gray-400 font-bold text-sm tracking-wide">
                  PROJ-{budget.id.slice(0, 8).toUpperCase()} - {requester?.department || "Infrastructure Department"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-y-10 gap-x-12">
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Requester</p>
                  <p className="text-xl font-bold text-gray-900">{requester?.full_name || requester?.email || "John Doe"}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Total amount</p>
                  <p className="text-3xl font-black text-gray-900">{formatPhp(budget.total_amount)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Submitted</p>
                  <p className="text-xl font-bold text-gray-900">{formatDate(budget.created_at)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Timeline</p>
                  <p className="text-xl font-bold text-gray-900">
                    {budget.start_date ? formatDate(budget.start_date) : formatDate(budget.created_at)} to {budget.end_date ? formatDate(budget.end_date) : formatDate(new Date(budget.created_at.getTime() + 365 * 24 * 60 * 60 * 1000))}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="bg-white rounded-[2rem] p-10 border border-gray-100 shadow-sm space-y-8">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-gray-900">₱ Cost Breakdown</span>
            </div>

            {items.length > 0 ? (
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="p-6 bg-gray-50/50 rounded-2xl flex justify-between items-center border border-gray-100/50">
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-gray-900">{item.description}</p>
                      <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">Equipment | Qty: {item.quantity}</p>
                    </div>
                    <p className="text-lg font-black text-gray-900">{formatPhp(item.total_cost)}</p>
                  </div>
                ))}
                <div className="flex justify-end pt-6 border-t border-gray-100">
                  <p className="text-2xl font-bold text-gray-900">
                    Total: <span className="font-black ml-2 text-3xl">{formatPhp(budget.total_amount)}</span>
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
          <div className="bg-white rounded-[2rem] p-10 border border-gray-100 shadow-sm space-y-8">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-gray-900" />
              <h2 className="text-2xl font-black text-gray-900">Project timeline & milestones</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex justify-between items-center p-5 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                <span className="text-sm text-gray-400 font-bold uppercase tracking-wider">Start Date</span>
                <span className="text-lg font-bold text-gray-900">{budget.start_date ? formatDate(budget.start_date) : formatDate(budget.created_at)}</span>
              </div>
              <div className="flex justify-between items-center p-5 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                <span className="text-sm text-gray-400 font-bold uppercase tracking-wider">End Date</span>
                <span className="text-lg font-bold text-gray-900">
                  {budget.end_date ? formatDate(budget.end_date) : formatDate(new Date(budget.created_at.getTime() + 365 * 24 * 60 * 60 * 1000))}
                </span>
              </div>
            </div>

            <div className="p-8 bg-gray-50/30 rounded-[1.5rem] border border-gray-100/50">
              <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Milestones:</p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-gray-700 font-bold">
                  <div className="w-2 h-2 rounded-full bg-gray-300" />
                  Planned Procurement - Q1
                </li>
                <li className="flex items-center gap-3 text-gray-700 font-bold">
                  <div className="w-2 h-2 rounded-full bg-gray-300" />
                  Installation - Q2
                </li>
                <li className="flex items-center gap-3 text-gray-700 font-bold">
                  <div className="w-2 h-2 rounded-full bg-gray-300" />
                  Testing & Commissioning - Q3
                </li>
              </ul>
            </div>
          </div>

          {/* Variance Explanation */}
          {budget.variance_explanation && (
            <div className="bg-white rounded-[2rem] p-10 border border-gray-100 shadow-sm space-y-8">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-gray-900" />
                <h2 className="text-2xl font-black text-gray-900">Variance Explanation</h2>
              </div>
              <p className="text-lg text-gray-700 font-medium leading-relaxed italic border-l-4 border-gray-100 pl-6 py-2">
                &ldquo;{budget.variance_explanation}&rdquo;
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
            departmentName={requester?.department || "Infrastructure"}
            budgetType={typeLabel}
          />
        </div>

        {/* Right Sidebar - Review Decision Panel */}
        <div className="lg:col-span-4 lg:sticky lg:top-10 space-y-8">
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

          <ReviewDecisionModal budgetId={budget.id} budgetStatus={budget.status} />
        </div>
      </div>
    </div>
  );
}
