import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { budgets, budgetItems, budgetMilestones } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import EditBudgetForm from "./_components/EditBudgetForm";

export default async function EditBudgetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  const { id } = await params;

  // Fetch the budget
  const budget = await db.query.budgets.findFirst({
    where: and(eq(budgets.id, id), eq(budgets.user_id, data.user.id)),
  });

  if (!budget) {
    redirect("/dashboard/requests");
  }

  // Only allow editing if status is revision_requested
  if (budget.status !== "revision_requested") {
    redirect(`/dashboard/requests/${id}`);
  }

  // Fetch budget items
  const items = await db.query.budgetItems.findMany({
    where: eq(budgetItems.budget_id, id),
  });

  // Fetch milestones
  const milestones = await db.query.budgetMilestones.findMany({
    where: eq(budgetMilestones.budget_id, id),
  });

  return (
    <EditBudgetForm
      budget={budget}
      items={items}
      milestones={milestones}
    />
  );
}
