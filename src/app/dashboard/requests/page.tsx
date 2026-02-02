import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { budgets, budgetItems } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import {
  RequestsListClient,
  type RequestsListRow,
} from "./_components/RequestsListClient";

// Force dynamic rendering - requires auth and DB access
export const dynamic = "force-dynamic";

type StatusFilter = "all" | "approved" | "pending" | "revision" | "draft";

function getStatusFilterFromSearchParam(
  value: string | undefined,
): StatusFilter {
  if (
    value === "approved" ||
    value === "pending" ||
    value === "revision" ||
    value === "draft"
  ) {
    return value;
  }
  return "all";
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const qRaw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const statusRaw = Array.isArray(sp.status) ? sp.status[0] : sp.status;

  const q = (qRaw ?? "").trim();
  const activeStatus = getStatusFilterFromSearchParam(statusRaw);

  const user = await getAuthUser();

  if (!user) redirect("/login");

  const myBudgets = await db.query.budgets.findMany({
    where: eq(budgets.user_id, user.id),
    orderBy: [desc(budgets.created_at)],
    limit: 200,
  });

  const ids = myBudgets.map((b) => b.id);
  const items =
    ids.length === 0
      ? []
      : await db
          .select({
            budget_id: budgetItems.budget_id,
            description: budgetItems.description,
          })
          .from(budgetItems)
          .where(inArray(budgetItems.budget_id, ids));

  const firstItem = new Map<string, string>();
  for (const it of items) {
    if (!firstItem.has(it.budget_id))
      firstItem.set(it.budget_id, it.description);
  }

  const rows: RequestsListRow[] = myBudgets.map((b) => ({
    id: b.id,
    project_code: b.project_code,
    budget_number: b.budget_number,
    budget_type: b.budget_type,
    total_amount: b.total_amount,
    status: b.status,
    created_at_iso: new Date(b.created_at).toISOString(),
    projectName: firstItem.get(b.id) ?? "Budget Request",
  }));

  return (
    <RequestsListClient
      rows={rows}
      initialQuery={q}
      initialStatus={activeStatus}
    />
  );
}
