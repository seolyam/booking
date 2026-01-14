import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { budgets, budgetItems } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";

function formatPhp(amount: string) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "₱0";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);
}

function typePill(type: "capex" | "opex") {
  const base =
    "inline-flex items-center rounded-md px-3 py-1 text-xs font-medium";
  return type === "capex"
    ? `${base} bg-blue-100 text-blue-700`
    : `${base} bg-purple-100 text-purple-700`;
}

function statusLabel(status: string) {
  return status
    .split("_")
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function displayBudgetId(index: number) {
  return `BUD-${String(index + 1).padStart(3, "0")}`;
}

export default async function RequestsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const myBudgets = await db.query.budgets.findMany({
    where: eq(budgets.user_id, user.id),
    orderBy: [desc(budgets.created_at)],
    limit: 100,
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Your Requests</h2>
        <Link
          href="/dashboard/budget/create"
          className="inline-flex items-center gap-2 rounded-md bg-[#358334] px-4 py-2 text-sm font-medium text-white hover:bg-[#2F5E3D]"
        >
          Create Request
        </Link>
      </div>

      <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-black/10">
                <th className="py-3 px-6 font-medium">REQUEST</th>
                <th className="py-3 px-6 font-medium">TYPE</th>
                <th className="py-3 px-6 font-medium">AMOUNT</th>
                <th className="py-3 px-6 font-medium">STATUS</th>
                <th className="py-3 px-6 font-medium text-right">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {myBudgets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-gray-500">
                    No requests yet.
                  </td>
                </tr>
              ) : (
                myBudgets.map((b, idx) => (
                  <tr
                    key={b.id}
                    className="border-b border-black/5 last:border-b-0"
                  >
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900">
                        {firstItem.get(b.id) ?? "Budget Request"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {displayBudgetId(idx)}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={typePill(b.budget_type)}>
                        {b.budget_type === "capex" ? "CapEx" : "OpEx"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-800">
                      {formatPhp(b.total_amount)}
                    </td>
                    <td className="py-4 px-6 text-gray-700">
                      {statusLabel(b.status)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        href={`/dashboard/budget/${b.id}`}
                        className="inline-flex items-center rounded-md bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
