import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import { db } from "@/db";
import { budgets, budgetItems, users, budgetMilestones, auditLogs } from "@/db/schema";
import { eq, inArray, asc } from "drizzle-orm";
import BudgetTrackingView from "@/app/dashboard/_components/BudgetTrackingView";

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

export default async function BudgetTrackingPage({
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
        user_metadata: (user.user_metadata ?? null) as Record<string, unknown> | null,
    });

    // Access control
    if (appUser.role !== "reviewer" && appUser.role !== "superadmin") {
        redirect("/dashboard");
    }

    // Fetch budget
    const budgetData = await db
        .select()
        .from(budgets)
        .where(eq(budgets.id, id))
        .limit(1);

    if (budgetData.length === 0) return notFound();
    const budget = budgetData[0];

    // Fetch items
    const items = await db
        .select()
        .from(budgetItems)
        .where(eq(budgetItems.budget_id, id));

    // Fetch milestones
    let milestones: Array<{
        id: string;
        description: string;
        target_quarter: string | null;
    }> = [];
    try {
        milestones = await db
            .select({
                id: budgetMilestones.id,
                description: budgetMilestones.description,
                target_quarter: budgetMilestones.target_quarter,
            })
            .from(budgetMilestones)
            .where(eq(budgetMilestones.budget_id, id))
            .orderBy(asc(budgetMilestones.created_at));
    } catch (e) {
        console.error("Milestones table fetch error:", e);
    }

    // Fetch audit logs
    const logs = await db
        .select({
            id: auditLogs.id,
            action: auditLogs.action,
            comment: auditLogs.comment,
            timestamp: auditLogs.timestamp,
            actor_id: auditLogs.actor_id,
        })
        .from(auditLogs)
        .where(eq(auditLogs.budget_id, id));

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

    // Fetch requester
    const requesterResult = await db
        .select({ full_name: users.full_name, department: users.department, email: users.email })
        .from(users)
        .where(eq(users.id, budget.user_id))
        .limit(1);

    const req = requesterResult[0];

    const viewData = {
        id: budget.id,
        displayId: budget.id.slice(0, 8).toUpperCase(), // Simplified display ID
        projectName: items[0]?.description || "Budget Request",
        projectSub: req?.department || "Infrastructure Department",
        type: budget.budget_type === "capex" ? "CapEx" : "OpEx",
        totalAmount: formatPhp(budget.total_amount),
        requester: req?.full_name || req?.email || "Unknown",
        createdDate: formatDate(budget.created_at),
        updatedDate: formatDate(budget.updated_at),
        status: budget.status,
        startDate: budget.start_date ? formatDate(new Date(budget.start_date)) : null,
        endDate: budget.end_date ? formatDate(new Date(budget.end_date)) : null,
    };

    const auditHistory = logs
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .map((log) => ({
            id: log.id,
            action: log.action,
            description: log.comment || `Budget ${log.action}`,
            actor: actorMap.get(log.actor_id) || "Unknown",
            date: formatDate(log.timestamp),
            comment: log.comment,
        }));

    return (
        <BudgetTrackingView
            budget={viewData}
            items={items.map(it => ({
                id: it.id,
                description: it.description,
                quantity: it.quantity,
                unit_cost: it.unit_cost,
                total_cost: it.total_cost,
                quarter: it.quarter
            }))}
            milestones={milestones}
            auditHistory={auditHistory}
            backHref="/dashboard/reviewer"
        />
    );
}
