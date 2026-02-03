"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock, FileText, Eye, Pencil } from "lucide-react";
import {
  MobileCardList,
  type MobileCardData,
} from "@/components/ui/mobile-card";

type DashboardRow = {
  budgetId: string;
  displayId: string;
  projectName: string;
  projectSub: string;
  type: "CapEx" | "OpEx";
  amount: string;
  statusLabel: "Approved" | "Pending" | "Revision" | "Rejected" | "Verified";
  dateLabel: string;
  actionLabel: "View" | "Edit";
  actionHref: string;
};

export default function RequesterDashboard({
  stats,
  rows,
}: {
  stats: {
    totalSubmitted: number;
    pendingReview: number;
    approved: number;
    needsRevision: number;
  };
  rows: DashboardRow[];
}) {
  const [showAllMobile, setShowAllMobile] = useState(false);

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
        r.statusLabel === "Approved" || r.statusLabel === "Verified"
          ? "success"
          : r.statusLabel === "Pending"
            ? "info"
            : r.statusLabel === "Revision"
              ? "warning"
              : "error",
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

  const statusPill = (s: DashboardRow["statusLabel"]) => {
    const cls =
      s === "Approved"
        ? "bg-green-50 text-green-600 ring-1 ring-green-100"
        : s === "Verified"
          ? "bg-green-50 text-green-600 ring-1 ring-green-100"
          : s === "Pending"
            ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
            : s === "Revision"
              ? "bg-orange-50 text-orange-600 ring-1 ring-orange-100"
              : "bg-red-50 text-red-600 ring-1 ring-red-100";

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${cls}`}>
        {s}
      </span>
    );
  };

  return (
    <div className="space-y-6 md:space-y-10">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-6 md:grid-cols-4">
        {statCard(
          <FileText className="h-6 w-6 text-blue-500" />,
          stats.totalSubmitted,
          "Total submitted",
          "bg-blue-50",
          "/dashboard/requests",
        )}
        {statCard(
          <Clock className="h-6 w-6 text-yellow-500" />,
          stats.pendingReview,
          "Pending review",
          "bg-yellow-50",
          "/dashboard/requests?status=pending",
        )}
        {statCard(
          <CheckCircle2 className="h-6 w-6 text-green-500" />,
          stats.approved,
          "Approved",
          "bg-green-50",
          "/dashboard/requests?status=approved",
        )}
        {statCard(
          <AlertCircle className="h-6 w-6 text-orange-400" />,
          stats.needsRevision,
          "Needs revision",
          "bg-orange-50",
          "/dashboard/requests?status=revision",
        )}
      </div>

      <div className="rounded-2xl md:rounded-4xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-gray-100">
        <div className="p-4 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-4 mb-6 md:mb-8">
            <div className="text-lg md:text-xl font-bold text-gray-900">
              My Budget Requests
            </div>
            <Link
              href="/dashboard/budget/create"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#358334] px-4 md:px-5 py-2.5 text-sm font-bold text-white hover:bg-[#2F5E3D] transition-colors shadow-sm min-h-[44px]"
            >
              Create Request <span className="text-xl leading-none">+</span>
            </Link>
          </div>

          <div className="md:hidden">
            <MobileCardList
              items={displayedMobileCards}
              emptyMessage="No budget requests yet."
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
                    <th className="pb-4 pr-4 font-bold">BUDGET ID</th>
                    <th className="pb-4 pr-4 font-bold">PROJECT NAME</th>
                    <th className="pb-4 pr-4 font-bold">TYPE</th>
                    <th className="pb-4 pr-4 font-bold text-center">AMOUNT</th>
                    <th className="pb-4 pr-4 font-bold text-center">STATUS</th>
                    <th className="pb-4 pr-4 font-bold text-center">DATE</th>
                    <th className="pb-4 pr-0 font-bold text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-12 text-center text-gray-400 font-medium"
                      >
                        No budget requests yet.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, index) => (
                      <tr
                        key={r.budgetId}
                        className={`group hover:bg-gray-50/50 transition-colors ${
                          r.statusLabel === "Rejected"
                            ? "opacity-60 bg-gray-50/30"
                            : ""
                        } ${index >= 10 && !showAllMobile ? "hidden md:table-row" : ""}`}
                      >
                        <td className="py-5 pr-4 font-bold text-gray-400 text-xs text-center md:text-left">
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
                        <td className="py-5 pr-0 text-right">
                          <Link
                            href={r.actionHref}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white transition-colors shadow-sm ${
                              r.actionLabel === "Edit"
                                ? "bg-orange-600 hover:bg-orange-700"
                                : "bg-gray-700 hover:bg-gray-800"
                            }`}
                          >
                            {r.actionLabel}{" "}
                            {r.actionLabel === "Edit" ? (
                              <span><Pencil className="h-3.5 w-3.5" /></span>
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
        </div>

        <div className="px-4 md:px-8 py-4 md:py-6 border-t border-gray-50 flex justify-end">
          <Link
            href="/dashboard/requests"
            className="text-sm font-bold text-gray-900 hover:text-[#358334] transition-colors flex items-center gap-1 underline min-h-[44px] items-center"
          >
            View all
          </Link>
        </div>
      </div>
    </div>
  );
}
