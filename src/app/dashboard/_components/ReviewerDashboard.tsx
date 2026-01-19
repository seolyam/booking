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
    iconBg: string,
    href: string
  ) => (
    <Link
      href={href}
      className="rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group border border-gray-100/50 hover:-translate-y-1"
    >
      <div
        className={`h-12 w-12 rounded-xl flex items-center justify-center ${iconBg} transition-transform group-hover:scale-110 shadow-sm`}
      >
        {icon}
      </div>
      <div className="mt-6 text-4xl font-bold text-gray-900 tracking-tight">{value}</div>
      <div className="mt-1 text-sm font-semibold text-gray-500 uppercase tracking-wide">{label}</div>
    </Link>
  );

  const typePill = (type: "CapEx" | "OpEx") => {
    const cls =
      type === "CapEx"
        ? "bg-blue-100 text-blue-600"
        : "bg-purple-100 text-purple-600";
    return (
      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${cls}`}>
        {type}
      </span>
    );
  };

  const statusPill = (s: ReviewerDashboardRow["statusLabel"]) => {
    const cls =
      s === "Reviewed"
        ? "bg-green-50 text-green-600 ring-1 ring-green-100"
        : s === "Pending"
          ? "bg-yellow-50 text-yellow-600 ring-1 ring-yellow-100"
          : "bg-orange-50 text-orange-600 ring-1 ring-orange-100";

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
          href={`/dashboard/reviewer/${r.budgetId}`}
          className={`${base} bg-orange-500 text-white hover:bg-orange-600 hover:shadow-orange-200`}
        >
          Review <Eye className="h-3.5 w-3.5" />
        </Link>
      );
    }

    return (
      <Link
        href={`/dashboard/reviewer/${r.budgetId}/tracking`}
        className={`${base} bg-gray-700 text-white hover:bg-gray-800`}
      >
        View <Eye className="h-3.5 w-3.5" />
      </Link>
    );
  };

  return (
    <div className="space-y-10">
      {showStats && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {statCard(
            <CheckCircle2 className="h-6 w-6 text-green-500" />,
            stats.reviewedToday,
            "Reviewed today",
            "bg-green-50",
            "/dashboard/reviewer/review?status=reviewed"
          )}
          {statCard(
            <Clock className="h-6 w-6 text-yellow-500" />,
            stats.pendingReview,
            "Pending review",
            "bg-yellow-50",
            "/dashboard/reviewer/review?status=pending"
          )}
          {statCard(
            <TrendingUp className="h-6 w-6 text-blue-500" />,
            stats.awaitingApproval,
            "Awaiting Approval",
            "bg-blue-50",
            "/dashboard/reviewer/review?status=verified"
          )}
          {statCard(
            <AlertCircle className="h-6 w-6 text-orange-400" />,
            stats.needsRevision,
            "Needs revision",
            "bg-orange-50",
            "/dashboard/reviewer/review?status=revision"
          )}
        </div>
      )}

      <div className="rounded-[2rem] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-gray-100">
        <div className="p-8">
          <div className="text-xl font-bold text-gray-900 mb-8">
            Budgets to Review
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">
                  <th className="pb-4 pr-4 font-bold">BUDGET ID</th>
                  <th className="pb-4 pr-4 font-bold">PROJECT NAME</th>
                  <th className="pb-4 pr-4 font-bold">TYPE</th>
                  <th className="pb-4 pr-4 font-bold">AMOUNT</th>
                  <th className="pb-4 pr-4 font-bold">STATUS</th>
                  <th className="pb-4 pr-4 font-bold">DATE</th>
                  <th className="pb-4 pr-0 font-bold text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400 font-medium">
                      No budgets to review right now.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr
                      key={r.budgetId}
                      className="group hover:bg-gray-50/50 transition-colors"
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
                      <td className="py-5 pr-4 text-gray-900 font-bold">{r.amount}</td>
                      <td className="py-5 pr-4">{statusPill(r.statusLabel)}</td>
                      <td className="py-5 pr-4 text-gray-400 font-bold text-xs">{r.dateLabel}</td>
                      <td className="py-5 pr-0 text-right">{actionButton(r)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-8 py-6 border-t border-gray-50 flex justify-end">
          <Link
            href="/dashboard/reviewer/review"
            className="text-sm font-bold text-gray-900 hover:text-[#358334] transition-colors flex items-center gap-1 underline"
          >
            View all
          </Link>
        </div>
      </div>
    </div>
  );
}
