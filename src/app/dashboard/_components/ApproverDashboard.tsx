"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertCircle,
  Eye,
  Check,
} from "lucide-react";

export type ApproverDashboardRow = {
  budgetId: string;
  displayId: string;
  projectName: string;
  projectSub: string;
  type: "CapEx" | "OpEx";
  amount: string;
  statusLabel: "Approved" | "Pending" | "Rejected";
  dateLabel: string;
};

export default function ApproverDashboard({
  stats,
  rows,
}: {
  stats: {
    totalApproved: number;
    awaitingApproval: number;
    approvedThisMonth: number;
    rejected: number;
  };
  rows: ApproverDashboardRow[];
}) {
  const statCard = (
    icon: React.ReactNode,
    value: number,
    label: string,
    iconBg: string,
    href: string,
  ) => (
    <Link
      href={href}
      className="rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow group"
    >
      <div
        className={`h-12 w-12 rounded-xl flex items-center justify-center ${iconBg} transition-transform group-hover:scale-110`}
      >
        {icon}
      </div>
      <div className="mt-6 text-4xl font-bold text-gray-900 tracking-tight">
        {value}
      </div>
      <div className="mt-1 text-sm font-medium text-gray-500">{label}</div>
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

  const statusPill = (s: ApproverDashboardRow["statusLabel"]) => {
    const cls =
      s === "Approved"
        ? "bg-green-50 text-green-600 ring-1 ring-green-100"
        : s === "Pending"
          ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
          : "bg-gray-100 text-gray-500 ring-1 ring-gray-200";

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${cls}`}>
        {s}
      </span>
    );
  };

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {statCard(
          <CheckCircle2 className="h-6 w-6 text-green-500" />,
          stats.totalApproved,
          "Total approved",
          "bg-green-50",
          "/dashboard/approver/approvals?status=approved",
        )}
        {statCard(
          <Clock className="h-6 w-6 text-orange-400" />,
          stats.awaitingApproval,
          "Awaiting approval",
          "bg-orange-50",
          "/dashboard/approver/approvals?status=pending",
        )}
        {statCard(
          <TrendingUp className="h-6 w-6 text-blue-500" />,
          stats.approvedThisMonth,
          "Approved this month",
          "bg-blue-50",
          "/dashboard/approver/approvals?status=approved",
        )}
        {statCard(
          <AlertCircle className="h-6 w-6 text-red-400" />,
          stats.rejected,
          "Rejected",
          "bg-red-50",
          "/dashboard/approver/approvals?status=rejected",
        )}
      </div>

      <div className="rounded-[2rem] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-gray-100">
        <div className="p-8">
          <div className="text-xl font-bold text-gray-900 mb-8">
            Recent budget proposals
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
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-gray-400 font-medium"
                    >
                      No budget requests awaiting review.
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
                        {r.statusLabel === "Pending" ? (
                          <Link
                            href={`/dashboard/approver/approvals/${r.budgetId}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 transition-colors shadow-sm"
                          >
                            Approve <Check className="h-3.5 w-3.5" />
                          </Link>
                        ) : (
                          <Link
                            href={`/dashboard/budget/BUD-${String(r.budgetNumber).padStart(3, "0")}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-700 px-4 py-2 text-xs font-bold text-white hover:bg-gray-800 transition-colors shadow-sm"
                          >
                            View <Eye className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-8 flex justify-end">
            <Link
              href="/dashboard/approver/approvals"
              className="text-sm font-bold text-gray-900 hover:text-[#358334] transition-colors flex items-center gap-1 underline"
            >
              View all
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
