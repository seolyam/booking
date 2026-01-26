"use client";

import React from "react";
import Link from "next/link";
import { formatPhp } from "@/lib/dashboardData";

type ProjectRow = {
  key: string;
  displayId: string;
  projectCode: string | null;
  projectName: string;
  department: string;
  amount: string;
  status: string;
  date: string;
  href?: string;
};

type MatchedProjectRow = {
  projectCode: string;
  last: ProjectRow | null;
  current: ProjectRow | null;
};

function safeNumber(amount: string) {
  const n = Number(amount);
  return Number.isFinite(n) ? n : 0;
}

function statusPill(status: string) {
  const base =
    "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium";
  if (status === "approved") return `${base} bg-green-100 text-green-700`;
  if (status === "rejected") return `${base} bg-red-100 text-red-700`;
  if (status === "revision_requested")
    return `${base} bg-orange-100 text-orange-700`;
  if (
    status === "submitted" ||
    status === "verified" ||
    status === "verified_by_reviewer"
  )
    return `${base} bg-blue-100 text-blue-700`;
  return `${base} bg-gray-100 text-gray-700`;
}

export function MatchedProjectsAccordion({
  matchedRows,
  lastYear,
  currentYear,
  title,
}: {
  matchedRows: MatchedProjectRow[];
  lastYear: number;
  currentYear: number;
  title: string;
}) {
  const [expandAll, setExpandAll] = React.useState(false);

  if (matchedRows.length === 0) {
    return (
      <div className="p-6 pt-0">
        <div className="text-sm font-semibold text-gray-900 mb-2">
          Matched projects ({title})
        </div>
        <div className="rounded-lg border border-black/10 bg-gray-50 p-8 text-center text-gray-500">
          No {title} projects with project codes found to compare.
        </div>
      </div>
    );
  }

  const rowsToShow = expandAll ? matchedRows : [matchedRows[0]];

  return (
    <div className="p-6 pt-0 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-900">
          Matched projects ({title})
        </div>
        {matchedRows.length > 1 && (
          <button
            onClick={() => setExpandAll(!expandAll)}
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            {expandAll ? "Show less" : `Show all (${matchedRows.length})`}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {rowsToShow.map((m) => {
          const lastAmount = m.last ? safeNumber(m.last.amount) : 0;
          const currentAmount = m.current ? safeNumber(m.current.amount) : 0;
          const delta = currentAmount - lastAmount;

          return (
            <details
              key={m.projectCode}
              className="rounded-lg border border-black/10 bg-white group"
            >
              <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50">
                <div className="flex items-center gap-3 flex-1">
                  <span className="font-medium text-gray-900">
                    {m.projectCode}
                  </span>
                  <div className="text-xs text-gray-500">
                    {m.last && m.current
                      ? "Both years"
                      : m.last
                        ? "Last year only"
                        : "Current year only"}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm font-medium">
                  <span
                    className={
                      delta >= 0 ? "text-green-700" : "text-red-700"
                    }
                  >
                    {delta >= 0 ? "+" : ""}
                    {formatPhp(String(delta))}
                  </span>
                  <svg
                    className="w-5 h-5 text-gray-600 group-open:rotate-180 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </div>
              </summary>

              <div className="border-t border-black/10 bg-gray-50 p-4 space-y-4">
                {m.last && (
                  <div>
                    <div className="text-xs font-semibold text-gray-600 mb-2">
                      {lastYear} (Last Year)
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="font-medium text-gray-900">
                          {formatPhp(m.last.amount)}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {m.last.projectName}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {m.last.department} • {m.last.date}
                        </div>
                        <div className="mt-2">
                          <span className={statusPill(m.last.status)}>
                            {m.last.status.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {m.current && (
                  <div>
                    <div className="text-xs font-semibold text-gray-600 mb-2">
                      {currentYear} (This Year)
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="font-medium text-gray-900">
                          {formatPhp(m.current.amount)}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {m.current.projectName}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {m.current.department} • {m.current.date}
                        </div>
                        <div className="mt-2">
                          <span className={statusPill(m.current.status)}>
                            {m.current.status.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
