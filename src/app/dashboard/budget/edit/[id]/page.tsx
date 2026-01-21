import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  budgets,
  budgetItems,
  budgetMilestones,
  auditLogs,
  users,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import EditBudgetForm from "./_components/EditBudgetForm";

// Force dynamic rendering - requires auth and DB access
export const dynamic = "force-dynamic";

export default async function EditBudgetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  // Try to parse as budget_number first (numeric or BUD-XXX format)
  let budgetNum: number | null = null;
  if (id.startsWith("BUD-")) {
    budgetNum = parseInt(id.slice(4), 10);
  } else {
    const parsed = parseInt(id, 10);
    if (!isNaN(parsed)) {
      budgetNum = parsed;
    }
  }

  // Fetch the budget by budget_number if we have one, otherwise by UUID for backward compatibility
  let budget;
  if (budgetNum !== null) {
    const result = await db
      .select()
      .from(budgets)
      .where(
        and(eq(budgets.budget_number, budgetNum), eq(budgets.user_id, user.id)),
      )
      .limit(1);
    budget = result[0];
  } else {
    budget = await db.query.budgets.findFirst({
      where: and(eq(budgets.id, id), eq(budgets.user_id, user.id)),
    });
  }

  if (!budget) {
    redirect("/dashboard/requests");
  }

  // Only allow editing if status is revision_requested
  if (budget.status !== "revision_requested") {
    const redirectId = budgetNum
      ? `BUD-${String(budgetNum).padStart(3, "0")}`
      : id;
    redirect(`/dashboard/requests/${redirectId}`);
  }

  // Fetch budget items
  const items = await db.query.budgetItems.findMany({
    where: eq(budgetItems.budget_id, budget.id),
  });

  // Fetch milestones
  const milestones = await db.query.budgetMilestones.findMany({
    where: eq(budgetMilestones.budget_id, budget.id),
  });

  // Fetch the latest revision request comment from the reviewer
  const revisionLog = await db
    .select({
      comment: auditLogs.comment,
      timestamp: auditLogs.timestamp,
      actor_id: auditLogs.actor_id,
    })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.budget_id, budget.id),
        eq(auditLogs.action, "request_revision"),
      ),
    )
    .orderBy(desc(auditLogs.timestamp))
    .limit(1);

  // Get reviewer name if we have a revision log
  let reviewerComment: {
    comment: string;
    reviewerName: string;
    date: Date;
  } | null = null;
  if (revisionLog.length > 0 && revisionLog[0].comment) {
    const reviewer = await db
      .select({ full_name: users.full_name, email: users.email })
      .from(users)
      .where(eq(users.id, revisionLog[0].actor_id))
      .limit(1);

    reviewerComment = {
      comment: revisionLog[0].comment,
      reviewerName: reviewer[0]?.full_name || reviewer[0]?.email || "Reviewer",
      date: revisionLog[0].timestamp,
    };
  }

  return (
    <EditBudgetForm
      budget={budget}
      items={items}
      milestones={milestones}
      reviewerComment={reviewerComment}
    />
  );
}
