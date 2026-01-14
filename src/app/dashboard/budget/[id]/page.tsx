import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { budgets, budgetItems } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

function formatPhp(amount: string) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "₱0";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function BudgetDetailPage({
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

  const budget = await db.query.budgets.findFirst({
    where: eq(budgets.id, id),
  });

  if (!budget) {
    return (
      <div>
        <div className="font-semibold text-gray-900">Not found</div>
        <Link
          href="/dashboard"
          className="text-sm text-gray-600 hover:underline"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  // Note: Requester UI includes a "List of Requests" view that shows all budgets.
  // This detail page is therefore viewable even when the budget isn't owned by the current user.

  const items = await db.query.budgetItems.findMany({
    where: eq(budgetItems.budget_id, budget.id),
    orderBy: [desc(budgetItems.quarter)],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-semibold text-gray-900">
            Budget Request
          </div>
          <div className="text-sm text-gray-500">{budget.id}</div>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-gray-600 hover:underline"
        >
          Back
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/5 p-5">
          <div className="text-xs text-gray-500">Type</div>
          <div className="mt-1 font-semibold text-gray-900">
            {budget.budget_type === "capex" ? "CapEx" : "OpEx"}
          </div>
        </div>
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/5 p-5">
          <div className="text-xs text-gray-500">Status</div>
          <div className="mt-1 font-semibold text-gray-900">
            {budget.status}
          </div>
        </div>
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/5 p-5">
          <div className="text-xs text-gray-500">Total</div>
          <div className="mt-1 font-semibold text-gray-900">
            {formatPhp(budget.total_amount)}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
        <div className="px-6 py-4 border-b border-black/10 font-semibold text-gray-900">
          Line Items
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-black/10">
                <th className="py-3 px-6 font-medium">DESCRIPTION</th>
                <th className="py-3 px-6 font-medium">QTR</th>
                <th className="py-3 px-6 font-medium">QTY</th>
                <th className="py-3 px-6 font-medium">UNIT</th>
                <th className="py-3 px-6 font-medium">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-gray-500">
                    No items.
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr
                    key={it.id}
                    className="border-b border-black/5 last:border-b-0"
                  >
                    <td className="py-4 px-6 text-gray-900">
                      {it.description}
                    </td>
                    <td className="py-4 px-6 text-gray-700">{it.quarter}</td>
                    <td className="py-4 px-6 text-gray-700">{it.quantity}</td>
                    <td className="py-4 px-6 text-gray-700">
                      {formatPhp(it.unit_cost)}
                    </td>
                    <td className="py-4 px-6 text-gray-900 font-medium">
                      {formatPhp(it.total_cost)}
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
