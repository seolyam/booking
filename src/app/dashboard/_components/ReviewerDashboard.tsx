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

type ReviewerFilter = "all" | "pending" | "reviewed" | "rejected";

function normalizeDigits(value: string) {
  return value.replace(/[^0-9]/g, "");
}

export default function ReviewerDashboard({
  stats,
  rows,
  showStats = true,
  activeFilter = "all",
  searchQuery = "",
}: {
  stats: {
    reviewedToday: number;
    pendingReview: number;
    awaitingApproval: number;
    needsRevision: number;
  };
  rows: ReviewerDashboardRow[];
  showStats?: boolean;
  activeFilter?: ReviewerFilter;
  searchQuery?: string;
  enableClientFiltering?: boolean; // Deprecated but kept for compatibility
}) {
  const [clientFilter, setClientFilter] = useState<ReviewerFilter>(
    activeFilter,
  );
  const [clientSearch, setClientSearch] = useState(searchQuery);
  const [showAllMobile, setShowAllMobile] = useState(false);
  const deferredClientSearch = useDeferredValue(clientSearch);

  const normalizedSearch = deferredClientSearch.trim().toLowerCase();
  const normalizedSearchDigits = normalizeDigits(normalizedSearch);

  const filterableRows = useMemo(() => {
    return rows.filter((r) => {
      // 1. Filter by Status
      if (clientFilter === "pending") {
        if (r.statusLabel !== "Pending") return false;
      } else if (clientFilter === "reviewed") {
        if (r.statusLabel !== "Reviewed") return false;
      } else if (clientFilter === "rejected") {
        if (r.statusLabel !== "Rejected") return false;
      }

      // 2. Filter by Query
      if (!normalizedSearch) return true;

      const haystack = `${r.displayId} ${r.projectName} ${r.projectSub} ${r.amount} ${r.statusLabel} ${r.type}`
        .toLowerCase();
      
      const amountDigits = normalizeDigits(r.amount);

      return (
        haystack.includes(normalizedSearch) ||
        (normalizedSearchDigits.length >= 3 && amountDigits.includes(normalizedSearchDigits))
      );
    });
  }, [rows, clientFilter, normalizedSearch, normalizedSearchDigits]);

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

  const displayedMobileCards = showAllMobile
    ? mobileCards
    : mobileCards.slice(0, 10);

  const statCard = (
    icon: React.ReactNode,
    value: number,
    label: string,
    iconBg: string,
    filterVal: ReviewerFilter | "verified" | "revision", // "verified"/"revision" link to dashboard generally but we use filters for main list
  ) => (
    <button
      onClick={() => {
        // Simple heuristic: if clicking stat card, set relevant filter if applicable
        if (filterVal === "pending" || filterVal === "reviewed" || filterVal === "all") {
             setClientFilter(filterVal);
        }
        // For verified/revision, we don't have a direct filter yet in the simplified list, 
        // but we could just scroll down. For now just standard button behavior.
      }}
      className="w-full text-left rounded-xl md:rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 md:p-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group border border-gray-100/50 hover:-translate-y-1"
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
    </button>
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

  const hasFilters = clientSearch.trim().length > 0 || clientFilter !== "all";

  return (
    <div className="space-y-6 md:space-y-10">
      {showStats && (
        <>
          <div className="text-xl md:text-2xl font-bold text-gray-900">
            Budgets to Review
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-6 md:grid-cols-4">
            {statCard(
              <CheckCircle2 className="h-6 w-6 text-green-500" />,
              stats.reviewedToday,
              "Reviewed today",
              "bg-green-50",
              "reviewed",
            )}
            {statCard(
              <Clock className="h-6 w-6 text-yellow-500" />,
              stats.pendingReview,
              "Pending review",
              "bg-yellow-50",
              "pending",
            )}
            {statCard(
              <TrendingUp className="h-6 w-6 text-blue-500" />,
              stats.awaitingApproval,
              "Awaiting Approval",
              "bg-blue-50",
              "all",
            )}
            {statCard(
              <AlertCircle className="h-6 w-6 text-orange-400" />,
              stats.needsRevision,
              "Needs revision",
              "bg-orange-50",
              "all",
            )}
          </div>
        </>
      )}

      {/* Mobile-only search and filters */}
      <div className="md:hidden mb-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Search..."
              className="h-12 w-full rounded-xl bg-gray-100 pl-11 pr-4 text-base outline-none focus:ring-2 focus:ring-[#358334]/20 focus:bg-white transition-all"
            />
          </div>

        {/* Mobile Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              <button
                type="button"
                onClick={() => setClientFilter("all")}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${clientFilter === "all"
                    ? "bg-gray-800 text-white"
                    : "bg-white text-gray-600 border border-gray-200"
                  }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setClientFilter("pending")}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${clientFilter === "pending"
                    ? "bg-blue-500 text-white"
                    : "bg-white text-blue-600 border border-blue-200"
                  }`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setClientFilter("reviewed")}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${clientFilter === "reviewed"
                    ? "bg-yellow-500 text-white"
                    : "bg-white text-yellow-600 border border-yellow-200"
                  }`}
              >
                Reviewed
              </button>
              <button
                type="button"
                onClick={() => setClientFilter("rejected")}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${clientFilter === "rejected"
                    ? "bg-red-500 text-white"
                    : "bg-white text-red-600 border border-red-200"
                  }`}
              >
                Rejected
              </button>
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden">
        <MobileCardList
          items={displayedMobileCards}
          emptyMessage="No budgets to review right now."
        />
        {!showAllMobile && mobileCards.length > 10 && (
          <button
            onClick={() => setShowAllMobile(true)}
            className="w-full mt-4 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm shadow-sm hover:bg-gray-50 transition-colors"
          >
            View All ({mobileCards.length - 10} more)
          </button>
        )}
      </div>

      {/* Desktop Card Container */}
      <div className="hidden md:block rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="p-5 md:p-6 border-b border-gray-100">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Search..."
                    className="h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                  />
                </div>

              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    <div className="flex flex-wrap gap-2 md:gap-3">
                        {[
                          { label: "All", val: "all", color: "gray" },
                          { label: "Pending", val: "pending", color: "blue" },
                          { label: "Reviewed", val: "reviewed", color: "yellow" },
                          { label: "Rejected", val: "rejected", color: "red" }
                        ].map((tab) => {
                          const isActive = clientFilter === tab.val;
                          // Matching RequestListClient active styles
                          const activeClass = 
                             tab.color === "blue" ? "bg-blue-50 text-blue-700 border-blue-200 ring-blue-200"
                             : tab.color === "yellow" ? "bg-yellow-50 text-yellow-700 border-yellow-200 ring-yellow-200"
                             : tab.color === "red" ? "bg-red-50 text-red-700 border-red-200 ring-red-200"
                             : "bg-gray-800 text-white border-gray-800 ring-gray-800"; // All active

                          // Inactive style from RequestsListClient
                          const inactiveClass = "bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300";

                          return (
                            <button
                              key={tab.val}
                              type="button"
                              onClick={() => setClientFilter(tab.val as ReviewerFilter)}
                              className={`
                                px-4 py-2 rounded-lg text-sm font-medium transition-all border
                                ${isActive ? activeClass + " border ring-1" : inactiveClass}
                              `}
                            >
                              {tab.label}
                            </button>
                          )
                        })}
                    </div>
                    
                    {hasFilters && (
                      <button
                        type="button"
                        onClick={() => {
                          setClientSearch("");
                          setClientFilter("all");
                        }}
                         className="text-sm text-gray-500 hover:text-gray-900 ml-2"
                      >
                        Clear filters
                      </button>
                    )}
                    
                    <span className="text-xs font-medium text-gray-400 ml-2 border-l pl-3">
                      {filterableRows.length} items
                    </span>
              </div>
            </div>
        </div>

          {/* Desktop Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">
                  <th className="py-6 pl-8 pr-4 font-bold">BUDGET ID</th>
                  <th className="py-6 pr-4 font-bold">PROJECT NAME</th>
                  <th className="py-6 pr-4 font-bold">TYPE</th>
                  <th className="py-6 pr-4 font-bold">AMOUNT</th>
                  <th className="py-6 pr-4 font-bold">STATUS</th>
                  <th className="py-6 pr-4 font-bold">DATE</th>
                  <th className="py-6 pr-0 font-bold text-right pr-8">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filterableRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-gray-400 font-medium"
                    >
                      {hasFilters ? "No budgets match your search." : "No budgets to review right now."}
                    </td>
                  </tr>
                ) : (
                  filterableRows.map((r) => (
                    <tr
                      key={r.budgetId}
                      className={`group hover:bg-gray-50/50 transition-colors ${r.statusLabel === "Rejected"
                          ? "opacity-60 bg-gray-50/30"
                          : ""
                        }`}
                    >
                      <td className="py-5 pl-8 pr-4 font-bold text-gray-400 text-xs text-center md:text-left">
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
                      <td className="py-5 pr-8 text-right">
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
  );
}
