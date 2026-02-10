"use client";

import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  PlusCircle,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RequesterDashboardProps {
  stats: {
    totalSubmitted: number;
    pendingReview: number;
    approved: number;
    onHold: number;
  };
  rows: {
    requestId: string;
    ticketNumber: string;
    category: string;
    categoryCode: string;
    title: string;
    statusLabel: string;
    statusVariant: string;
    dateLabel: string;
  }[];
}

const statusBadgeColors: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  error: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  default: "bg-gray-100 text-gray-900",
};

export default function RequesterDashboard({
  stats,
  rows,
}: RequesterDashboardProps) {
  const statCards = [
    {
      label: "Total Submitted",
      value: stats.totalSubmitted,
      icon: FileText,
      color: "text-[#2F5E3D]",
      bg: "bg-[#2F5E3D]/10",
    },
    {
      label: "Pending",
      value: stats.pendingReview,
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      label: "Approved",
      value: stats.approved,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "On Hold",
      value: stats.onHold,
      icon: XCircle, // Maybe use PauseCircle? Budget used XCircle for Rejected in main dashboard but PauseCircle for On Hold
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Overview of your booking requests
          </p>
        </div>
        <Link href="/dashboard/requests/create">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Request
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-4 md:p-6">
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
                  stat.bg
                )}
              >
                <stat.icon className={cn("h-6 w-6", stat.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Requests</CardTitle>
          <Link href="/dashboard/requests">
            <Button variant="ghost" size="sm">
              View all
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-sm font-medium text-gray-900">
                No requests yet
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Create your first booking request to get started.
              </p>
              <Link href="/dashboard/requests/create" className="mt-4">
                <Button size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Request
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {rows.map((req) => {
                const badgeColor =
                  statusBadgeColors[req.statusVariant] ?? statusBadgeColors.default;

                return (
                  <Link
                    key={req.requestId}
                    href={`/dashboard/requests/${req.requestId}`}
                    className="flex items-center justify-between py-3 px-1 hover:bg-gray-50 rounded-md transition-colors -mx-1"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-400">
                          #{req.ticketNumber}
                        </span>
                        <span className="text-xs font-medium text-[#2F5E3D] bg-[#2F5E3D]/10 px-2 py-0.5 rounded">
                          {req.categoryCode}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">
                        {req.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <span
                        className={cn(
                          "text-xs font-medium px-2.5 py-1 rounded-full",
                          badgeColor
                        )}
                      >
                        {req.statusLabel}
                      </span>
                      <span className="text-xs text-gray-400 hidden sm:block">
                        {req.dateLabel}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
