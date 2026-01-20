import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { budgets, budgetItems, users } from "@/db/schema";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { Bell, Eye, Search } from "lucide-react";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";

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
  if (status === "verified_by_reviewer") return "Reviewed";
  if (status === "revision_requested") return "Revision";
  if (status === "verified") return "Verified";
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
  return `${base} bg-blue-100 text-blue-700`;
}

function typePill(type: "capex" | "opex") {
  const base =
    "inline-flex items-center rounded-md px-3 py-1 text-xs font-medium";
  return type === "capex"
    ? `${base} bg-blue-100 text-blue-700`
    : `${base} bg-purple-100 text-purple-700`;
}

type StatusFilter = "all" | "approved" | "pending" | "revision";

function getStatusFilterFromSearchParam(
  value: string | undefined,
): StatusFilter {
  if (value === "approved" || value === "pending" || value === "revision") {
    return value;
  }
  return "all";
}

function buildBudgetListHref(params: { q?: string; status?: StatusFilter }) {
  const sp = new URLSearchParams();
  const q = (params.q ?? "").trim();
  const status = params.status ?? "all";
  if (q) sp.set("q", q);
  if (status !== "all") sp.set("status", status);
  const qs = sp.toString();
  return qs ? `/dashboard/budget?${qs}` : "/dashboard/budget";
}

function includesQuery(haystack: string | null | undefined, q: string) {
  if (!haystack) return false;
  return haystack.toLowerCase().includes(q);
}

function normalizeDigits(value: string) {
  return value.replace(/[^0-9]/g, "");
}

export default async function BudgetIndexPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const qRaw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const statusRaw = Array.isArray(sp.status) ? sp.status[0] : sp.status;

  const q = (qRaw ?? "").trim().toLowerCase();
  const activeStatus = getStatusFilterFromSearchParam(statusRaw);

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

  const canCreateRequest =
    appUser.role === "requester" || appUser.role === "superadmin";

  const statusWhere =
    activeStatus === "approved"
      ? eq(budgets.status, "approved")
      : activeStatus === "revision"
        ? eq(budgets.status, "revision_requested")
        : activeStatus === "pending"
          ? inArray(budgets.status, [
              "submitted",
              "verified",
              "verified_by_reviewer",
            ])
          : undefined;

  const allBudgets = await db.query.budgets.findMany({
    where: statusWhere,
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
    requesterRows.map((u) => [u.id, u.full_name || u.email]),
  );
  const departmentById = new Map(
    requesterRows.map((u) => [u.id, u.department]),
  );

  const filteredBudgets = q
    ? allBudgets.filter((b) => {
        const projectName = firstItemByBudgetId.get(b.id) ?? "";
        const requesterName = requesterById.get(b.user_id) ?? "";
        const dept = departmentById.get(b.user_id) ?? "";

        const budLabel = `BUD-${b.budget_number}`;
        const statusText = statusLabel(b.status);
        const amountDigits = normalizeDigits(formatPhp(b.total_amount));
        const qDigits = normalizeDigits(q);

        return (
          includesQuery(b.id, q) ||
          includesQuery(budLabel, q) ||
          includesQuery(String(b.budget_number), q) ||
          includesQuery(projectName, q) ||
          includesQuery(requesterName, q) ||
          includesQuery(dept, q) ||
          includesQuery(b.budget_type, q) ||
          includesQuery(b.status, q) ||
          includesQuery(statusText, q) ||
          (qDigits.length >= 3 && amountDigits.includes(qDigits))
        );
      })
    : allBudgets;

  return (
    <div className="-m-8 p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">List of Requests</h1>
          <div className="text-sm text-gray-500 mt-1">
            History of all requests
          </div>
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
            <form
              action="/dashboard/budget"
              method="GET"
              className="relative w-full md:w-96"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                name="q"
                defaultValue={qRaw ?? ""}
                placeholder="Search (BUD-#, project, requester, dept, status…)"
                className="h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400"
              />
              {activeStatus !== "all" ? (
                <input type="hidden" name="status" value={activeStatus} />
              ) : null}
            </form>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={buildBudgetListHref({
                  q: qRaw ?? "",
                  status: "approved",
                })}
                className={
                  activeStatus === "approved"
                    ? "inline-flex items-center rounded-md px-3 py-1 text-xs font-medium bg-green-100 text-green-700 ring-2 ring-green-400"
                    : "inline-flex items-center rounded-md px-3 py-1 text-xs font-medium bg-gray-100 text-gray-500 ring-1 ring-gray-300 hover:ring-2 hover:ring-gray-400 transition-all cursor-pointer"
                }
              >
                Approved
              </Link>
              <Link
                href={buildBudgetListHref({ q: qRaw ?? "", status: "pending" })}
                className={
                  activeStatus === "pending"
                    ? "inline-flex items-center rounded-md px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 ring-2 ring-blue-400"
                    : "inline-flex items-center rounded-md px-3 py-1 text-xs font-medium bg-gray-100 text-gray-500 ring-1 ring-gray-300 hover:ring-2 hover:ring-gray-400 transition-all cursor-pointer"
                }
              >
                Pending
              </Link>
              <Link
                href={buildBudgetListHref({
                  q: qRaw ?? "",
                  status: "revision",
                })}
                className={
                  activeStatus === "revision"
                    ? "inline-flex items-center rounded-md px-3 py-1 text-xs font-medium bg-orange-100 text-orange-700 ring-2 ring-orange-400"
                    : "inline-flex items-center rounded-md px-3 py-1 text-xs font-medium bg-gray-100 text-gray-500 ring-1 ring-gray-300 hover:ring-2 hover:ring-gray-400 transition-all cursor-pointer"
                }
              >
                Revision
              </Link>

              {(q || activeStatus !== "all") && (
                <Link
                  href="/dashboard/budget"
                  className="text-sm text-gray-600 hover:underline"
                >
                  Clear
                </Link>
              )}
            </div>

            {canCreateRequest && (
              <div className="md:ml-auto">
                <Link
                  href="/dashboard/budget/create"
                  className="inline-flex items-center gap-2 rounded-md bg-[#358334] px-4 py-2 text-sm font-medium text-white hover:bg-[#2F5E3D]"
                >
                  Create Request
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-245 table-fixed text-sm">
            <colgroup>
              <col style={{ width: 140 }} />
              <col style={{ width: 240 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 120 }} />
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
              {filteredBudgets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-500">
                    No requests found.
                  </td>
                </tr>
              ) : (
                filteredBudgets.map((b) => {
                  const projectName =
                    firstItemByBudgetId.get(b.id) ?? "Budget Request";
                  const sub = departmentById.get(b.user_id) ?? "";
                  const requesterName = requesterById.get(b.user_id);

                  const statusText = statusLabel(b.status);

                  return (
                    <tr
                      key={b.id}
                      className={`border-t border-black/10 ${
                        b.status === "rejected"
                          ? "opacity-60 bg-gray-50/30"
                          : ""
                      }`}
                    >
                      <td className="py-5 pl-6 pr-4 text-gray-900 font-medium whitespace-nowrap">
                        {`BUD-${b.budget_number}`}
                      </td>
                      <td className="py-5 px-4 align-top whitespace-normal">
                        <div className="font-medium text-gray-900 whitespace-normal wrap-break-word leading-snug line-clamp-2">
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
                        <span className={statusPill(b.status)}>
                          {statusText}
                        </span>
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
