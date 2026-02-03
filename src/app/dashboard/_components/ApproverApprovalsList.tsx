"use client";

import Link from "next/link";
import { Search, Eye, ChevronUp, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { ApproverDashboardRow } from "./ApproverDashboard";
import {
  MobileCardList,
  type MobileCardData,
} from "@/components/ui/mobile-card";

type SortKey = "date" | "amount";

export default function ApproverApprovalsList({
  initialRows,
  activeStatus = "Pending",
}: {
  initialRows: ApproverDashboardRow[];
  activeStatus?: ApproverDashboardRow["statusLabel"];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentStatus, setCurrentStatus] =
    useState<ApproverDashboardRow["statusLabel"]>(activeStatus);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [showAllMobile, setShowAllMobile] = useState(false);

  const filteredRows = initialRows.filter((r) => {
    const matchesSearch =
      r.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.displayId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.projectSub.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = r.statusLabel === currentStatus;
    return matchesSearch && matchesStatus;
  });

  const parseDateLike = (label: string) => {
    // label is MM-DD-YY
    const [mm, dd, yy] = label.split("-").map((v) => Number(v));
    if (!mm || !dd || !yy) return 0;
    const fullYear = 2000 + yy;
    return new Date(fullYear, mm - 1, dd).getTime();
  };

  const formatIsoShort = (iso: string | null | undefined) => {
    if (!iso) return "";
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}-${dd}-${yy}`;
  };

  const sortedRows = [...filteredRows].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;

    if (sortKey === "amount") {
      const aNum = Number(a.amount.replace(/[^0-9.-]+/g, "")) || 0;
      const bNum = Number(b.amount.replace(/[^0-9.-]+/g, "")) || 0;
      return (aNum - bNum) * dir;
    }

    // Default: date sorting
    if (currentStatus === "Approved") {
      const aT = a.approvedAt ? Date.parse(a.approvedAt) : 0;
      const bT = b.approvedAt ? Date.parse(b.approvedAt) : 0;
      return (aT - bT) * dir;
    }

    return (parseDateLike(a.dateLabel) - parseDateLike(b.dateLabel)) * dir;
  });

  const mobileCards: MobileCardData[] = sortedRows.map((r) => {
    const isPending = r.statusLabel === "Pending";
    const href = isPending
      ? `/dashboard/approver/approvals/${encodeURIComponent(r.displayId)}`
      : `/dashboard/budget/${encodeURIComponent(r.displayId)}`;

    return {
      id: r.budgetId,
      displayId: r.displayId,
      title: r.projectName,
      subtitle: r.projectSub,
      type: r.type,
      amount: r.amount,
      status: {
        label: r.statusLabel,
        variant:
          r.statusLabel === "Approved"
            ? "success"
            : r.statusLabel === "Pending"
              ? "info"
              : "error",
      },
      date:
        currentStatus === "Approved"
          ? formatIsoShort(r.approvedAt)
          : r.dateLabel,
      actionHref: href,
      actionLabel: isPending ? "Review" : "View",
    };
  });

  const displayedMobileCards = showAllMobile
    ? mobileCards
    : mobileCards.slice(0, 10);

  const onSortHeaderClick = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sortLabel = (key: SortKey, label: string) => {
    const isActive = sortKey === key;
    return (
      <button
        type="button"
        onClick={() => onSortHeaderClick(key)}
        className="inline-flex items-center gap-1 hover:text-gray-600 transition-colors"
      >
        {label}
        {isActive &&
          (sortDir === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          ))}
      </button>
    );
  };

  const typePill = (type: "CapEx" | "OpEx") => {
    const cls =
      type === "CapEx"
        ? "bg-blue-100 text-blue-700"
        : "bg-purple-100 text-purple-700";
    return (
      <span
        className={`inline-flex items-center justify-center rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide min-w-[60px] ${cls}`}
      >
        {type}
      </span>
    );
  };

  const statusPill = (s: ApproverDashboardRow["statusLabel"]) => {
    let cls = "bg-gray-100 text-gray-600";
    if (s === "Approved") {
      cls = "bg-green-50 text-green-600";
    } else if (s === "Pending") {
      cls = "bg-blue-50 text-blue-600";
    } else if (s === "Rejected") {
      cls = "bg-red-50 text-red-600";
    }

    return (
      <span
        className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${cls}`}
      >
        {s}
      </span>
    );
  };

  const filterBtn = (status: ApproverDashboardRow["statusLabel"]) => (
    <button
      onClick={() => {
        setCurrentStatus(status);
        setSortKey("date");
        setSortDir("desc");
      }}
      className={`px-4 md:px-6 py-2 md:py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all border min-h-[44px] md:min-h-0 ${
        currentStatus === status
          ? status === "Approved"
            ? "bg-green-50 text-green-600 border-green-200 ring-2 ring-green-400"
            : status === "Pending"
              ? "bg-blue-50 text-blue-700 border-blue-200 ring-2 ring-blue-400"
              : status === "Rejected"
                ? "bg-red-50 text-red-600 border-red-200 ring-2 ring-red-400"
                : "bg-gray-100 text-gray-600 border-gray-200 ring-2 ring-gray-400"
          : "bg-gray-100 text-gray-500 border-gray-300 hover:border-gray-400"
      }`}
    >
      {status === "Approved" ? "Approved" : status}
    </button>
  );

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900">
          Proposal Approvals
        </h1>
        <p className="text-gray-500 mt-1 md:mt-2 font-medium text-sm md:text-base">
          Review and decide on budget proposals.
        </p>
      </div>

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden border border-gray-100">
        <div className="p-5 md:p-6 border-b border-gray-100">
          <div className="flex flex-col md:flex-row gap-4 md:items-center">
            {/* Search */}
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search Department & Budget Type"
                className="h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#358334]/20 focus:border-[#358334] transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {/* Filters */}
            <div className="flex flex-wrap gap-2 md:gap-3">
              {filterBtn("Pending")}
              {filterBtn("Approved")}
              {filterBtn("Rejected")}
            </div>
          </div>
        </div>

        <div className="md:hidden">
          <MobileCardList
            items={displayedMobileCards}
            emptyMessage="No proposals found with the current filters."
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

        <div className="hidden md:block">
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">
                  <th className="pb-4 pl-4 pr-4 font-bold">BUDGET ID</th>
                  <th className="pb-4 pr-4 font-bold">PROJECT NAME</th>
                  <th className="pb-4 pr-4 font-bold">TYPE</th>
                  <th className="pb-4 pr-4 font-bold text-center">
                    {sortLabel("amount", "AMOUNT")}
                  </th>
                  <th className="pb-4 pr-4 font-bold text-center">STATUS</th>
                  <th className="pb-4 pr-4 font-bold text-center">
                    {sortLabel(
                      "date",
                      currentStatus === "Approved" ? "DATE APPROVED" : "DATE",
                    )}
                  </th>
                  <th className="pb-4 pr-0 font-bold text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-20 text-center text-gray-400 font-medium"
                    >
                      No proposals found with the current filters.
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((r, index) => {
                    const isRejected = r.statusLabel === "Rejected";

                    return (
                      <tr
                        key={r.budgetId}
                        className={`group hover:bg-gray-50/50 transition-colors ${
                          isRejected ? "bg-gray-50/30" : ""
                        } ${index >= 10 && !showAllMobile ? "hidden md:table-row" : ""}`}
                      >
                        <td
                          className={`py-5 pl-4 pr-4 font-bold text-gray-400 text-xs ${
                            isRejected ? "opacity-60" : ""
                          }`}
                        >
                          {r.displayId}
                        </td>
                        <td
                          className={`py-5 pr-4 ${
                            isRejected ? "opacity-60" : ""
                          }`}
                        >
                          <div className="font-medium text-gray-900 leading-tight">
                            {r.projectName}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5 font-normal">
                            {r.projectSub}
                          </div>
                        </td>
                        <td
                          className={`py-5 pr-4 ${
                            isRejected ? "opacity-60" : ""
                          }`}
                        >
                          {typePill(r.type)}
                        </td>
                        <td
                          className={`py-5 pr-4 text-gray-900 font-medium text-center ${
                            isRejected ? "opacity-60" : ""
                          }`}
                        >
                          {r.amount}
                        </td>
                        <td
                          className={`py-5 pr-4 text-center ${
                            isRejected ? "opacity-60" : ""
                          }`}
                        >
                          {statusPill(r.statusLabel)}
                        </td>
                        <td
                          className={`py-5 pr-4 text-gray-400 font-bold text-xs text-center ${
                            isRejected ? "opacity-60" : ""
                          }`}
                        >
                          {currentStatus === "Approved"
                            ? formatIsoShort(r.approvedAt)
                            : r.dateLabel}
                        </td>
                        <td className="py-5 pr-0 text-center">
                          {(() => {
                            const isPending = r.statusLabel === "Pending";
                            const href = isPending
                              ? `/dashboard/approver/approvals/${encodeURIComponent(
                                  r.displayId,
                                )}`
                              : `/dashboard/budget/${encodeURIComponent(
                                  r.displayId,
                                )}`;

                            return (
                              <Link
                                href={href}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-colors shadow-sm ${
                                  isPending
                                    ? "bg-orange-500 text-white hover:bg-orange-600"
                                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                                }`}
                              >
                                {isPending ? "Review" : "View"}{" "}
                                <Eye className="h-3.5 w-3.5" />
                              </Link>
                            );
                          })()}
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
    </div>
  );
}
