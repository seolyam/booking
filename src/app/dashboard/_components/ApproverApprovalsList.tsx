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

  const filteredRows = initialRows.filter((r) => {
    const matchesSearch =
      r.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.displayId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.projectSub.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = r.statusLabel === currentStatus;
    return matchesSearch && matchesStatus;
  });

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

  const statusPill = (s: ApproverDashboardRow["statusLabel"]) => {
    const cls =
      s === "Approved"
        ? "bg-green-50 text-green-600 ring-1 ring-green-100"
        : s === "Pending"
          ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
          : s === "Rejected"
            ? "bg-red-50 text-red-600 ring-1 ring-red-100"
            : "bg-gray-100 text-gray-500 ring-1 ring-gray-200";

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${cls}`}>
        {s}
      </span>
    );
  };

  const filterBtn = (status: ApproverDashboardRow["statusLabel"]) => (
    <button
      onClick={() => setCurrentStatus(status)}
      className={`px-6 py-1.5 rounded-lg text-sm font-bold transition-all border ${
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
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black text-gray-900">
          List of budget proposals
        </h1>
        <p className="text-gray-500 mt-2 font-medium">
          Review and verify budget details before forwarding to approver
        </p>
      </div>

      <div className="rounded-4xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-gray-100">
        <div className="p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search Department & Budget Type"
                className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#358334]/20 focus:border-[#358334] transition-all text-sm font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              {filterBtn("Approved")}
              {filterBtn("Pending")}
              {filterBtn("Rejected")}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">
                  <th className="pb-4 pr-4 font-bold">BUDGET ID</th>
                  <th className="pb-4 pr-4 font-bold">PROJECT NAME</th>
                  <th className="pb-4 pr-4 font-bold">TYPE</th>
                  <th className="pb-4 pr-4 font-bold text-center">AMOUNT</th>
                  <th className="pb-4 pr-4 font-bold text-center">STATUS</th>
                  <th className="pb-4 pr-4 font-bold text-center">DATE</th>
                  <th className="pb-4 pr-0 font-bold text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-20 text-center text-gray-400 font-medium"
                    >
                      No proposals found with the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => {
                    const isRejected = r.statusLabel === "Rejected";

                    return (
                      <tr
                        key={r.budgetId}
                        className={`group hover:bg-gray-50/50 transition-colors ${
                          isRejected ? "bg-gray-50/30" : ""
                        }`}
                      >
                        <td
                          className={`py-5 pr-4 font-bold text-gray-400 text-xs ${
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
                          <div className="font-bold text-gray-900 leading-tight">
                            {r.projectName}
                          </div>
                          <div className="text-xs font-semibold text-gray-400 mt-0.5">
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
                          className={`py-5 pr-4 text-gray-900 font-bold text-center ${
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
                          {r.dateLabel}
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
