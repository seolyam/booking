import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import { db } from "@/db";
import { budgets, budgetItems, users } from "@/db/schema";
import { desc, inArray, eq } from "drizzle-orm";
import ApproverApprovalsList from "../../_components/ApproverApprovalsList";
import type { ApproverDashboardRow } from "../../_components/ApproverDashboard";

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

export default async function ApproverApprovalsPage() {
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

  const allRelevantProposals = await db
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
      inArray(budgets.status, ["approved", "verified", "verified_by_reviewer", "rejected"])
    )
    .orderBy(desc(budgets.created_at));

  const budgetIds = allRelevantProposals.map((b) => b.id);
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

  const rows: ApproverDashboardRow[] = allRelevantProposals.map((b) => {
    const type = b.budget_type === "capex" ? ("CapEx" as const) : ("OpEx" as const);
    const statusLabel =
      b.status === "approved" ? "Approved" as const :
        b.status === "rejected" ? "Rejected" as const : "Pending" as const;

    return {
      budgetId: b.id,
      displayId: `BUD-${String(b.budget_number).padStart(3, '0')}`,
      projectName: firstItemByBudgetId.get(b.id) ?? "Budget Request",
      projectSub: b.department ?? "",
      type,
      amount: formatPhp(b.total_amount),
      statusLabel,
      dateLabel: formatDateShort(b.created_at),
    };
  });

  return (
    <ApproverApprovalsList initialRows={rows} />
  );
}
