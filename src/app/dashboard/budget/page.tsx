import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { budgets, budgetItems, users } from "@/db/schema";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { Bell, Eye, Search } from "lucide-react";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";

// Force dynamic rendering - requires auth and DB access
export const dynamic = "force-dynamic";

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

/* Helper Functions */
function typePill(type: "capex" | "opex") {
  const cls =
    type === "capex"
      ? "bg-blue-100 text-blue-700"
      : "bg-purple-100 text-purple-700";
  return `inline-flex items-center justify-center rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide min-w-[60px] ${cls}`;
}

function statusPill(status: string) {
  let cls = "bg-gray-100 text-gray-600";
  if (status === "approved") {
    cls = "bg-green-50 text-green-600";
  } else if (
    status === "submitted" ||
    status === "verified" ||
    status === "verified_by_reviewer"
  ) {
    cls = "bg-blue-50 text-blue-600";
  } else if (status === "revision_requested") {
    cls = "bg-orange-50 text-orange-600";
  } else if (status === "rejected") {
    cls = "bg-red-50 text-red-600";
  } else if (status === "verified") {
    cls = "bg-indigo-50 text-indigo-600";
  }

  return `inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${cls}`;
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

  const user = await getAuthUser();

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
      const projectCode = (b as { project_code?: string | null })
        .project_code;
      const statusText = statusLabel(b.status);
      const amountDigits = normalizeDigits(formatPhp(b.total_amount));
      const qDigits = normalizeDigits(q);

      return (
        includesQuery(b.id, q) ||
        includesQuery(projectCode, q) ||
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
    <div className="w-full max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-8">
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

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        {/* Filter Bar */}
        <div className="p-5 md:p-6 border-b border-gray-100">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            {/* Search */}
            <form
              action="/dashboard/budget"
              method="GET"
              className="relative w-full md:w-96"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                name="q"
                defaultValue={qRaw ?? ""}
                placeholder="Search..."
                className="h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              />
              {activeStatus !== "all" ? (
                <input type="hidden" name="status" value={activeStatus} />
              ) : null}
            </form>

            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              {[
                { label: "Approved", val: "approved", color: "green" },
                { label: "Pending", val: "pending", color: "blue" },
                { label: "Revision", val: "revision", color: "orange" },
              ].map((tab) => {
                const isActive = activeStatus === tab.val;
                const activeClass =
                  tab.color === "green"
                    ? "bg-green-50 text-green-700 border-green-200 ring-green-200"
                    : tab.color === "blue"
                      ? "bg-blue-50 text-blue-700 border-blue-200 ring-blue-200"
                      : "bg-orange-50 text-orange-700 border-orange-200 ring-orange-200";

                return (
                  <Link
                    key={tab.val}
                    href={buildBudgetListHref({
                      q: qRaw ?? "",
                      status: tab.val as StatusFilter,
                    })}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-all border
                      ${isActive
                        ? activeClass + " border ring-1"
                        : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                      }
                    `}
                  >
                    {tab.label}
                  </Link>
                );
              })}

              {(q || activeStatus !== "all") && (
                <Link
                  href="/dashboard/budget"
                  className="text-sm text-gray-500 hover:text-gray-900 ml-2"
                >
                  Clear filters
                </Link>
              )}
            </div>

            {canCreateRequest && (
              <div className="md:ml-auto">
                <Link
                  href="/dashboard/budget/create"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#358334] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2F5E3D] transition-colors shadow-sm"
                >
                  Create Request
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                <th className="py-6 pl-8 pr-4 font-semibold w-[140px]">
                  PROJECT ID
                </th>
                <th className="py-6 px-4 font-semibold w-[320px]">
                  PROJECT NAME
                </th>
                <th className="py-6 px-4 font-semibold w-[100px]">TYPE</th>
                <th className="py-6 px-4 font-semibold w-[150px]">AMOUNT</th>
                <th className="py-6 px-4 font-semibold w-[120px]">STATUS</th>
                <th className="py-6 px-4 font-semibold w-[120px]">DATE</th>
                <th className="py-6 px-4 pr-8 font-semibold text-right w-[100px]">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredBudgets.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16 text-center text-sm text-gray-500"
                  >
                    No requests found.
                  </td>
                </tr>
              ) : (
                filteredBudgets.map((b) => {
                  const projectName =
                    firstItemByBudgetId.get(b.id) ?? "Budget Request";
                  const sub = departmentById.get(b.user_id) ?? "";
                  const requesterName = requesterById.get(b.user_id);
                  const projectCode = (b as { project_code?: string | null })
                    .project_code;
                  const displayId = projectCode ?? `BUD-${b.budget_number}`;
                  const viewHref = projectCode
                    ? `/dashboard/budget/${encodeURIComponent(projectCode)}`
                    : `/dashboard/budget/BUD-${String(b.budget_number).padStart(3, "0")}`;

                  const statusText = statusLabel(b.status);

                  return (
                    <tr
                      key={b.id}
                      className={`group hover:bg-gray-50/50 transition-colors ${b.status === "rejected"
                        ? "opacity-60 bg-gray-50/30"
                        : ""
                        }`}
                    >
                      <td className="py-5 pl-8 pr-4">
                        <span className="text-sm font-medium text-gray-400">
                          {displayId}
                        </span>
                      </td>
                      <td className="py-5 px-4">
                        <div>
                          <div className="font-bold text-gray-900 text-sm">
                            {projectName}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5 font-normal">
                            {sub || requesterName || b.user_id}
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-4">
                        <span className={typePill(b.budget_type)}>
                          {b.budget_type === "capex" ? "CapEx" : "OpEx"}
                        </span>
                      </td>
                      <td className="py-5 px-4">
                        <span className="font-bold text-gray-900 text-sm">
                          {formatPhp(b.total_amount)}
                        </span>
                      </td>
                      <td className="py-5 px-4">
                        <span className={statusPill(b.status)}>
                          {statusText}
                        </span>
                      </td>
                      <td className="py-5 px-4 text-sm text-gray-400 font-medium">
                        {formatDateShort(b.created_at)}
                      </td>
                      <td className="py-5 px-4 pr-8 text-right">
                        <Link
                          href={viewHref}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#2C3E50] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#1a252f] transition-colors shadow-sm"
                        >
                          View
                          <Eye className="h-3.5 w-3.5" />
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
