"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, Check } from "lucide-react";
import {
  MobileCardList,
  type MobileCardData,
} from "@/components/ui/mobile-card";

export type SuperadminDashboardRow = {
  budgetId: string;
  displayId: string;
  projectName: string;
  projectSub: string;
  type: "CapEx" | "OpEx";
  amount: string;
  statusLabel: "Approved" | "Pending" | "Revision" | "Rejected";
  dateLabel: string;
  actionLabel?: "Edit" | "View" | "Review";
  actionHref?: string;
};

interface BudgetTableProps {
  rows: SuperadminDashboardRow[];
  emptyMessage?: string;
}

export default function BudgetTable({
  rows,
  emptyMessage = "No budgets found.",
}: BudgetTableProps) {
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

  const statusPill = (s: SuperadminDashboardRow["statusLabel"]) => {
    const cls =
      s === "Approved"
        ? "bg-green-50 text-green-600 ring-1 ring-green-100"
        : s === "Pending"
          ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
          : s === "Rejected"
            ? "bg-red-50 text-red-600 ring-1 ring-red-100"
            : s === "Revision"
              ? "bg-orange-50 text-orange-600 ring-1 ring-orange-100"
              : "bg-gray-100 text-gray-500 ring-1 ring-gray-200";

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${cls}`}>
        {s}
      </span>
    );
  };

  const mobileCards: MobileCardData[] = rows.map((r) => ({
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
            : r.statusLabel === "Revision"
              ? "warning"
              : "error",
    },
    date: r.dateLabel,
    actionHref: r.actionHref || `/dashboard/budget/${r.budgetId}`,
    actionLabel: r.actionLabel || "View",
  }));

  return (
    <>
      <div className="md:hidden">
        <MobileCardList items={mobileCards} emptyMessage={emptyMessage} />
      </div>
      <div className="hidden md:block">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <table className="w-full text-sm min-w-[700px]">
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
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-20 text-center text-gray-400 font-medium"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.budgetId}
                    className={`group hover:bg-gray-50/50 transition-colors ${
                      r.statusLabel === "Rejected"
                        ? "opacity-60 bg-gray-50/30"
                        : ""
                    }`}
                  >
                    <td className="py-5 pr-4 font-bold text-gray-400 text-xs">
                      {r.displayId}
                    </td>
                    <td className="py-5 pr-4">
                      <div className="font-bold text-gray-900 leading-tight">
                        {r.projectName}
                      </div>
                      <div className="text-xs font-semibold text-gray-400 mt-0.5">
                        {r.projectSub}
                      </div>
                    </td>
                    <td className="py-5 pr-4">{typePill(r.type)}</td>
                    <td className="py-5 pr-4 text-gray-900 font-bold text-center">
                      {r.amount}
                    </td>
                    <td className="py-5 pr-4 text-center">
                      {statusPill(r.statusLabel)}
                    </td>
                    <td className="py-5 pr-4 text-gray-400 font-bold text-xs text-center">
                      {r.dateLabel}
                    </td>
                    <td className="py-5 pr-0 text-center">
                      <Link
                        href={r.actionHref || `/dashboard/budget/${r.budgetId}`}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
                          r.actionLabel === "Edit"
                            ? "bg-orange-500 text-white hover:bg-orange-600"
                            : "bg-gray-200/80 text-gray-600 hover:bg-gray-300/80"
                        }`}
                      >
                        {r.actionLabel || "View"}{" "}
                        {r.actionLabel === "Edit" ||
                        r.actionLabel === "Review" ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}