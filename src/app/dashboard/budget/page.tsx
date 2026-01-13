import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { budgets, users } from "@/db/schema";
import { desc, inArray } from "drizzle-orm";

function formatPhp(amount: string) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "₱0";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function BudgetIndexPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const allBudgets = await db.query.budgets.findMany({
    orderBy: [desc(budgets.created_at)],
    limit: 200,
  });

  const userIds = Array.from(new Set(allBudgets.map((b) => b.user_id)));
  const requesters =
    userIds.length === 0
      ? []
      : await db
          .select({ id: users.id, email: users.email, full_name: users.full_name })
          .from(users)
          .where(inArray(users.id, userIds));

  const requesterById = new Map(
    requesters.map((u) => [u.id, u.full_name || u.email])
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">List of Requests</h2>
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
                <th className="py-3 px-6 font-medium">REQUESTER</th>
                <th className="py-3 px-6 font-medium">TYPE</th>
                <th className="py-3 px-6 font-medium">AMOUNT</th>
                <th className="py-3 px-6 font-medium">STATUS</th>
                <th className="py-3 px-6 font-medium text-right">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {allBudgets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-gray-500">
                    No requests yet.
                  </td>
                </tr>
              ) : (
                allBudgets.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-black/5 last:border-b-0"
                  >
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900">
                        {requesterById.get(b.user_id) ?? b.user_id}
                      </div>
                      <div className="text-xs text-gray-500">{b.id}</div>
                    </td>
                    <td className="py-4 px-6 text-gray-800">
                      {b.budget_type === "capex" ? "CapEx" : "OpEx"}
                    </td>
                    <td className="py-4 px-6 text-gray-800">
                      {formatPhp(b.total_amount)}
                    </td>
                    <td className="py-4 px-6 text-gray-700">{b.status}</td>
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
