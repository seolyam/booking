import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { budgets, budgetItems } from "@/db/schema";
import { desc, eq, inArray, and } from "drizzle-orm";
import { Bell, Search } from "lucide-react";

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
  if (status === "revision_requested")
    return `${base} bg-orange-100 text-orange-700`;
  if (status === "rejected") return `${base} bg-red-100 text-red-700`;
  if (status === "draft") return `${base} bg-gray-200 text-gray-700`;
  return `${base} bg-amber-100 text-amber-700`;
}

function chipClass(active: boolean) {
  return active
    ? "ring-2 cursor-default"
    : "bg-gray-100 text-gray-500 ring-1 ring-gray-300 hover:ring-2 hover:ring-gray-400 transition-all cursor-pointer";
}

function activeChipColor(filterType: string) {
  if (filterType === "approved")
    return "bg-green-100 text-green-700 ring-green-400";
  if (filterType === "revision")
    return "bg-orange-100 text-orange-700 ring-orange-400";
  if (filterType === "pending")
    return "bg-amber-100 text-amber-700 ring-amber-400";
  if (filterType === "draft") return "bg-gray-200 text-gray-700 ring-gray-400";
  return "bg-blue-100 text-blue-700 ring-blue-400";
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

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
      : eq(budgets.user_id, user.id),
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
        const projectName = firstItem.get(b.id) ?? "Budget Request";
        const status = statusLabel(b.status);
        const type = b.budget_type;
        const amountDigits = normalizeDigits(b.total_amount);

        return (
          includesQuery(b.id, q) ||
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
                placeholder="Search (BUD-#, project, type, status…)"
                className="h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400"
              />
              {activeStatus !== "all" ? (
                <input type="hidden" name="status" value={activeStatus} />
              ) : null}
            </form>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={buildRequestsHref({ q: qRaw ?? "", status: "approved" })}
                className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-medium ${
                  activeStatus === "approved"
                    ? activeChipColor("approved")
                    : chipClass(false)
                }`}
              >
                Approved
              </Link>
              <Link
                href={buildRequestsHref({ q: qRaw ?? "", status: "pending" })}
                className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-medium ${
                  activeStatus === "pending"
                    ? activeChipColor("pending")
                    : chipClass(false)
                }`}
              >
                Pending
              </Link>
              <Link
                href={buildRequestsHref({ q: qRaw ?? "", status: "revision" })}
                className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-medium ${
                  activeStatus === "revision"
                    ? activeChipColor("revision")
                    : chipClass(false)
                }`}
              >
                Revision
              </Link>
              <Link
                href={buildRequestsHref({ q: qRaw ?? "", status: "draft" })}
                className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-medium ${
                  activeStatus === "draft"
                    ? activeChipColor("draft")
                    : chipClass(false)
                }`}
              >
                Draft
              </Link>

              {(q || activeStatus !== "all") && (
                <Link
                  href="/dashboard/requests"
                  className="text-sm text-gray-600 hover:underline"
                >
                  Clear
                </Link>
              )}
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
                <th className="py-4 px-3 pr-6 font-medium text-right">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody>
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
                  const budDisplayId = `BUD-${b.budget_number}`;
                  const projectName = firstItem.get(b.id) ?? "Budget Request";
                  return (
                    <tr
                      key={b.id}
                      className="border-t border-black/5 hover:bg-gray-50/50"
                    >
                      <td className="py-4 pl-6 pr-4">
                        <div className="font-medium text-gray-900">
                          {budDisplayId}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium text-gray-900 line-clamp-1">
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
                      <td className="py-4 px-3 pr-6 text-right">
                        <Link
                          href={`/dashboard/requests/${b.id}`}
                          className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                          View
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
