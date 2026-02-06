import Link from "next/link";
import { PlusCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getRequests } from "@/actions/request";
import { CATEGORY_MAP, STATUS_CONFIG } from "@/db/schema";
import { cn } from "@/lib/utils";
import { RequestFilters } from "./_components/RequestFilters";

const statusBadgeColors: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  error: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  default: "bg-gray-100 text-gray-700",
};

const priorityColors: Record<string, string> = {
  low: "text-gray-500",
  medium: "text-blue-600",
  high: "text-orange-600",
  urgent: "text-red-600",
};

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; search?: string }>;
}) {
  const params = await searchParams;
  const requests = await getRequests({
    status: params.status,
    category: params.category,
    search: params.search,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Requests</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage and track all your booking requests
          </p>
        </div>
        <Link href="/dashboard/requests/create">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Request
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <RequestFilters
        currentStatus={params.status}
        currentCategory={params.category}
      />

      {/* Request List */}
      <Card>
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <FileText className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-sm font-medium text-gray-900">
                No requests found
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {params.status || params.category
                  ? "Try adjusting your filters."
                  : "Create your first booking request to get started."}
              </p>
              {!params.status && !params.category && (
                <Link href="/dashboard/requests/create" className="mt-4">
                  <Button size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Request
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Table header - desktop */}
              <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="col-span-1">Ticket</div>
                <div className="col-span-3">Title</div>
                <div className="col-span-2">Category</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1">Priority</div>
                <div className="col-span-2">Created</div>
                <div className="col-span-1" />
              </div>

              {/* Rows */}
              <div className="divide-y divide-gray-100">
                {requests.map((req) => {
                  const cat = CATEGORY_MAP[req.category];
                  const statusCfg = STATUS_CONFIG[req.status];
                  const badgeColor =
                    statusBadgeColors[statusCfg?.variant ?? "default"];

                  return (
                    <Link
                      key={req.id}
                      href={`/dashboard/requests/${req.id}`}
                      className="block hover:bg-gray-50 transition-colors"
                    >
                      {/* Desktop row */}
                      <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-4 items-center">
                        <div className="col-span-1">
                          <span className="text-xs font-mono text-gray-400">
                            #{String(req.ticket_number).padStart(4, "0")}
                          </span>
                        </div>
                        <div className="col-span-3">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {req.title}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-xs font-medium text-[#2F5E3D] bg-[#2F5E3D]/10 px-2 py-0.5 rounded">
                            {cat?.code ?? req.category} — {cat?.label ?? req.category}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span
                            className={cn(
                              "text-xs font-medium px-2.5 py-1 rounded-full",
                              badgeColor
                            )}
                          >
                            {statusCfg?.label ?? req.status}
                          </span>
                        </div>
                        <div className="col-span-1">
                          <span
                            className={cn(
                              "text-xs font-medium capitalize",
                              priorityColors[req.priority] ?? "text-gray-500"
                            )}
                          >
                            {req.priority}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-xs text-gray-500">
                            {new Date(req.created_at).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </span>
                        </div>
                        <div className="col-span-1 text-right">
                          <span className="text-xs text-gray-400">View</span>
                        </div>
                      </div>

                      {/* Mobile card */}
                      <div className="md:hidden px-4 py-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-gray-400">
                              #{String(req.ticket_number).padStart(4, "0")}
                            </span>
                            <span className="text-xs font-medium text-[#2F5E3D] bg-[#2F5E3D]/10 px-2 py-0.5 rounded">
                              {cat?.code ?? req.category}
                            </span>
                          </div>
                          <span
                            className={cn(
                              "text-xs font-medium px-2.5 py-1 rounded-full",
                              badgeColor
                            )}
                          >
                            {statusCfg?.label ?? req.status}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {req.title}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className={cn("capitalize", priorityColors[req.priority])}>
                            {req.priority}
                          </span>
                          <span>
                            {new Date(req.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
