import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { budgets, budgetItems } from "@/db/schema";
import { desc, eq, inArray, and, ne } from "drizzle-orm";
import { Bell, Search, Eye } from "lucide-react";

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

function typePill(type: "capex" | "opex") {
  const base =
    "inline-flex items-center rounded-md px-3 py-1 text-xs font-medium";
  return type === "capex"
    ? `${base} bg-blue-100 text-blue-700`
    : `${base} bg-purple-100 text-purple-700`;
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
  if (status === "verified") return `${base} bg-green-100 text-green-700`;
  if (status === "revision_requested")
    return `${base} bg-orange-100 text-orange-700`;
  if (status === "rejected") return `${base} bg-red-100 text-red-700`;
  if (status === "draft") return `${base} bg-gray-200 text-gray-700`;
  return `${base} bg-blue-100 text-blue-700`;
}

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

function buildRequestsHref(params: { q?: string; status?: StatusFilter }) {
  const sp = new URLSearchParams();
  const q = (params.q ?? "").trim();
  const status = params.status ?? "all";
  if (q) sp.set("q", q);
  if (status !== "all") sp.set("status", status);
  const qs = sp.toString();
  return qs ? `/dashboard/requests?${qs}` : "/dashboard/requests";
}

function includesQuery(haystack: string | null | undefined, q: string) {
  if (!haystack) return false;
  return haystack.toLowerCase().includes(q);
}

function normalizeDigits(value: string) {
  return value.replace(/[^0-9]/g, "");
}

export default async function RequestsPage({
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

  const statusWhere =
    activeStatus === "approved"
      ? eq(budgets.status, "approved")
      : activeStatus === "revision"
        ? eq(budgets.status, "revision_requested")
        : activeStatus === "draft"
          ? eq(budgets.status, "draft")
          : activeStatus === "pending"
            ? inArray(budgets.status, [
                "submitted",
                "verified",
                "verified_by_reviewer",
              ])
            : undefined;

  const myBudgets = await db.query.budgets.findMany({
    where: statusWhere
      ? and(eq(budgets.user_id, user.id), statusWhere)
      : and(eq(budgets.user_id, user.id), ne(budgets.status, "draft")),
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

  // Client-side filtering for search
  const filteredBudgets = !q
    ? myBudgets
    : myBudgets.filter((b) => {
        const budDisplayId = `bud-${b.budget_number}`;
        const budNum = String(b.budget_number);
        const projectCode = b.project_code;
        const projectName = firstItem.get(b.id) ?? "Budget Request";
        const status = statusLabel(b.status);
        const type = b.budget_type;
        const amountDigits = normalizeDigits(b.total_amount);

        return (
          includesQuery(b.id, q) ||
          includesQuery(projectCode, q) ||
          includesQuery(budDisplayId, q) ||
          includesQuery(budNum, q) ||
          includesQuery(projectName, q) ||
          includesQuery(type, q) ||
          includesQuery(status, q) ||
          includesQuery(amountDigits, normalizeDigits(q))
        );
      });

  return (
    <div className="-m-8 p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Requests</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your budget requests
          </p>
        </div>
        <button
          type="button"
          aria-label="Notifications"
          className="rounded-full p-2 text-gray-700 hover:bg-black/5"
        >
          <Bell className="h-5 w-5" />
        </button>
      </div>

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
        <div className="p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <form
              action="/dashboard/requests"
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

            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              {[
                { label: "Approved", val: "approved", color: "green" },
                { label: "Pending", val: "pending", color: "blue" },
                { label: "Revision", val: "revision", color: "orange" },
                { label: "Draft", val: "draft", color: "gray" },
              ].map((tab) => {
                const isActive = activeStatus === tab.val;
                const activeClass =
                  tab.color === "green"
                    ? "bg-green-50 text-green-700 border-green-200 ring-green-200"
                    : tab.color === "blue"
                      ? "bg-blue-50 text-blue-700 border-blue-200 ring-blue-200"
                      : tab.color === "orange"
                        ? "bg-orange-50 text-orange-700 border-orange-200 ring-orange-200"
                        : "bg-gray-200 text-gray-700 border-gray-200 ring-gray-200";

                return (
                  <Link
                    key={tab.val}
                    href={buildRequestsHref({
                      q: qRaw ?? "",
                      status: tab.val as StatusFilter,
                    })}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-all border
                      ${
                        isActive
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
                  href="/dashboard/requests"
                  className="text-sm text-gray-500 hover:text-gray-900 ml-2"
                >
                  Clear filters
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                <th className="py-6 pl-8 pr-4 font-semibold w-[140px]">
                  Budget ID
                </th>
                <th className="py-6 px-4 font-semibold w-[320px]">
                  Project Name
                </th>
                <th className="py-6 px-4 font-semibold w-[100px]">Type</th>
                <th className="py-6 px-4 font-semibold w-[150px]">Amount</th>
                <th className="py-6 px-4 font-semibold w-[120px]">Status</th>
                <th className="py-6 px-4 font-semibold w-[120px]">Date</th>
                <th className="py-6 px-4 pr-8 font-semibold text-right w-[100px]">
                  Action
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
                    {q || activeStatus !== "all"
                      ? "No requests match your search."
                      : "No requests yet."}
                  </td>
                </tr>
              ) : (
                filteredBudgets.map((b) => {
                  const displayId = b.project_code
                    ? b.project_code
                    : `BUD-${b.budget_number}`;

                  const editHref = b.project_code
                    ? `/dashboard/budget/edit/${encodeURIComponent(b.project_code)}`
                    : `/dashboard/budget/edit/BUD-${String(b.budget_number).padStart(3, "0")}`;

                  const viewHref = b.project_code
                    ? `/dashboard/requests/${encodeURIComponent(b.project_code)}`
                    : `/dashboard/requests/${b.id}`;

                  const projectName = firstItem.get(b.id) ?? "Budget Request";
                  return (
                    <tr
                      key={b.id}
                      className={`border-t border-black/5 hover:bg-gray-50/50 ${
                        b.status === "rejected"
                          ? "opacity-60 bg-gray-50/30"
                          : ""
                      }`}
                    >
                      <td className="py-4 pl-6 pr-4">
                        <div className="font-medium text-gray-900">
                          {displayId}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium text-gray-900 line-clamp-2 leading-snug">
                          {projectName}
                        </div>
                      </td>
                      <td className="py-4 px-3">
                        <span className={typePill(b.budget_type)}>
                          {b.budget_type === "capex" ? "CapEx" : "OpEx"}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-gray-800 font-medium">
                        {formatPhp(b.total_amount)}
                      </td>
                      <td className="py-4 px-3">
                        <span className={statusPill(b.status)}>
                          {statusLabel(b.status)}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-gray-600">
                        {formatDateShort(new Date(b.created_at))}
                      </td>
                      <td className="py-5 px-4 pr-8 text-right">
                        {b.status === "revision_requested" ? (
                          <Link
                            href={editHref}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-100 px-3.5 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-200 transition-colors shadow-sm"
                          >
                            Edit
                          </Link>
                        ) : (
                          <Link
                            href={viewHref}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2C3E50] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#1a252f] transition-colors shadow-sm"
                          >
                            View <Eye className="h-3.5 w-3.5" />
                          </Link>
                        )}
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
