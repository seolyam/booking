import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { budgets, budgetItems } from "@/db/schema";
import { desc, eq, inArray, and, ne } from "drizzle-orm";
import { Bell, Search, Eye, Plus } from "lucide-react";
import {
  MobileCardList,
  type MobileCardData,
} from "@/components/ui/mobile-card";

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

function statusToVariant(
  status: string,
): "success" | "warning" | "error" | "info" | "default" {
  if (status === "approved" || status === "verified") return "success";
  if (status === "revision_requested") return "warning";
  if (status === "rejected") return "error";
  if (status === "draft") return "default";
  return "info";
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

  // Prepare mobile card data
  const mobileCards: MobileCardData[] = filteredBudgets.map((b) => {
    const budDisplayId = `BUD-${b.budget_number}`;
    const projectCode = b.project_code;
    const displayId = projectCode ?? budDisplayId;
    const viewHref = projectCode
      ? `/dashboard/requests/${encodeURIComponent(projectCode)}`
      : `/dashboard/requests/${b.id}`;
    const editHref = projectCode
      ? `/dashboard/budget/edit/${encodeURIComponent(projectCode)}`
      : `/dashboard/budget/edit/BUD-${String(b.budget_number).padStart(3, "0")}`;
    const projectName = firstItem.get(b.id) ?? "Budget Request";

    return {
      id: b.id,
      displayId,
      title: projectName,
      type: b.budget_type === "capex" ? "CapEx" : "OpEx",
      amount: formatPhp(b.total_amount),
      status: {
        label: statusLabel(b.status),
        variant: statusToVariant(b.status),
      },
      date: formatDateShort(new Date(b.created_at)),
      actionHref: b.status === "revision_requested" ? editHref : viewHref,
      actionLabel: b.status === "revision_requested" ? "Edit" : "View",
    };
  });

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8">
      {/* Mobile Header */}
      <div className="md:hidden mb-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900">Your Requests</h1>
          <Link
            href="/dashboard/budget/create"
            className="h-10 w-10 rounded-full bg-[#358334] text-white flex items-center justify-center shadow-lg"
            aria-label="Create Request"
          >
            <Plus className="h-5 w-5" />
          </Link>
        </div>

        {/* Mobile Search */}
        <form
          action="/dashboard/requests"
          method="GET"
          className="relative mb-3"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            name="q"
            defaultValue={qRaw ?? ""}
            placeholder="Search requests..."
            className="h-12 w-full rounded-xl bg-gray-100 pl-11 pr-4 text-base outline-none focus:ring-2 focus:ring-[#358334]/20 focus:bg-white transition-all"
          />
          {activeStatus !== "all" ? (
            <input type="hidden" name="status" value={activeStatus} />
          ) : null}
        </form>

        {/* Mobile Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <Link
            href={buildRequestsHref({ q: qRaw ?? "", status: "all" })}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeStatus === "all"
                ? "bg-gray-800 text-white"
                : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            All
          </Link>
          <Link
            href={buildRequestsHref({ q: qRaw ?? "", status: "approved" })}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeStatus === "approved"
                ? "bg-green-500 text-white"
                : "bg-white text-green-600 border border-green-200"
            }`}
          >
            Approved
          </Link>
          <Link
            href={buildRequestsHref({ q: qRaw ?? "", status: "pending" })}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeStatus === "pending"
                ? "bg-blue-500 text-white"
                : "bg-white text-blue-600 border border-blue-200"
            }`}
          >
            Pending
          </Link>
          <Link
            href={buildRequestsHref({ q: qRaw ?? "", status: "revision" })}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeStatus === "revision"
                ? "bg-orange-500 text-white"
                : "bg-white text-orange-600 border border-orange-200"
            }`}
          >
            Revision
          </Link>
          <Link
            href={buildRequestsHref({ q: qRaw ?? "", status: "draft" })}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeStatus === "draft"
                ? "bg-gray-500 text-white"
                : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            Draft
          </Link>
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden">
        <MobileCardList
          items={mobileCards}
          emptyMessage={
            q || activeStatus !== "all"
              ? "No requests match your search."
              : "No requests yet."
          }
        />
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex items-center justify-between mb-6">
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

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
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
                placeholder="Search (BUD-#, request name, type, status…)"
                className="h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400"
              />
              {activeStatus !== "all" ? (
                <input type="hidden" name="status" value={activeStatus} />
              ) : null}
            </form>

            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <Link
                href={buildRequestsHref({ q: qRaw ?? "", status: "approved" })}
                className={
                  activeStatus === "approved"
                    ? "px-4 md:px-6 py-2 md:py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all border min-h-[44px] md:min-h-0 bg-green-50 text-green-600 border-green-200 ring-2 ring-green-400"
                    : "px-4 md:px-6 py-2 md:py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all border min-h-[44px] md:min-h-0 bg-gray-100 text-gray-500 border-gray-300 hover:border-gray-400"
                }
              >
                Approved
              </Link>
              <Link
                href={buildRequestsHref({ q: qRaw ?? "", status: "pending" })}
                className={
                  activeStatus === "pending"
                    ? "px-4 md:px-6 py-2 md:py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all border min-h-[44px] md:min-h-0 bg-blue-50 text-blue-700 border-blue-200 ring-2 ring-blue-400"
                    : "px-4 md:px-6 py-2 md:py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all border min-h-[44px] md:min-h-0 bg-gray-100 text-gray-500 border-gray-300 hover:border-gray-400"
                }
              >
                Pending
              </Link>
              <Link
                href={buildRequestsHref({ q: qRaw ?? "", status: "revision" })}
                className={
                  activeStatus === "revision"
                    ? "px-4 md:px-6 py-2 md:py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all border min-h-[44px] md:min-h-0 bg-orange-50 text-orange-700 border-orange-200 ring-2 ring-orange-400"
                    : "px-4 md:px-6 py-2 md:py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all border min-h-[44px] md:min-h-0 bg-gray-100 text-gray-500 border-gray-300 hover:border-gray-400"
                }
              >
                Revision
              </Link>
              <Link
                href={buildRequestsHref({ q: qRaw ?? "", status: "draft" })}
                className={
                  activeStatus === "draft"
                    ? "px-4 md:px-6 py-2 md:py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all border min-h-[44px] md:min-h-0 bg-gray-200 text-gray-700 border-gray-200 ring-2 ring-gray-400"
                    : "px-4 md:px-6 py-2 md:py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all border min-h-[44px] md:min-h-0 bg-gray-100 text-gray-500 border-gray-300 hover:border-gray-400"
                }
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
          <table className="w-full min-w-245 table-fixed text-sm">
            <colgroup>
              <col style={{ width: 140 }} />
              <col style={{ width: 220 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 120 }} />
            </colgroup>
            <thead>
              <tr className="text-left text-xs text-gray-500 border-t border-black/10">
                <th className="py-4 pl-6 pr-4 font-medium">BUDGET ID</th>
                <th className="py-4 px-4 font-medium">REQUEST NAME</th>
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
                  const projectCode = b.project_code;
                  const displayId = projectCode ?? budDisplayId;
                  const editHref = projectCode
                    ? `/dashboard/budget/edit/${encodeURIComponent(projectCode)}`
                    : `/dashboard/budget/edit/BUD-${String(b.budget_number).padStart(3, "0")}`;
                  const viewHref = projectCode
                    ? `/dashboard/requests/${encodeURIComponent(projectCode)}`
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
                      <td className="py-4 px-3 pr-6 text-right whitespace-nowrap">
                        {b.status === "revision_requested" ? (
                          <Link
                            href={editHref}
                            className="inline-flex items-center gap-1.5 rounded-md bg-orange-100 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-200 transition-colors"
                          >
                            Edit
                          </Link>
                        ) : (
                          <Link
                            href={viewHref}
                            className="inline-flex items-center gap-1.5 rounded-md bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300 transition-colors"
                          >
                            View <Eye className="h-4 w-4" />
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
