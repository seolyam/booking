"use client";

import { useState, useDeferredValue, useTransition } from "react";
import { Search, UserPlus, LogOut, Trash2, Building2, Phone, Clock } from "lucide-react";
import type { VisitorLog } from "@/db/schema";
import { logVisitor, clockOutVisitor, deleteVisitorLog } from "@/actions/visitor-logs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// ---------------------------------------------------------------------------
// Date/time formatting
// ---------------------------------------------------------------------------

function formatDateTime(date: Date | null): string {
  if (!date) return "—";
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
  if (!date) return "—";
  return new Date(date).toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function statusBadge(timeOut: Date | null) {
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
      On-site
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function VisitorLogsClient({ logs }: { logs: VisitorLog[] }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formPurpose, setFormPurpose] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Client-side search filter
  const filteredLogs = logs.filter((log) => {
    if (!deferredQuery.trim()) return true;
    const term = deferredQuery.toLowerCase();
    return (
      log.name.toLowerCase().includes(term) ||
      (log.company?.toLowerCase().includes(term) ?? false) ||
      log.purpose_of_visit.toLowerCase().includes(term) ||
      (log.contact_number?.toLowerCase().includes(term) ?? false)
    );
  });

  const activeCount = filteredLogs.filter((l) => !l.time_out).length;

  function resetForm() {
    setFormName("");
    setFormCompany("");
    setFormContact("");
    setFormPurpose("");
    setFormError(null);
  }

  function handleOpenDialog() {
    resetForm();
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    startTransition(async () => {
      const result = await logVisitor({
        name: formName.trim(),
        company: formCompany.trim() || null,
        contact_number: formContact.trim() || null,
        purpose_of_visit: formPurpose.trim(),
      });

      if ("error" in result) {
        setFormError(result.error);
        return;
      }

      setDialogOpen(false);
      resetForm();
    });
  }

  function handleClockOut(visitorId: string, visitorName: string) {
    const confirmed = window.confirm(
      `Clock out ${visitorName}?`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await clockOutVisitor(visitorId);
      if ("error" in result) {
        alert(result.error);
      }
    });
  }

  function handleDelete(visitorId: string, visitorName: string) {
    const confirmed = window.confirm(
      `Delete visitor log for "${visitorName}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteVisitorLog(visitorId);
      if ("error" in result) {
        alert(result.error);
      }
    });
  }

  return (
    <>
      {/* Log Visitor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Visitor</DialogTitle>
            <DialogDescription>
              Record a new visitor check-in.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
                {formError}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="visitor-name" className="text-sm font-medium text-gray-700">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="visitor-name"
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Visitor's full name"
                required
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="visitor-company" className="text-sm font-medium text-gray-700">
                Company
              </label>
              <input
                id="visitor-company"
                type="text"
                value={formCompany}
                onChange={(e) => setFormCompany(e.target.value)}
                placeholder="Company / Organization"
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="visitor-contact" className="text-sm font-medium text-gray-700">
                Contact Number
              </label>
              <input
                id="visitor-contact"
                type="text"
                value={formContact}
                onChange={(e) => setFormContact(e.target.value)}
                placeholder="Phone number"
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="visitor-purpose" className="text-sm font-medium text-gray-700">
                Purpose of Visit <span className="text-red-500">*</span>
              </label>
              <textarea
                id="visitor-purpose"
                value={formPurpose}
                onChange={(e) => setFormPurpose(e.target.value)}
                placeholder="Reason for visiting"
                required
                rows={3}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all resize-none"
              />
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-[#358334] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2F5E3D] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Logging..." : "Log Visitor"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="-m-4 md:-m-8 p-4 md:p-8 w-full mx-auto flex flex-col min-h-[calc(100vh-theme(spacing.16))]">
        {/* Mobile Header */}
        <div className="md:hidden mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Today&apos;s Visitors</h2>
              <p className="text-sm text-gray-500">
                {activeCount} currently on-site
              </p>
            </div>
            <button
              onClick={handleOpenDialog}
              className="h-10 w-10 rounded-full bg-[#358334] text-white flex items-center justify-center shadow-lg"
              aria-label="Log Visitor"
            >
              <UserPlus className="h-5 w-5" />
            </button>
          </div>

          {/* Mobile Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search visitors..."
              className="h-12 w-full rounded-xl bg-gray-100 pl-11 pr-4 text-base outline-none focus:ring-2 focus:ring-[#358334]/20 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-500">
              {deferredQuery.trim() ? "No visitors match your search." : "No visitor logs yet."}
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 ${log.time_out ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{log.name}</p>
                    {log.company && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3 w-3" />
                        {log.company}
                      </p>
                    )}
                  </div>
                  {statusBadge(log.time_out)}
                </div>

                <p className="text-sm text-gray-600 mb-2">{log.purpose_of_visit}</p>

                <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                  {log.contact_number && (
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
                </div>

                <div className="flex items-center gap-2">
                  {!log.time_out && (
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
              {filteredLogs.length} total &middot; {activeCount} currently on-site
            </p>
          </div>
          <button
            onClick={handleOpenDialog}
            className="inline-flex items-center gap-2 rounded-lg bg-[#358334] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2F5E3D] transition-colors shadow-sm"
          >
            <UserPlus className="h-4 w-4" />
            Log Visitor
          </button>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:flex flex-col flex-1 w-full rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden h-full">
          {/* Search Bar */}
          <div className="p-5 md:p-6 border-b border-gray-100 shrink-0">
            <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search visitors..."
                  className="h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="py-6 pl-8 pr-4 font-semibold w-[200px]">Visitor</th>
                  <th className="py-6 px-4 font-semibold w-[150px]">Company</th>
                  <th className="py-6 px-4 font-semibold w-[120px]">Contact</th>
                  <th className="py-6 px-4 font-semibold">Purpose</th>
                  <th className="py-6 px-4 font-semibold w-[160px]">Time In</th>
                  <th className="py-6 px-4 font-semibold w-[160px]">Time Out</th>
                  <th className="py-6 px-4 font-semibold w-[100px]">Status</th>
                  <th className="py-6 px-4 pr-8 font-semibold text-right w-[160px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-sm text-gray-500">
                      {deferredQuery.trim()
                        ? "No visitors match your search."
                        : "No visitor logs yet. Click \"Log Visitor\" to add the first entry."}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className={`group hover:bg-gray-50/50 transition-colors ${log.time_out ? "opacity-60" : ""}`}
                    >
                      <td className="py-5 pl-8 pr-4">
                        <span className="font-medium text-gray-900 text-sm">{log.name}</span>
                      </td>
                      <td className="py-5 px-4">
                        <span className="text-sm text-gray-600">{log.company ?? "—"}</span>
                      </td>
                      <td className="py-5 px-4">
                        <span className="text-sm text-gray-600">{log.contact_number ?? "—"}</span>
                      </td>
                      <td className="py-5 px-4">
                        <span className="text-sm text-gray-600 line-clamp-2">{log.purpose_of_visit}</span>
                      </td>
                      <td className="py-5 px-4">
                        <span className="text-sm text-gray-600">{formatDateTime(log.time_in)}</span>
                      </td>
                      <td className="py-5 px-4">
                        <span className="text-sm text-gray-600">{formatDateTime(log.time_out)}</span>
                      </td>
                      <td className="py-5 px-4">{statusBadge(log.time_out)}</td>
                      <td className="py-5 px-4 pr-8 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {!log.time_out && (
                            <button
                              onClick={() => handleClockOut(log.id, log.name)}
                              disabled={isPending}
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 ring-1 ring-amber-200 transition-colors shadow-sm disabled:opacity-50"
                              title="Clock out visitor"
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
      </div>
    </>
  );
}
