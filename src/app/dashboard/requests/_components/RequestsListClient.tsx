"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { Eye, Plus, Search } from "lucide-react";
import {
  MobileCardList,
  type MobileCardData,
} from "@/components/ui/mobile-card";

type StatusFilter = "all" | "approved" | "pending" | "revision" | "draft";

export type RequestsListRow = {
  id: string;
  project_code: string | null;
  budget_number: number;
  budget_type: "capex" | "opex";
  total_amount: string;
  status: string;
  created_at_iso: string;
  projectName: string;
};

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
  const cls =
    type === "capex"
      ? "bg-blue-100 text-blue-700"
      : "bg-purple-100 text-purple-700";
  return `inline-flex items-center justify-center rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide min-w-[60px] ${cls}`;
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
  } else if (status === "draft") {
    cls = "bg-gray-100 text-gray-600";
  }

  return `inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${cls}`;
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

function includesQuery(haystack: string | null | undefined, q: string) {
  if (!haystack) return false;
  return haystack.toLowerCase().includes(q);
}

function normalizeDigits(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function matchesStatus(rowStatus: string, filter: StatusFilter) {
  if (filter === "all") return true;
  if (filter === "approved") return rowStatus === "approved";
  if (filter === "revision") return rowStatus === "revision_requested";
  if (filter === "draft") return rowStatus === "draft";
  // pending
  return (
    rowStatus === "submitted" ||
    rowStatus === "verified" ||
    rowStatus === "verified_by_reviewer"
  );
}

export function RequestsListClient(props: {
  rows: RequestsListRow[];
  initialQuery?: string;
  initialStatus?: StatusFilter;
}) {
  const [query, setQuery] = useState(props.initialQuery ?? "");
  const [status, setStatus] = useState<StatusFilter>(
    props.initialStatus ?? "all",
  );
  const deferredQuery = useDeferredValue(query);

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const normalizedQueryDigits = normalizeDigits(normalizedQuery);

  const filteredRows = useMemo(() => {
    let result = props.rows;

    // Match the previous server behavior: "all" hides drafts.
    if (status === "all") {
      result = result.filter((r) => r.status !== "draft");
    } else {
      result = result.filter((r) => matchesStatus(r.status, status));
    }

    if (!normalizedQuery) return result;

    return result.filter((r) => {
      const budDisplayId = `bud-${r.budget_number}`;
      const budNum = String(r.budget_number);
      const statusText = statusLabel(r.status);
      const amountDigits = normalizeDigits(r.total_amount);

      return (
        includesQuery(r.id, normalizedQuery) ||
        includesQuery(r.project_code, normalizedQuery) ||
        includesQuery(budDisplayId, normalizedQuery) ||
        includesQuery(budNum, normalizedQuery) ||
        includesQuery(r.projectName, normalizedQuery) ||
        includesQuery(r.budget_type, normalizedQuery) ||
        includesQuery(statusText, normalizedQuery) ||
        (normalizedQueryDigits.length >= 3 &&
          amountDigits.includes(normalizedQueryDigits))
      );
    });
  }, [props.rows, normalizedQuery, normalizedQueryDigits, status]);

  const mobileCards: MobileCardData[] = useMemo(() => {
    return filteredRows.map((r) => {
      const budDisplayId = `BUD-${r.budget_number}`;
      const displayId = r.project_code ?? budDisplayId;

      const viewHref = r.project_code
        ? `/dashboard/requests/${encodeURIComponent(r.project_code)}`
        : `/dashboard/requests/${r.id}`;

      const editHref = r.project_code
        ? `/dashboard/budget/edit/${encodeURIComponent(r.project_code)}`
        : `/dashboard/budget/edit/BUD-${String(r.budget_number).padStart(3, "0")}`;

      const createdAt = new Date(r.created_at_iso);

      return {
        id: r.id,
        displayId,
        title: r.projectName || "Budget Request",
        type: r.budget_type === "capex" ? "CapEx" : "OpEx",
        amount: formatPhp(r.total_amount),
        status: {
          label: statusLabel(r.status),
          variant: statusToVariant(r.status),
        },
        date: formatDateShort(createdAt),
        actionHref: r.status === "revision_requested" ? editHref : viewHref,
        actionLabel: r.status === "revision_requested" ? "Edit" : "View",
      } satisfies MobileCardData;
    });
  }, [filteredRows]);

  const hasFilters = query.trim().length > 0 || status !== "all";

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 w-full max-w-[1400px] mx-auto">
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
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search requests..."
            className="h-12 w-full rounded-xl bg-gray-100 pl-11 pr-4 text-base outline-none focus:ring-2 focus:ring-[#358334]/20 focus:bg-white transition-all"
          />
        </div>

        {/* Mobile Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {["all", "approved", "pending", "revision", "draft"].map((v) => {
            const isActive = status === v;

            const base =
              v === "approved"
                ? isActive
                  ? "bg-green-500 text-white"
                  : "bg-white text-green-600 border border-green-200"
                : v === "pending"
                  ? isActive
                    ? "bg-blue-500 text-white"
                    : "bg-white text-blue-600 border border-blue-200"
                  : v === "revision"
                    ? isActive
                      ? "bg-orange-500 text-white"
                      : "bg-white text-orange-600 border border-orange-200"
                    : v === "draft"
                      ? isActive
                        ? "bg-gray-500 text-white"
                        : "bg-white text-gray-600 border border-gray-200"
                      : isActive
                        ? "bg-gray-800 text-white"
                        : "bg-white text-gray-600 border border-gray-200";

            const label =
              v === "all"
                ? "All"
                : v === "approved"
                  ? "Approved"
                  : v === "pending"
                    ? "Pending"
                    : v === "revision"
                      ? "Revision"
                      : "Draft";

            return (
              <button
                key={v}
                type="button"
                onClick={() => setStatus(v as StatusFilter)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${base}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden">
        <MobileCardList
          items={mobileCards}
          emptyMessage={
            hasFilters ? "No requests match your search." : "No requests yet."
          }
        />
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Budget Requests</h1>
        <Link
          href="/dashboard/budget/create"
          className="inline-flex items-center gap-2 rounded-lg bg-[#358334] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2F5E3D] transition-colors shadow-sm"
        >
          Create Request +
        </Link>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="p-5 md:p-6 border-b border-gray-100">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              {[
                { label: "Approved", val: "approved", color: "green" },
                { label: "Pending", val: "pending", color: "blue" },
                { label: "Revision", val: "revision", color: "orange" },
                { label: "Draft", val: "draft", color: "gray" },
              ].map((tab) => {
                const isActive = status === tab.val;
                const activeClass =
                  tab.color === "green"
                    ? "bg-green-50 text-green-700 border-green-200 ring-green-200"
                    : tab.color === "blue"
                      ? "bg-blue-50 text-blue-700 border-blue-200 ring-blue-200"
                      : tab.color === "orange"
                        ? "bg-orange-50 text-orange-700 border-orange-200 ring-orange-200"
                        : "bg-gray-200 text-gray-700 border-gray-200 ring-gray-200";

                return (
                  <button
                    key={tab.val}
                    type="button"
                    onClick={() => setStatus(tab.val as StatusFilter)}
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
                  </button>
                );
              })}

              {hasFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setStatus("all");
                  }}
                  className="text-sm text-gray-500 hover:text-gray-900 ml-2"
                >
                  Clear filters
                </button>
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
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16 text-center text-sm text-gray-500"
                  >
                    {hasFilters
                      ? "No requests match your search."
                      : "No requests yet."}
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => {
                  const displayId = r.project_code
                    ? r.project_code
                    : `BUD-${r.budget_number}`;

                  const editHref = r.project_code
                    ? `/dashboard/budget/edit/${encodeURIComponent(r.project_code)}`
                    : `/dashboard/budget/edit/BUD-${String(r.budget_number).padStart(3, "0")}`;

                  const viewHref = r.project_code
                    ? `/dashboard/requests/${encodeURIComponent(r.project_code)}`
                    : `/dashboard/requests/${r.id}`;

                  const rowOpacity =
                    r.status === "rejected" ? "opacity-60 bg-gray-50/30" : "";

                  return (
                    <tr
                      key={r.id}
                      className={`group hover:bg-gray-50/50 transition-colors ${rowOpacity}`}
                    >
                      <td className="py-5 pl-8 pr-4">
                        <span className="text-sm font-medium text-gray-400">
                          {displayId}
                        </span>
                      </td>
                      <td className="py-5 px-4">
                        <div className="font-bold text-gray-900 text-sm">
                          {r.projectName || "Budget Request"}
                        </div>
                      </td>
                      <td className="py-5 px-4">
                        <span className={typePill(r.budget_type)}>
                          {r.budget_type === "capex" ? "CAPEX" : "OPEX"}
                        </span>
                      </td>
                      <td className="py-5 px-4">
                        <span className="font-bold text-gray-900 text-sm">
                          {formatPhp(r.total_amount)}
                        </span>
                      </td>
                      <td className="py-5 px-4">
                        <span className={statusPill(r.status)}>
                          {statusLabel(r.status)}
                        </span>
                      </td>
                      <td className="py-5 px-4 text-sm text-gray-400 font-medium">
                        {formatDateShort(new Date(r.created_at_iso))}
                      </td>
                      <td className="py-5 px-4 pr-8 text-right">
                        {r.status === "revision_requested" ? (
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
