"use client";

import Link from "next/link";
import { Search, Eye } from "lucide-react";
import { useState } from "react";
import type { ApproverDashboardRow } from "./ApproverDashboard";

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

  type SortKey =
    | "budgetId"
    | "projectName"
    | "type"
    | "amount"
    | "status"
    | "date"
    | "dateApproved"
    | "action";

  const [sortKey, setSortKey] = useState<SortKey>(
    activeStatus === "Approved" ? "dateApproved" : "date",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filteredRows = initialRows.filter((r) => {
    const matchesSearch =
      r.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.displayId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.projectSub.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = r.statusLabel === currentStatus;
    return matchesSearch && matchesStatus;
  });

  const parsePhp = (s: string) => {
    const n = Number(s.replace(/[^0-9.-]+/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const parseDateLike = (label: string) => {
    // label is MM-DD-YY
    const [mm, dd, yy] = label.split("-").map((v) => Number(v));
    if (!mm || !dd || !yy) return 0;
    const fullYear = 2000 + yy;
    return new Date(fullYear, mm - 1, dd).getTime();
  };

  const sortedRows = [...filteredRows].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    const cmp = (x: number | string, y: number | string) => {
      if (typeof x === "number" && typeof y === "number") return x - y;
      return String(x).localeCompare(String(y));
    };

    if (sortKey === "budgetId") return dir * cmp(a.displayId, b.displayId);
    if (sortKey === "projectName")
      return dir * cmp(a.projectName, b.projectName);
    if (sortKey === "type") return dir * cmp(a.type, b.type);
    if (sortKey === "amount")
      return dir * (parsePhp(a.amount) - parsePhp(b.amount));
    if (sortKey === "status") return dir * cmp(a.statusLabel, b.statusLabel);
    if (sortKey === "date")
      return dir * (parseDateLike(a.dateLabel) - parseDateLike(b.dateLabel));
    if (sortKey === "dateApproved") {
      const aT = a.approvedAt ? Date.parse(a.approvedAt) : 0;
      const bT = b.approvedAt ? Date.parse(b.approvedAt) : 0;
      return dir * (aT - bT);
    }
    // action: no meaningful ordering
    return 0;
  });

  /* Helper Functions */
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

  const filterBtn = (status: ApproverDashboardRow["statusLabel"]) => {
    const isActive = currentStatus === status;
    const activeClass = status === 'Pending'
      ? "bg-blue-50 text-blue-700 border-blue-200 ring-blue-200"
      : status === 'Approved'
        ? "bg-green-50 text-green-700 border-green-200 ring-green-200"
        : "bg-red-50 text-red-700 border-red-200 ring-red-200";

    return (
      <button
        onClick={() => setCurrentStatus(status)}
        className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all border
                ${isActive
            ? activeClass + " border ring-1"
            : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
          }
            `}
      >
        {status === "Approved" ? "Approved" : status}
      </button>
    );
  }

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

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                <th className="py-6 pl-8 pr-4 font-semibold w-[140px]">BUDGET ID</th>
                <th className="py-6 px-4 font-semibold w-[320px]">PROJECT NAME</th>
                <th className="py-6 px-4 font-semibold w-[100px]">TYPE</th>
                <th className="py-6 px-4 font-semibold w-[150px]">AMOUNT</th>
                <th className="py-6 px-4 font-semibold w-[120px]">STATUS</th>
                <th className="py-6 px-4 font-semibold w-[120px]">
                  {currentStatus === "Approved" ? "DATE APPROVED" : "DATE"}
                </th>
                <th className="py-6 px-4 pr-8 font-semibold text-right w-[100px]">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16 text-center text-sm text-gray-500"
                  >
                    No proposals found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => {
                  const isRejected = r.statusLabel === "Rejected";

                  return (
                    <tr
                      key={r.budgetId}
                      className={`group hover:bg-gray-50/50 transition-colors ${isRejected ? "opacity-60 bg-gray-50/30" : ""
                        }`}
                    >
                      <td className="py-5 pl-8 pr-4">
                        <span className="text-sm font-medium text-gray-400">
                          {r.displayId}
                        </span>
                      </td>
                      <td className="py-5 px-4">
                        <div>
                          <div className="font-bold text-gray-900 text-sm">
                            {r.projectName}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5 font-normal">
                            {r.projectSub}
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-4">
                        {typePill(r.type)}
                      </td>
                      <td className="py-5 px-4">
                        <span className="font-bold text-gray-900 text-sm">
                          {r.amount}
                        </span>
                      </td>
                      <td className="py-5 px-4">
                        {statusPill(r.statusLabel)}
                      </td>
                      <td className="py-5 px-4 text-sm text-gray-400 font-medium">
                        {r.dateLabel}
                      </td>
                      <td className="py-5 px-4 pr-8 text-right">
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
                              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors shadow-sm ${isPending
                                  ? "bg-orange-600 text-white hover:bg-orange-700"
                                  : "bg-[#2C3E50] text-white hover:bg-[#1a252f]"
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
  );
}
