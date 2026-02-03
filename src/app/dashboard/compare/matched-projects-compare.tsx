"use client";

import React from "react";
import Link from "next/link";
import { formatDateShort, formatPhp } from "@/lib/format";

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

function ComparisonCard({
  label,
  year,
  row,
}: {
  label: string;
  year: number;
  row: ProjectRow | null;
}) {
  if (!row) {
    return (
      <div className="rounded-xl border border-black/10 bg-white p-4 md:p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-gray-600">
            {year} ({label})
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-dashed border-black/10 bg-gray-50 p-6 text-center">
          <div className="text-sm font-medium text-gray-700">Not found</div>
          <div className="text-xs text-gray-500 mt-1">
            No record for this year.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold text-gray-600">
          {year} ({label})
        </div>
        {row.href ? (
          <Link
            href={row.href}
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Open
          </Link>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3">
        <div>
          <div className="text-xs text-gray-500">Amount</div>
          <div className="text-xl font-semibold text-gray-900">
            {formatPhp(row.amount)}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <div>
            <div className="text-xs text-gray-500">Project</div>
            <div className="text-sm font-medium text-gray-900">
              {row.projectName || "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Department</div>
            <div className="text-sm text-gray-900">{row.department || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Date</div>
            <div className="text-sm text-gray-900">
              {row.date ? formatDateShort(row.date) : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Status</div>
            <div className="mt-1">
              <span className={statusPill(row.status)}>
                {row.status.replace(/_/g, " ")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MatchedProjectsCompare({
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
  const [selectedCode, setSelectedCode] = React.useState<string>("");

  if (matchedRows.length === 0) {
    return (
      <div className="p-4 pt-0 md:p-6 md:pt-0">
        <div className="text-sm font-semibold text-gray-900 mb-2">
          Compare a project ({title})
        </div>
        <div className="rounded-lg border border-black/10 bg-gray-50 p-8 text-center text-gray-500">
          No {title} projects with project codes found to compare.
        </div>
      </div>
    );
  }

  const latestNumber = matchedRows.reduce((max, r) => {
    const m = /^(CapEx|OpEx)-(\d+)$/i.exec(r.projectCode.trim());
    const n = m ? Number(m[2]) : NaN;
    if (!Number.isFinite(n)) return max;
    return Math.max(max, n);
  }, 1);

  const selected = selectedCode
    ? (matchedRows.find((r) => r.projectCode === selectedCode) ?? null)
    : null;

  const lastAmount = selected?.last ? safeNumber(selected.last.amount) : 0;
  const currentAmount = selected?.current
    ? safeNumber(selected.current.amount)
    : 0;
  const delta = currentAmount - lastAmount;

  return (
    <div className="p-4 pt-0 md:p-6 md:pt-0 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900">
            Compare a project ({title})
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Select a project code ({title}-1 to {title}-{latestNumber}).
          </div>
        </div>

        <div className="w-full sm:w-72">
          <label className="block text-xs font-medium text-black mb-1">
            Select project
          </label>
          <select
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select project</option>
            {matchedRows.map((r) => (
              <option key={r.projectCode} value={r.projectCode}>
                {r.projectCode}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selected ? (
        <div className="rounded-xl border border-black/10 bg-gray-50 p-10 text-center">
          <div className="text-sm font-medium text-gray-800">
            Select a project to compare.
          </div>
          <div className="text-xs text-gray-500 mt-2">
            You’ll see {lastYear} vs {currentYear} side-by-side.
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-black/10 bg-white p-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-gray-600">Selected</div>
              <div className="text-sm font-semibold text-gray-900">
                {selected.projectCode}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-600">Δ amount</div>
              <div
                className={
                  "text-sm font-semibold " +
                  (delta >= 0 ? "text-green-700" : "text-red-700")
                }
              >
                {delta >= 0 ? "+" : ""}
                {formatPhp(String(delta))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-gray-500">
              Need more? Open a full breakdown (items, milestones, notes).
            </div>
            <Link
              href={`/dashboard/compare/${encodeURIComponent(selected.projectCode)}`}
              className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90"
            >
              View detailed comparison
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ComparisonCard
              label="Last Year"
              year={lastYear}
              row={selected.last}
            />
            <ComparisonCard
              label="This Year"
              year={currentYear}
              row={selected.current}
            />
          </div>
        </>
      )}
    </div>
  );
}
