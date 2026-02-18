"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LogOut,
  Trash2,
  Building2,
  Phone,
  Clock,
  Filter,
  X,
  Timer,
} from "lucide-react";
import type { VisitorLog } from "@/db/schema";
import { clockOutVisitor, deleteVisitorLog } from "@/actions/visitor-logs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Date/time formatting
// ---------------------------------------------------------------------------

function formatDateTime(date: Date | null): string {
  if (!date) return "\u2014";
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTime(date: Date | null): string {
  if (!date) return "\u2014";
  return new Date(date).toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return "\u2014";
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

type VisitStatus = "ACTIVE" | "COMPLETED" | "AUTO_CLOSED";

function statusBadge(status: VisitStatus, timeOut: Date | null) {
  switch (status) {
    case "ACTIVE":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-green-200">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Active
        </span>
      );
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
          Completed
        </span>
      );
    case "AUTO_CLOSED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
          <Timer className="h-3 w-3" />
          Auto Closed
        </span>
      );
    default:
      if (timeOut) {
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
            Clocked Out
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-green-200">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Active
        </span>
      );
  }
}

// ---------------------------------------------------------------------------
// Filters type
// ---------------------------------------------------------------------------

export type Filters = {
  search: string;
  dateFrom: string;
  dateTo: string;
  status: "" | VisitStatus;
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function VisitorLogsClient({
  logs,
  initialFilters,
}: {
  logs: VisitorLog[];
  initialFilters: Filters;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showFilters, setShowFilters] = useState(
    Boolean(
      initialFilters.dateFrom || initialFilters.dateTo || initialFilters.status,
    ),
  );

  const [search, setSearch] = useState(initialFilters.search);
  const [dateFrom, setDateFrom] = useState(initialFilters.dateFrom);
  const [dateTo, setDateTo] = useState(initialFilters.dateTo);
  const [status, setStatus] = useState<"" | VisitStatus>(initialFilters.status);
  const [clockOutVisitorData, setClockOutVisitorData] = useState<{ id: string; name: string } | null>(null);

  const [deleteVisitorData, setDeleteVisitorData] = useState<{ id: string; name: string } | null>(null);

  const activeCount = logs.filter((l) => l.status === "ACTIVE").length;

  function applyFilters(overrides?: Partial<Filters>) {
    const f = {
      search: overrides?.search ?? search,
      dateFrom: overrides?.dateFrom ?? dateFrom,
      dateTo: overrides?.dateTo ?? dateTo,
      status: overrides?.status ?? status,
    };

    const params = new URLSearchParams();
    if (f.search) params.set("search", f.search);
    if (f.dateFrom) params.set("dateFrom", f.dateFrom);
    if (f.dateTo) params.set("dateTo", f.dateTo);
    if (f.status) params.set("status", f.status);

    const qs = params.toString();
    router.push(`/dashboard/admin/visitor-logs${qs ? `?${qs}` : ""}`);
  }

  function clearFilters() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setStatus("");
    router.push("/dashboard/admin/visitor-logs");
  }

  function handleClockOut(visitorId: string, visitorName: string) {
    setClockOutVisitorData({ id: visitorId, name: visitorName });
  }

  function confirmClockOut() {
    if (!clockOutVisitorData) return;

    startTransition(async () => {
      const result = await clockOutVisitor(clockOutVisitorData.id);
      if ("error" in result) {
        alert(result.error);
      }
      setClockOutVisitorData(null);
    });
  }

  function handleDelete(visitorId: string, visitorName: string) {
    setDeleteVisitorData({ id: visitorId, name: visitorName });
  }

  function confirmDelete() {
    if (!deleteVisitorData) return;

    startTransition(async () => {
      const result = await deleteVisitorLog(deleteVisitorData.id);
      if ("error" in result) {
        alert(result.error);
      }
      setDeleteVisitorData(null);
    });
  }

  const hasActiveFilters = Boolean(dateFrom || dateTo || status);

  return (
    <div className="space-y-6">
      {/* Mobile Header */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">User Activity</h2>
            <p className="text-sm text-gray-500">
              {activeCount} currently active
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${hasActiveFilters
              ? "bg-green-50 text-green-700 ring-1 ring-green-200"
              : "bg-gray-100 text-gray-600"
              }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-[10px] text-white">
                !
              </span>
            )}
          </button>
        </div>

        {/* Mobile Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            onBlur={() => applyFilters()}
            placeholder="Search by name or company..."
            className="h-12 w-full rounded-xl bg-gray-100 pl-11 pr-4 text-base outline-none focus:ring-2 focus:ring-[#358334]/20 focus:bg-white transition-all"
          />
        </div>

        {/* Mobile Filters */}
        {showFilters && (
          <div className="mb-3 space-y-3 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-2 text-sm bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-2 text-sm bg-white"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "" | VisitStatus)}
                className="h-10 w-full rounded-lg border border-gray-300 px-2 text-sm bg-white"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="AUTO_CLOSED">Auto Closed</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => applyFilters()}
                className="flex-1 h-9 rounded-lg bg-[#358334] text-white text-xs font-medium"
              >
                Apply
              </button>
              <button
                onClick={clearFilters}
                className="h-9 px-3 rounded-lg bg-gray-200 text-gray-600 text-xs font-medium"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {logs.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">
            {search.trim() || hasActiveFilters
              ? "No logs match your filters."
              : "No visitor logs yet."}
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={`rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 ${log.status !== "ACTIVE" ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {log.name}
                  </p>
                  {log.company && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Building2 className="h-3 w-3" />
                      {log.company}
                    </p>
                  )}
                </div>
                {statusBadge(log.status as VisitStatus, log.time_out)}
              </div>

              <p className="text-sm text-gray-600 mb-2">
                {log.purpose_of_visit}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-3">
                {log.contact_number && log.contact_number !== "N/A" && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {log.contact_number}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  In: {formatTime(log.time_in)}
                </span>
                {log.time_out && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Out: {formatTime(log.time_out)}
                  </span>
                )}
                {log.expected_duration && (
                  <span className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    {formatDuration(log.expected_duration)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {log.status === "ACTIVE" && (
                  <button
                    onClick={() => handleClockOut(log.id, log.name)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 ring-1 ring-amber-200 transition-colors disabled:opacity-50"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Clock Out
                  </button>
                )}
                <button
                  onClick={() => handleDelete(log.id, log.name)}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 ring-1 ring-red-200 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex items-center justify-between mb-8">
        <div>
          <p className="text-sm text-gray-500">
            {logs.length} total &middot; {activeCount} currently active
          </p>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:flex flex-col flex-1 w-full rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden h-full">
        {/* Filters Bar */}
        <div className="p-5 md:p-6 border-b border-gray-100 shrink-0">
          <div className="flex flex-col gap-4">
            {/* Row 1: Search + Toggle */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                  onBlur={() => applyFilters()}
                  placeholder="Search by name or company..."
                  className="h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 h-10 text-sm font-medium transition-colors ${hasActiveFilters
                  ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                  : "bg-gray-50 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100"
                  }`}
              >
                <Filter className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-[10px] text-white">
                    !
                  </span>
                )}
              </button>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </button>
              )}
            </div>

            {/* Row 2: Expanded Filters */}
            {showFilters && (
              <div className="flex items-end gap-3 flex-wrap">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-10 rounded-md border border-gray-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-10 rounded-md border border-gray-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as "" | VisitStatus)
                    }
                    className="h-10 rounded-md border border-gray-300 px-3 text-sm bg-white pr-8 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="AUTO_CLOSED">Auto Closed</option>
                  </select>
                </div>
                <button
                  onClick={() => applyFilters()}
                  className="h-10 px-4 rounded-md bg-[#358334] text-white text-sm font-medium hover:bg-[#2d7029] transition-colors"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                <th className="py-6 pl-8 pr-4 font-semibold w-[180px]">Name</th>
                <th className="py-6 px-4 font-semibold w-[130px]">Company</th>
                <th className="py-6 px-4 font-semibold w-[110px]">Contact</th>
                <th className="py-6 px-4 font-semibold">Purpose</th>
                <th className="py-6 px-4 font-semibold w-[180px]">Time In</th>
                <th className="py-6 px-4 font-semibold w-[180px]">Time Out</th>
                <th className="py-6 px-4 font-semibold w-[80px]">Duration</th>
                <th className="py-6 px-4 font-semibold w-[120px]">Status</th>
                <th className="py-6 px-4 pr-8 font-semibold text-right w-[160px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-16 text-center text-sm text-gray-500"
                  >
                    {search.trim() || hasActiveFilters
                      ? "No logs match your filters."
                      : "No visitor logs yet. Logs are created automatically when users sign in."}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className={`group hover:bg-gray-50/50 transition-colors ${log.status !== "ACTIVE" ? "opacity-60" : ""}`}
                  >
                    <td className="py-5 pl-8 pr-4">
                      <span className="font-medium text-gray-900 text-sm">
                        {log.name}
                      </span>
                    </td>
                    <td className="py-5 px-4">
                      <span className="text-sm text-gray-600">
                        {log.company ?? "\u2014"}
                      </span>
                    </td>
                    <td className="py-5 px-4">
                      <span className="text-sm text-gray-600">
                        {log.contact_number ?? "\u2014"}
                      </span>
                    </td>
                    <td className="py-5 px-4">
                      <span className="text-sm text-gray-600 line-clamp-2">
                        {log.purpose_of_visit}
                      </span>
                    </td>
                    <td className="py-5 px-4">
                      <span className="text-sm text-gray-600">
                        {formatDateTime(log.time_in)}
                      </span>
                    </td>
                    <td className="py-5 px-4">
                      <span className="text-sm text-gray-600">
                        {formatDateTime(log.time_out)}
                      </span>
                    </td>
                    <td className="py-5 px-4">
                      <span className="text-sm text-gray-600">
                        {formatDuration(log.expected_duration)}
                      </span>
                    </td>
                    <td className="py-5 px-4">
                      {statusBadge(log.status as VisitStatus, log.time_out)}
                    </td>
                    <td className="py-5 px-4 pr-8 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {log.status === "ACTIVE" && (
                          <button
                            onClick={() => handleClockOut(log.id, log.name)}
                            disabled={isPending}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 ring-1 ring-amber-200 transition-colors shadow-sm disabled:opacity-50"
                            title="Clock out (manual override)"
                          >
                            <LogOut className="h-3.5 w-3.5" />
                            Out
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(log.id, log.name)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 ring-1 ring-red-200 transition-colors shadow-sm disabled:opacity-50"
                          title="Delete visitor log"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Dialog
        open={!!clockOutVisitorData}
        onOpenChange={(open) => !open && setClockOutVisitorData(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clock out visitor?</DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to clock out{" "}
              <span className="font-medium text-gray-900">
                {clockOutVisitorData?.name}
              </span>
              ?
              <br className="mb-2" />
              This will mark their visit as completed with the current time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setClockOutVisitorData(null)}
              className="border-gray-200"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmClockOut}
              disabled={isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white border-transparent"
            >
              {isPending ? "Clocking out..." : "Clock Out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!deleteVisitorData}
        onOpenChange={(open) => !open && setDeleteVisitorData(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete visitor log?</DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to delete the visitor log for{" "}
              <span className="font-medium text-gray-900">
                {deleteVisitorData?.name}
              </span>
              ?
              <br className="mb-2" />
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteVisitorData(null)}
              className="border-gray-200"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={isPending}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white border-transparent"
            >
              {isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
