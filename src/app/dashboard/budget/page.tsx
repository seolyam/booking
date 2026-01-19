import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { budgets, budgetItems, users } from "@/db/schema";
import { asc, desc, inArray } from "drizzle-orm";
import { Bell, Eye, Search } from "lucide-react";

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
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}-${dd}-${yy}`;
}

function statusLabel(status: string) {
  return status
    .split("_")
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function statusPill(status: string) {
  const base =
    "inline-flex items-center rounded-md px-3 py-1 text-xs font-medium";
  if (status === "approved") return `${base} bg-green-100 text-green-700`;
  if (status === "revision_requested")
    return `${base} bg-orange-100 text-orange-700`;
  if (status === "rejected") return `${base} bg-red-100 text-red-700`;
  if (status === "draft") return `${base} bg-gray-200 text-gray-700`;
  // submitted / verified / verified_by_reviewer -> pending-ish
  return `${base} bg-amber-100 text-amber-700`;
}

function typePill(type: "capex" | "opex") {
  const base =
    "inline-flex items-center rounded-md px-3 py-1 text-xs font-medium";
  return type === "capex"
    ? `${base} bg-blue-100 text-blue-700`
    : `${base} bg-purple-100 text-purple-700`;
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

  const budgetIds = allBudgets.map((b) => b.id);
  const itemRows =
    budgetIds.length === 0
      ? []
      : await db
          .select({
            budget_id: budgetItems.budget_id,
            description: budgetItems.description,
          })
          .from(budgetItems)
          .where(inArray(budgetItems.budget_id, budgetIds))
          .orderBy(asc(budgetItems.quarter));

  const firstItemByBudgetId = new Map<string, string>();
  for (const row of itemRows) {
    if (!firstItemByBudgetId.has(row.budget_id)) {
      firstItemByBudgetId.set(row.budget_id, row.description);
    }
  }

  const userIds = Array.from(new Set(allBudgets.map((b) => b.user_id)));
  const requesterRows =
    userIds.length === 0
      ? []
      : await db
          .select({
            id: users.id,
            email: users.email,
            full_name: users.full_name,
            department: users.department,
          })
          .from(users)
          .where(inArray(users.id, userIds));

  const requesterById = new Map(
    requesterRows.map((u) => [u.id, u.full_name || u.email])
  );
  const departmentById = new Map(
    requesterRows.map((u) => [u.id, u.department])
  );

  return (
    <div className="-m-8 p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">List of Requests</h1>
          <div className="text-sm text-gray-500 mt-1">Requester Dashboard</div>
        </div>
        <button
          type="button"
          aria-label="Notifications"
          className="rounded-full p-2 text-gray-700 hover:bg-black/5"
        >
          <Bell className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-6 rounded-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
        <div className="p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                placeholder="Filter (budget type)"
                className="h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className={statusPill("approved")}>Approved</span>
              <span className={statusPill("submitted")}>Pending</span>
              <span className={statusPill("revision_requested")}>Revision</span>
            </div>

            <div className="md:ml-auto">
              <Link
                href="/dashboard/budget/create"
                className="inline-flex items-center gap-2 rounded-md bg-[#358334] px-4 py-2 text-sm font-medium text-white hover:bg-[#2F5E3D]"
              >
                Create Request
              </Link>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] table-fixed text-sm">
            <colgroup>
              <col style={{ width: 140 }} />
              <col style={{ width: 360 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 90 }} />
            </colgroup>
            <thead>
              <tr className="text-left text-xs text-gray-500 border-t border-black/10">
                <th className="py-4 pl-6 pr-4 font-medium">BUDGET ID</th>
                <th className="py-4 px-4 font-medium">PROJECT NAME</th>
                <th className="py-4 px-3 font-medium">TYPE</th>
                <th className="py-4 px-3 font-medium">AMOUNT</th>
                <th className="py-4 px-3 font-medium">STATUS</th>
                <th className="py-4 px-3 font-medium">DATE</th>
                <th className="py-4 pl-3 pr-6 font-medium text-right">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody>
              {allBudgets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-500">
                    No requests yet.
                  </td>
                </tr>
              ) : (
                allBudgets.map((b) => {
                  const projectName =
                    firstItemByBudgetId.get(b.id) ?? "Budget Request";
                  const sub = departmentById.get(b.user_id) ?? "";
                  const requesterName = requesterById.get(b.user_id);

                  const statusText = statusLabel(b.status);

                  return (
                    <tr key={b.id} className="border-t border-black/10">
                      <td className="py-5 pl-6 pr-4 text-gray-900 font-medium whitespace-nowrap">
                        {`BUD-${b.budget_number}`}
                      </td>
                      <td className="py-5 px-4 align-top whitespace-normal">
                        <div className="font-medium text-gray-900 whitespace-normal wrap-break-word leading-snug">
                          {projectName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {sub || requesterName || b.user_id}
                        </div>
                      </td>
                      <td className="py-5 px-3 whitespace-nowrap">
                        <span className={typePill(b.budget_type)}>
                          {b.budget_type === "capex" ? "CapEx" : "OpEx"}
                        </span>
                      </td>
                      <td className="py-5 px-3 text-gray-900 whitespace-nowrap">
                        {formatPhp(b.total_amount)}
                      </td>
                      <td className="py-5 px-3 whitespace-nowrap">
                        <span className={statusPill(b.status)}>{statusText}</span>
                      </td>
                      <td className="py-5 px-3 text-gray-700 whitespace-nowrap">
                        {formatDateShort(b.created_at)}
                      </td>
                      <td className="py-5 pl-3 pr-6 text-right whitespace-nowrap">
                        <Link
                          href={`/dashboard/budget/${b.id}`}
                          className="inline-flex items-center gap-2 rounded-md bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300"
                        >
                          View
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
