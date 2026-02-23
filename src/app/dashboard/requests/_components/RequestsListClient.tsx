"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Eye, Plus, Search, ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";
import {
  MobileCardList,
  type MobileCardData,
} from "@/components/ui/mobile-card";
import { RequestsFilter } from "@/components/dashboard/RequestsFilter";

export type RequestsListRow = {
  id: string;
  ticketNumber: string;
  category: string;
  categoryKey: string;
  priority: string;
  status: string;
  statusLabel: string;
  branchName: string;
  requesterName?: string;
  handlerName?: string;
  created_at_iso: string;
};

function formatDateShort(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}-${dd}-${yy}`;
}

function statusToVariant(
  status: string,
): "success" | "warning" | "error" | "info" | "default" {
  if (status === "resolved") return "success";
  if (status === "pending") return "warning";
  if (status === "cancelled") return "default";
  if (status === "open") return "info";
  return "info";
}

function priorityPill(priority: string) {
  const cls =
    priority === "urgent"
      ? "bg-red-100 text-red-700"
      : priority === "high"
        ? "bg-orange-100 text-orange-700"
        : priority === "medium"
          ? "bg-blue-100 text-blue-700"
          : "bg-gray-100 text-gray-900";
  return `inline-flex items-center justify-center rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide min-w-[60px] ${cls}`;
}

function statusPill(status: string) {
  let cls = "bg-gray-100 text-gray-900";
  if (status === "resolved") {
    cls = "bg-green-50 text-green-600";
  } else if (status === "open") {
    cls = "bg-blue-50 text-blue-600";
  } else if (status === "pending") {
    cls = "bg-orange-50 text-orange-600";
  } else if (status === "cancelled") {
    cls = "bg-gray-200 text-gray-900";
  }
  return `inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${cls}`;
}

export function RequestsListClient(props: {
  rows: RequestsListRow[];
  initialQuery?: string;
  showRequester?: boolean;
  canCreate?: boolean;
  title?: string;
  role?: string;
  currentRoleView?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState(props.initialQuery ?? "");
  const deferredQuery = useDeferredValue(query);

  // Sync search to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (deferredQuery) {
      params.set("search", deferredQuery);
    } else {
      params.delete("search");
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }, [deferredQuery, pathname, router, searchParams]);

  // Use props.rows directly as they are already filtered by the server
  const filteredRows = props.rows;
  const hasFilters = searchParams.toString().length > 0;

  const mobileCards: MobileCardData[] = filteredRows.map((r) => {
    const createdAt = new Date(r.created_at_iso);
    return {
      id: r.id,
      displayId: r.ticketNumber,
      title: r.category,
      subtitle: props.showRequester && r.requesterName
        ? `${r.requesterName} • ${r.branchName}`
        : r.branchName,
      status: {
        label: r.statusLabel,
        variant: statusToVariant(r.status),
      },
      date: formatDateShort(createdAt),
      actionHref: `/dashboard/requests/${r.id}`,
      actionLabel: "View",
    } satisfies MobileCardData;
  });

    // Sort state
    const currentSort = searchParams.get("sort") || "date";
    const currentOrder = searchParams.get("order") || "desc";

    return (
      <div className="-m-4 md:-m-8 p-4 md:p-8 flex flex-col min-h-[calc(100vh-theme(spacing.16))]">
        {/* Mobile Header */}
      <div className="md:hidden mb-4">
        <div className="flex flex-col gap-3 mb-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">
              {props.title ?? (props.showRequester ? "All Tickets" : "My Tickets")}
            </h1>
            <div className="flex gap-2">
              <RequestsFilter />
              {props.canCreate !== false && (
                <Link
                  href="/dashboard/requests/create"
                  className="h-10 w-10 rounded-full bg-[#358334] text-white flex items-center justify-center shadow-lg"
                  aria-label="New Ticket"
                >
                  <Plus className="h-5 w-5" />
                </Link>
              )}
            </div>
          </div>
          {(props.role === "admin" || props.role === "superadmin") && (
            <div className="flex space-x-1 rounded-lg bg-gray-100 p-1 w-fit">
              <button onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.set("roleView", "requested");
                router.push(`${pathname}?${params.toString()}`);
              }} className={`px-3 py-1.5 text-sm font-medium rounded-md ${props.currentRoleView === "requested" ? "bg-white text-gray-900 shadow" : "text-gray-500 hover:text-gray-900"}`}>
                Requested
              </button>
              <button onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.set("roleView", "managed");
                router.push(`${pathname}?${params.toString()}`);
              }} className={`px-3 py-1.5 text-sm font-medium rounded-md ${props.currentRoleView === "managed" ? "bg-white text-gray-900 shadow" : "text-gray-500 hover:text-gray-900"}`}>
                Managed
              </button>
            </div>
          )}
        </div>

        {/* Mobile Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tickets..."
            className="h-12 w-full rounded-xl bg-gray-100 pl-11 pr-4 text-base outline-none focus:ring-2 focus:ring-[#358334]/20 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden">
        <MobileCardList
          items={mobileCards}
          emptyMessage={
            hasFilters ? "No tickets match your search." : "No tickets yet."
          }
          showAmount={false}
        />
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex flex-col gap-4 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {props.title ?? (props.showRequester ? "All Tickets" : "My Tickets")}
            </h1>
            {(props.role === "admin" || props.role === "superadmin") && (
              <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
                <button onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set("roleView", "requested");
                  router.push(`${pathname}?${params.toString()}`);
                }} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${props.currentRoleView === "requested" ? "bg-white text-gray-900 shadow" : "text-gray-500 hover:text-gray-900"}`}>
                  Requested
                </button>
                <button onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set("roleView", "managed");
                  router.push(`${pathname}?${params.toString()}`);
                }} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${props.currentRoleView === "managed" ? "bg-white text-gray-900 shadow" : "text-gray-500 hover:text-gray-900"}`}>
                  Managed
                </button>
              </div>
            )}
          </div>
          {props.canCreate !== false && (
            <Link
              href="/dashboard/requests/create"
              className="inline-flex items-center gap-2 rounded-lg bg-[#358334] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2F5E3D] transition-colors shadow-sm"
            >
              New Ticket +
            </Link>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:flex flex-col flex-1 w-full rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden h-full">
        <div className="p-5 md:p-6 border-b border-gray-100 shrink-0">
          <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                />
              </div>
              <RequestsFilter />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                <th className="py-6 pl-8 pr-4 font-semibold w-[120px]">
                  Ticket
                </th>
                <th className="py-6 px-4 font-semibold w-[250px]">
                  Category
                </th>
                {props.showRequester && (
                  <th className="py-6 px-4 font-semibold w-[150px]">
                    Requester
                  </th>
                )}
                <th className="py-6 px-4 font-semibold w-[150px]">
                  Handler
                </th>
                <th className="py-6 px-4 font-semibold w-[100px]">Priority</th>
                <th
                  className="py-6 px-4 font-semibold w-[120px] cursor-pointer select-none"
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    if (currentSort === "status") {
                      params.set("sort", "status");
                      params.set("order", currentOrder === "asc" ? "desc" : "asc");
                    } else {
                      params.set("sort", "status");
                      params.set("order", "desc");
                    }
                    router.push(`${pathname}?${params.toString()}`);
                  }}
                  aria-sort={currentSort === "status" ? (currentOrder === "asc" ? "ascending" : "descending") : "none"}
                >
                  <span className="inline-flex items-center gap-1">
                    Status
                    {currentSort === "status"
                      ? currentOrder === "asc"
                        ? <ChevronUp className="inline h-4 w-4" />
                        : <ChevronDown className="inline h-4 w-4" />
                      : <ArrowUpDown className="inline h-4 w-4" />}
                  </span>
                </th>
                <th
                  className="py-6 px-4 font-semibold w-[120px] cursor-pointer select-none"
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    if (currentSort === "date") {
                      params.set("sort", "date");
                      params.set("order", currentOrder === "asc" ? "desc" : "asc");
                    } else {
                      params.set("sort", "date");
                      params.set("order", "desc");
                    }
                    router.push(`${pathname}?${params.toString()}`);
                  }}
                  aria-sort={currentSort === "date" ? (currentOrder === "asc" ? "ascending" : "descending") : "none"}
                >
                  <span className="inline-flex items-center gap-1">
                    Date
                    {currentSort === "date"
                      ? currentOrder === "asc"
                        ? <ChevronUp className="inline h-4 w-4" />
                        : <ChevronDown className="inline h-4 w-4" />
                      : <ArrowUpDown className="inline h-4 w-4" />}
                  </span>
                </th>
                <th className="py-6 px-4 pr-8 font-semibold text-right w-[100px]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={props.showRequester ? 7 : 6}
                    className="py-16 text-center text-sm text-gray-500"
                  >
                    {hasFilters
                      ? "No tickets match your search."
                      : "No tickets yet."}
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => {
                  const rowOpacity =
                    r.status === "cancelled" ? "opacity-60 bg-gray-50/30" : "";

                  return (
                    <tr
                      key={r.id}
                      className={`group hover:bg-gray-50/50 transition-colors ${rowOpacity}`}
                    >
                      <td className="py-5 pl-8 pr-4">
                        <span className="text-sm font-medium text-gray-400">
                          {r.ticketNumber}
                        </span>
                      </td>
                      <td className="py-5 px-4">
                        <div className="font-bold text-gray-900 text-sm">
                          {r.category}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {r.branchName}
                        </div>
                      </td>
                      {props.showRequester && (
                        <td className="py-5 px-4">
                          <div className="text-sm font-medium text-gray-900">
                            {r.requesterName}
                          </div>
                        </td>
                      )}
                      <td className="py-5 px-4">
                        <div className="text-sm text-gray-700">
                          {r.handlerName ? (
                            <span className="inline-flex items-center gap-1.5 rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                              {r.handlerName}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Unassigned</span>
                          )}
                        </div>
                      </td>
                      <td className="py-5 px-4">
                        <span className={priorityPill(r.priority)}>
                          {r.priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-5 px-4">
                        <span className={statusPill(r.status)}>
                          {r.statusLabel}
                        </span>
                      </td>
                      <td className="py-5 px-4 text-sm text-gray-400 font-medium">
                        {formatDateShort(new Date(r.created_at_iso))}
                      </td>
                      <td className="py-5 px-4 pr-8 text-right">
                        <Link
                          href={`/dashboard/requests/${r.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#2C3E50] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#1a252f] transition-colors shadow-sm"
                        >
                          View <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
