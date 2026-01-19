"use client";

import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  TrendingUp,
} from "lucide-react";

export type ReviewerDashboardRow = {
  budgetId: string;
  displayId: string;
  projectName: string;
  projectSub: string;
  type: "CapEx" | "OpEx";
  amount: string;
  statusLabel: "Reviewed" | "Pending" | "Revision";
  dateLabel: string;
  actionLabel: "View" | "Review";
  actionHref: string;
};

export default function ReviewerDashboard({
  stats,
  rows,
  showStats = true,
}: {
  stats: {
    reviewedToday: number;
    pendingReview: number;
    awaitingApproval: number;
    needsRevision: number;
  };
  rows: ReviewerDashboardRow[];
  showStats?: boolean;
}) {
  const statCard = (
    icon: React.ReactNode,
    value: number,
    label: string,
    iconBg: string
  ) => (
    <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/5 p-5">
      <div
        className={`h-10 w-10 rounded-lg flex items-center justify-center ${iconBg}`}
      >
        {icon}
      </div>
      <div className="mt-4 text-3xl font-semibold text-gray-900">{value}</div>
      <div className="mt-1 text-sm text-gray-600">{label}</div>
    </div>
  );

  const typePill = (type: "CapEx" | "OpEx") => {
    const cls =
      type === "CapEx"
        ? "bg-blue-100 text-blue-700"
        : "bg-purple-100 text-purple-700";
    return (
      <span className={`px-2 py-1 rounded-md text-xs font-medium ${cls}`}>
        {type}
      </span>
    );
  };

  const statusPill = (s: ReviewerDashboardRow["statusLabel"]) => {
    const cls =
      s === "Reviewed"
        ? "bg-green-100 text-green-700"
        : s === "Pending"
        ? "bg-yellow-100 text-yellow-700"
        : "bg-orange-100 text-orange-700";

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${cls}`}>
        {s}
      </span>
    );
  };

  const actionButton = (r: ReviewerDashboardRow) => {
    const base =
      "inline-flex items-center gap-2 rounded-md px-3 py-1 text-xs font-medium";

    if (r.actionLabel === "Review") {
      return (
        <Link
          href={`/dashboard/reviewer/${r.budgetId}`}
          className={`${base} bg-orange-500 text-white hover:bg-orange-600`}
        >
          Review <Eye className="h-3.5 w-3.5" />
        </Link>
      );
    }

    return (
      <Link
        href={`/dashboard/reviewer/${r.budgetId}`}
        className={`${base} bg-gray-200 text-gray-700 hover:bg-gray-300`}
      >
        View <Eye className="h-3.5 w-3.5" />
      </Link>
    );
  };

  return (
    <div className="space-y-8">
      {showStats && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {statCard(
            <CheckCircle2 className="h-5 w-5 text-green-600" />,
            stats.reviewedToday,
            "Reviewed today",
            "bg-green-50"
          )}
          {statCard(
            <Clock className="h-5 w-5 text-yellow-600" />,
            stats.pendingReview,
            "Pending review",
            "bg-yellow-50"
          )}
          {statCard(
            <TrendingUp className="h-5 w-5 text-blue-600" />,
            stats.awaitingApproval,
            "Awaiting Approval",
            "bg-blue-50"
          )}
          {statCard(
            <AlertCircle className="h-5 w-5 text-orange-600" />,
            stats.needsRevision,
            "Needs revision",
            "bg-orange-50"
          )}
        </div>
      )}

      <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
        <div className="p-6 flex items-center justify-between gap-4">
          <div className="text-lg font-semibold text-gray-900">
            Budgets to Review
          </div>
        </div>

        <div className="px-6 pb-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-black/10">
                <th className="py-3 pr-4 font-medium">BUDGET ID</th>
                <th className="py-3 pr-4 font-medium">PROJECT NAME</th>
                <th className="py-3 pr-4 font-medium">TYPE</th>
                <th className="py-3 pr-4 font-medium">AMOUNT</th>
                <th className="py-3 pr-4 font-medium">STATUS</th>
                <th className="py-3 pr-4 font-medium">DATE</th>
                <th className="py-3 pr-0 font-medium text-right">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-500">
                    No budgets to review right now.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.budgetId}
                    className="border-b border-black/5 last:border-b-0"
                  >
                    <td className="py-4 pr-4 font-medium text-gray-800">
                      {r.displayId}
                    </td>
                    <td className="py-4 pr-4">
                      <div className="font-medium text-gray-900">
                        {r.projectName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {r.projectSub}
                      </div>
                    </td>
                    <td className="py-4 pr-4">{typePill(r.type)}</td>
                    <td className="py-4 pr-4 text-gray-800">{r.amount}</td>
                    <td className="py-4 pr-4">{statusPill(r.statusLabel)}</td>
                    <td className="py-4 pr-4 text-gray-700">{r.dateLabel}</td>
                    <td className="py-4 pr-0 text-right">{actionButton(r)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 flex justify-end">
          <Link
            href="/dashboard/reviewer/review"
            className="text-sm text-gray-600 hover:underline"
          >
            View all
          </Link>
        </div>
      </div>
    </div>
  );
}
