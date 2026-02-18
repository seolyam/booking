"use client";

import * as React from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import {
  MobileCardList,
  type MobileCardData,
} from "@/components/ui/mobile-card";

export type RequestTableRow = {
  requestId: string;
  ticketNumber: string;
  category: string;
  categoryCode?: string;
  title?: string;
  requesterName?: string;
  branchName: string;
  priority: string;
  statusLabel: string;
  statusVariant: "success" | "warning" | "error" | "info" | "default";
  dateLabel: string;
  actionHref: string;
};

interface RequestTableProps {
  rows: RequestTableRow[];
  emptyMessage?: string;
  showRequester?: boolean;
}

const typePill = (code: string) => {
  let cls = "bg-gray-100 text-gray-900";
  if (["FLT", "HTL"].includes(code)) cls = "bg-blue-100 text-blue-600";
  if (["ACC"].includes(code)) cls = "bg-pink-100 text-pink-600";
  if (["MLS"].includes(code)) cls = "bg-indigo-100 text-indigo-600";
  if (["SUP"].includes(code)) cls = "bg-cyan-100 text-cyan-600";

  return (
    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${cls}`}>
      {code}
    </span>
  );
};

const statusPill = (label: string, variant: RequestTableRow["statusVariant"]) => {
  const cls =
    variant === "success"
      ? "bg-green-50 text-green-600 ring-1 ring-green-100"
      : variant === "info"
        ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
        : variant === "warning"
          ? "bg-orange-50 text-orange-600 ring-1 ring-orange-100"
          : variant === "error"
            ? "bg-red-50 text-red-600 ring-1 ring-red-100"
            : "bg-gray-100 text-gray-900 ring-1 ring-gray-200";

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${cls}`}>
      {label}
    </span>
  );
};

export default function RequestTable({
  rows,
  emptyMessage = "No requests found.",
}: RequestTableProps) {
  const mobileCards: MobileCardData[] = rows.map((r) => ({
    id: r.requestId,
    displayId: r.ticketNumber,
    title: r.title || r.category,
    subtitle: r.branchName,
    status: {
      label: r.statusLabel,
      variant: r.statusVariant,
    },
    date: r.dateLabel,
    actionHref: r.actionHref,
    actionLabel: "View",
  }));

  return (
    <>
      <div className="md:hidden">
        <MobileCardList items={mobileCards} emptyMessage={emptyMessage} showAmount={false} />
      </div>
      <div className="hidden md:block">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <th className="pb-4 pr-4 pl-4 font-bold">TICKET ID</th>
                <th className="pb-4 pr-4 font-bold">TICKET NAME</th>
                <th className="pb-4 pr-4 font-bold">TYPE</th>
                <th className="pb-4 pr-4 font-bold">BRANCH</th>
                <th className="pb-4 pr-4 font-bold">STATUS</th>
                <th className="pb-4 pr-4 font-bold">DATE</th>
                <th className="pb-4 pr-4 font-bold text-right">ACTION</th>
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
                    key={r.requestId}
                    className={`group hover:bg-gray-50 transition-colors ${r.statusVariant === "error"
                      ? "opacity-60 bg-gray-50/30"
                      : ""
                      }`}
                  >
                    <td className="py-5 pl-4 pr-4 font-medium text-gray-900 text-xs">
                      {r.ticketNumber}
                    </td>
                    <td className="py-5 pr-4">
                      <div className="font-bold text-gray-900 text-sm leading-tight">
                        {r.title || r.category}
                      </div>
                      <div className="text-[11px] font-medium text-gray-400 mt-1 capitalize">
                        {r.priority} Priority
                      </div>
                    </td>
                    <td className="py-5 pr-4">
                      {typePill(r.categoryCode || "REQ")}
                    </td>
                    <td className="py-5 pr-4 text-xs font-semibold text-gray-900 uppercase">
                      {r.branchName}
                    </td>
                    <td className="py-5 pr-4">
                      {statusPill(r.statusLabel, r.statusVariant)}
                    </td>
                    <td className="py-5 pr-4 text-gray-900 font-medium text-xs">
                      {r.dateLabel}
                    </td>
                    <td className="py-5 pr-4 text-right">
                      {r.statusLabel === "Open" ? (
                        <Link
                          href={r.actionHref}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-sm"
                        >
                          Review <Eye className="h-3 w-3" />
                        </Link>
                      ) : (
                        <Link
                          href={r.actionHref}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold bg-[#4b5563] text-white hover:bg-gray-700 transition-colors shadow-sm"
                        >
                          View <Eye className="h-3 w-3" />
                        </Link>
                      )}
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
