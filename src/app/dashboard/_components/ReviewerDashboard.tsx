"use client";

import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  TrendingUp,
  Search,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import {
  MobileCardList,
  type MobileCardData,
} from "@/components/ui/mobile-card";

export type ReviewerDashboardRow = {
  budgetId: string;
  displayId: string;
  projectName: string;
  projectSub: string;
  type: "CapEx" | "OpEx";
  amount: string;
  statusLabel: "Reviewed" | "Pending" | "Revision" | "Rejected" | "Verified";
  dateLabel: string;
  actionLabel: "View" | "Review";
  actionHref: string;
};

export default function ReviewerDashboard({
  stats,
  rows,
  showStats = true,
  activeFilter,
  searchQuery,
  enableClientFiltering = false,
}: {
  stats: {
    reviewedToday: number;
    pendingReview: number;
    awaitingApproval: number;
    needsRevision: number;
  };
  rows: ReviewerDashboardRow[];
  showStats?: boolean;
  activeFilter?: "all" | "pending" | "reviewed";
  searchQuery?: string;
  enableClientFiltering?: boolean;
}) {
  const [clientFilter, setClientFilter] = useState<
    "all" | "pending" | "reviewed"
  >(activeFilter ?? "all");
  const [clientSearch, setClientSearch] = useState(searchQuery ?? "");
  const deferredClientSearch = useDeferredValue(clientSearch);

  const normalizedSearch = deferredClientSearch.trim().toLowerCase();

  const filterableRows = useMemo(() => {
    if (!enableClientFiltering) return rows;

    return rows.filter((r) => {
      const matchesFilter =
        clientFilter === "all"
          ? true
          : clientFilter === "pending"
            ? r.statusLabel === "Pending"
            : r.statusLabel === "Reviewed";

      if (!matchesFilter) return false;
      if (!normalizedSearch) return true;

      const haystack = `${r.displayId} ${r.projectName} ${r.projectSub}`
        .toLowerCase()
        .trim();
      return haystack.includes(normalizedSearch);
    });
  }, [enableClientFiltering, rows, clientFilter, normalizedSearch]);

  // Convert to mobile card data
  const mobileCards: MobileCardData[] = filterableRows.map((r) => ({
    id: r.budgetId,
    displayId: r.displayId,
    title: r.projectName,
    subtitle: r.projectSub,
    type: r.type,
    amount: r.amount,
    status: {
      label: r.statusLabel,
      variant:
        r.statusLabel === "Pending"
          ? "info"
          : r.statusLabel === "Reviewed"
            ? "warning"
            : r.statusLabel === "Verified"
              ? "success"
              : r.statusLabel === "Revision"
                ? "warning"
                : r.statusLabel === "Rejected"
                  ? "error"
                  : "default",
    },
    date: r.dateLabel,
    actionHref: r.actionHref,
    actionLabel: r.actionLabel,
  }));

  const statCard = (
    icon: React.ReactNode,
    value: number,
    label: string,
    iconBg: string,
    href: string,
  ) => (
    <Link
      href={href}
      className="rounded-xl md:rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 md:p-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group border border-gray-100/50 hover:-translate-y-1"
    >
      <div
        className={`h-10 w-10 md:h-12 md:w-12 rounded-lg md:rounded-xl flex items-center justify-center ${iconBg} transition-transform group-hover:scale-110 shadow-sm`}
      >
        {icon}
      </div>
      <div className="mt-3 md:mt-6 text-2xl md:text-4xl font-bold text-gray-900 tracking-tight">
        {value}
      </div>
      <div className="mt-0.5 md:mt-1 text-[10px] md:text-sm font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </div>
    </Link>
  );

  const typePill = (type: "CapEx" | "OpEx") => {
    const cls =
      type === "CapEx"
        ? "bg-blue-100 text-blue-600"
        : "bg-purple-100 text-purple-600";
    return (
      <span
        className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${cls}`}
      >
        {type}
      </span>
    );
  };

  const statusPill = (s: ReviewerDashboardRow["statusLabel"]) => {
    const cls =
      s === "Reviewed"
        ? "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200"
        : s === "Pending"
          ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
          : s === "Verified"
            ? "bg-green-50 text-green-700 ring-1 ring-green-200"
            : s === "Revision"
              ? "bg-orange-50 text-orange-700 ring-1 ring-orange-200"
              : s === "Rejected"
                ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                : "bg-gray-50 text-gray-700 ring-1 ring-gray-200";

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${cls}`}>
        {s}
      </span>
    );
  };

  const filterChip = (
    label: string,
    filter: "all" | "pending" | "reviewed",
    href: string,
  ) => {
    const isActive = activeFilter === filter;
    const baseClass =
      "inline-flex items-center rounded-md px-3 py-1 text-xs font-medium transition-all";
    const colorClass = isActive
      ? filter === "pending"
        ? "bg-blue-100 text-blue-700 ring-2 ring-blue-400"
        : filter === "reviewed"
          ? "bg-yellow-100 text-yellow-700 ring-2 ring-yellow-400"
          : "bg-gray-100 text-gray-700 ring-2 ring-gray-400"
      : "bg-gray-100 text-gray-500 ring-1 ring-gray-300 hover:ring-2 hover:ring-gray-400";

    return (
      <Link href={href} className={`${baseClass} ${colorClass}`}>
        {label}
      </Link>
    );
  };

  const filterBtn = (label: string, filter: "all" | "pending" | "reviewed") => {
    const isActive = clientFilter === filter;

    const baseClass =
      "px-4 md:px-6 py-2 md:py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all border min-h-[44px] md:min-h-0";

    const colorClass = isActive
      ? filter === "pending"
        ? "bg-blue-50 text-blue-700 border-blue-200 ring-2 ring-blue-400"
        : filter === "reviewed"
          ? "bg-yellow-50 text-yellow-700 border-yellow-200 ring-2 ring-yellow-400"
          : "bg-gray-100 text-gray-700 border-gray-200 ring-2 ring-gray-400"
      : "bg-gray-100 text-gray-500 border-gray-300 hover:border-gray-400";

    return (
      <button
        type="button"
        onClick={() => setClientFilter(filter)}
        className={`${baseClass} ${colorClass}`}
      >
        {label}
      </button>
    );
  };

  const actionButton = (r: ReviewerDashboardRow) => {
    const base =
      "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold shadow-sm transition-all";

    if (r.actionLabel === "Review") {
      return (
        <Link
          href={r.actionHref}
          className={`${base} bg-orange-500 text-white hover:bg-orange-600 hover:shadow-orange-200`}
        >
          Review <Eye className="h-3.5 w-3.5" />
        </Link>
      );
    }

    return (
      <Link
        href={r.actionHref}
        className={`${base} bg-gray-700 text-white hover:bg-gray-800`}
      >
        View <Eye className="h-3.5 w-3.5" />
      </Link>
    );
  };

  return (
    <div className="space-y-6 md:space-y-10">
      {showStats && (
        <>
          <div className="text-xl md:text-2xl font-bold text-gray-900">
            Budgets to Review
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-6 md:grid-cols-4">
            {statCard(
              <CheckCircle2 className="h-6 w-6 text-green-500" />,
              stats.reviewedToday,
              "Reviewed today",
              "bg-green-50",
              "/dashboard/reviewer/review?status=reviewed",
            )}
            {statCard(
              <Clock className="h-6 w-6 text-yellow-500" />,
              stats.pendingReview,
              "Pending review",
              "bg-yellow-50",
              "/dashboard/reviewer/review?status=pending",
            )}
            {statCard(
              <TrendingUp className="h-6 w-6 text-blue-500" />,
              stats.awaitingApproval,
              "Awaiting Approval",
              "bg-blue-50",
              "/dashboard/reviewer/review?status=verified",
            )}
            {statCard(
              <AlertCircle className="h-6 w-6 text-orange-400" />,
              stats.needsRevision,
              "Needs revision",
              "bg-orange-50",
              "/dashboard/reviewer/review?status=revision",
            )}
          </div>
        </>
      )}

      {/* Mobile-only search and filters */}
      <div className="md:hidden mb-4">
        {enableClientFiltering ? (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Search..."
              className="h-12 w-full rounded-xl bg-gray-100 pl-11 pr-4 text-base outline-none focus:ring-2 focus:ring-[#358334]/20 focus:bg-white transition-all"
            />
          </div>
        ) : (
          <form
            action="/dashboard/reviewer/review"
            method="GET"
            className="relative mb-3"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              name="q"
              defaultValue={searchQuery ?? ""}
              placeholder="Search..."
              className="h-12 w-full rounded-xl bg-gray-100 pl-11 pr-4 text-base outline-none focus:ring-2 focus:ring-[#358334]/20 focus:bg-white transition-all"
            />
            {activeFilter && activeFilter !== "all" ? (
              <input type="hidden" name="status" value={activeFilter} />
            ) : null}
          </form>
        )}

        {/* Mobile Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {enableClientFiltering ? (
            <>
              <button
                type="button"
                onClick={() => setClientFilter("all")}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  clientFilter === "all"
                    ? "bg-gray-800 text-white"
                    : "bg-white text-gray-600 border border-gray-200"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setClientFilter("pending")}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  clientFilter === "pending"
                    ? "bg-blue-500 text-white"
                    : "bg-white text-blue-600 border border-blue-200"
                }`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setClientFilter("reviewed")}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  clientFilter === "reviewed"
                    ? "bg-yellow-500 text-white"
                    : "bg-white text-yellow-600 border border-yellow-200"
                }`}
              >
                Reviewed
              </button>
            </>
          ) : (
            <>
              <Link
                href="/dashboard/reviewer/review"
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeFilter === "all"
                    ? "bg-gray-800 text-white"
                    : "bg-white text-gray-600 border border-gray-200"
                }`}
              >
                All
              </Link>
              <Link
                href="/dashboard/reviewer/review?status=pending"
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeFilter === "pending"
                    ? "bg-blue-500 text-white"
                    : "bg-white text-blue-600 border border-blue-200"
                }`}
              >
                Pending
              </Link>
              <Link
                href="/dashboard/reviewer/review?status=reviewed"
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeFilter === "reviewed"
                    ? "bg-yellow-500 text-white"
                    : "bg-white text-yellow-600 border border-yellow-200"
                }`}
              >
                Reviewed
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile Card List (outside the white card on mobile) */}
      <div className="md:hidden">
        <MobileCardList
          items={mobileCards}
          emptyMessage="No budgets to review right now."
        />
      </div>

      {/* Desktop Card Container */}
      <div className="hidden md:block rounded-2xl md:rounded-4xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-gray-100">
        <div className="p-4 md:p-8">
          {(activeFilter !== undefined || searchQuery !== undefined) && (
            <div className="mb-6 md:mb-8 flex flex-col md:flex-row gap-4 md:items-center">
              {enableClientFiltering ? (
                <div className="relative w-full md:w-96">
                  <input
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Search (BUD-#, project, department…)"
                    className="h-11 md:h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              ) : (
                <form
                  action="/dashboard/reviewer/review"
                  method="GET"
                  className="relative w-full md:w-96"
                >
                  <input
                    name="q"
                    defaultValue={searchQuery ?? ""}
                    placeholder="Search (BUD-#, project, department…)"
                    className="h-11 md:h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400"
                  />
                  {activeFilter && activeFilter !== "all" ? (
                    <input type="hidden" name="status" value={activeFilter} />
                  ) : null}
                </form>
              )}

              <div className="flex flex-wrap items-center gap-3">
                {enableClientFiltering ? (
                  <>
                    <div className="flex flex-wrap gap-2 md:gap-3">
                      {filterBtn("All", "all")}
                      {filterBtn("Pending", "pending")}
                      {filterBtn("Reviewed", "reviewed")}
                    </div>
                    {(clientSearch || clientFilter !== "all") && (
                      <button
                        type="button"
                        onClick={() => {
                          setClientSearch("");
                          setClientFilter("all");
                        }}
                        className="text-sm text-gray-600 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                    <span className="text-xs font-medium text-gray-500">
                      Showing {filterableRows.length} of {rows.length}
                    </span>
                  </>
                ) : (
                  <>
                    {filterChip("All", "all", "/dashboard/reviewer/review")}
                    {filterChip(
                      "Pending",
                      "pending",
                      "/dashboard/reviewer/review?status=pending",
                    )}
                    {filterChip(
                      "Reviewed",
                      "reviewed",
                      "/dashboard/reviewer/review?status=reviewed",
                    )}

                    {(searchQuery ||
                      (activeFilter && activeFilter !== "all")) && (
                      <Link
                        href="/dashboard/reviewer/review"
                        className="text-sm text-gray-600 hover:underline"
                      >
                        Clear
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Desktop Table */}
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">
                  <th className="pb-4 pr-4 font-bold">BUDGET ID</th>
                  <th className="pb-4 pr-4 font-bold">PROJECT NAME</th>
                  <th className="pb-4 pr-4 font-bold">TYPE</th>
                  <th className="pb-4 pr-4 font-bold">AMOUNT</th>
                  <th className="pb-4 pr-4 font-bold">STATUS</th>
                  <th className="pb-4 pr-4 font-bold">DATE</th>
                  <th className="pb-4 pr-0 font-bold text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filterableRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-gray-400 font-medium"
                    >
                      No budgets to review right now.
                    </td>
                  </tr>
                ) : (
                  filterableRows.map((r) => (
                    <tr
                      key={r.budgetId}
                      className={`group hover:bg-gray-50/50 transition-colors ${
                        r.statusLabel === "Rejected"
                          ? "opacity-60 bg-gray-50/30"
                          : ""
                      }`}
                    >
                      <td className="py-5 pr-4 font-bold text-gray-400 text-xs text-center md:text-left">
                        {r.displayId}
                      </td>
                      <td className="py-5 pr-4">
                        <div className="font-medium text-gray-900 leading-tight">
                          {r.projectName}
                        </div>
                        <div className="text-xs font-semibold text-gray-400 mt-0.5">
                          {r.projectSub}
                        </div>
                      </td>
                      <td className="py-5 pr-4">{typePill(r.type)}</td>
                      <td className="py-5 pr-4 text-gray-900 font-medium">
                        {r.amount}
                      </td>
                      <td className="py-5 pr-4">{statusPill(r.statusLabel)}</td>
                      <td className="py-5 pr-4 text-gray-400 font-bold text-xs">
                        {r.dateLabel}
                      </td>
                      <td className="py-5 pr-0 text-right">
                        {actionButton(r)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
