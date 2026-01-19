import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import Link from "next/link";
import { db } from "@/db";
import { budgets, budgetItems, users, auditLogs } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { Calendar, AlertCircle, ChevronLeft, Bell } from "lucide-react";
import BudgetComparisonAnalysis from "@/app/dashboard/_components/BudgetComparisonAnalysis";
import ReviewerAssessmentCard from "../../../_components/ReviewerAssessmentCard";
import ApprovalDecisionPanel from "../../../_components/ApprovalDecisionPanel";

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

    if (appUser.role !== "approver" && appUser.role !== "superadmin") {
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
        .where(and(eq(auditLogs.budget_id, budget.id), eq(auditLogs.action, "verify")))
        .orderBy(desc(auditLogs.timestamp))
        .limit(1);

    let reviewerAssessment = { name: "Unknown Reviewer", comment: "No assessment available." };
    if (reviewerLogs.length > 0) {
        const reviewer = await db
            .select({ full_name: users.full_name })
            .from(users)
            .where(eq(users.id, reviewerLogs[0].actor_id))
            .limit(1);

        reviewerAssessment = {
            name: reviewer[0]?.full_name || "Reviewer",
            comment: reviewerLogs[0].comment || "Verified all costs. Project aligns with strategic goals. Ready for approval."
        };
    }

    // Comparison Data (Mocked similarly to reviewer side for consistency)
    const historicalAverage = 275000;
    const historicalMin = 170500;
    const historicalMax = 340650;
    const comparisonData = [
        { id: "1", name: "Previous Upgrade", amount: "250000", date: "01/15/2025", requester: "John Doe", profit: "5%" },
        { id: "2", name: "System Maintenance", amount: "180000", date: "11/20/2024", requester: "Jane Smith", profit: "3%" }
    ];

    const typeLabel = budget.budget_type === "capex" ? "CapEx" : "OpEx";

    return (
        <div className="max-w-7xl mx-auto space-y-10 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/approver/approvals" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ChevronLeft className="w-6 h-6 text-gray-900" />
                        </Link>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Budget approval review</h1>
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
                        <div className="absolute top-10 right-10 flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
                            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                            <span className="text-sm font-bold text-orange-600">Pending</span>
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
                                    <p className="text-xl font-bold text-gray-900">{requester?.full_name || "Lebron James"}</p>
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
                                        {budget.start_date ? formatDate(budget.start_date) : formatDate(budget.created_at)} to {budget.end_date ? formatDate(budget.end_date) : "01-11-2027"}
                                    </p>
                                </div>
                            </div>
                        </div>
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
                                <span className="text-lg font-bold text-gray-900">{budget.start_date ? formatDate(budget.start_date) : "01-08-2026"}</span>
                            </div>
                            <div className="flex justify-between items-center p-5 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                                <span className="text-sm text-gray-400 font-bold uppercase tracking-wider">End Date</span>
                                <span className="text-lg font-bold text-gray-900">{budget.end_date ? formatDate(budget.end_date) : "05-23-2026"}</span>
                            </div>
                        </div>

                        <div className="p-8 bg-gray-50/30 rounded-[1.5rem] border border-gray-100/50">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Milestones:</p>
                            <ul className="space-y-4">
                                <li className="flex items-center gap-3 text-gray-700 font-bold">
                                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                                    Equipment Procurement - Q1
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
                            <div className="space-y-4">
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Requested by {requester?.full_name || "Lebron James"}</p>
                                <p className="text-lg text-gray-700 font-medium leading-relaxed italic">
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

                {/* Sidebar Decision Panel */}
                <div className="lg:col-span-4 lg:sticky lg:top-10">
                    <ApprovalDecisionPanel
                        budgetId={budget.id}
                        budgetStatus={budget.status}
                    />
                </div>
            </div>
        </div>
    );
}
