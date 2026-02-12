"use client";

import Link from "next/link";
import {
  FileText,
  CheckCircle,
  Users,
  XCircle,
  Clock,
} from "lucide-react";
import RequestTable, { type RequestTableRow } from "../RequestTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";

interface SuperadminStats {
  totalRequests: number;
  open: number;
  pending: number;
  resolved: number;
  cancelled: number;
}

interface SuperadminOverviewProps {
  stats: SuperadminStats;
  pendingUserCount: number;
}

export function OverviewSection({
  stats,
  pendingUserCount,
}: SuperadminOverviewProps) {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-4xl font-black text-gray-900">
          Superadmin Dashboard
        </h1>
        <p className="text-gray-500 mt-1 md:mt-2 font-medium text-sm md:text-base">
          Manage all requests, approvals, and users across branches
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<FileText className="h-6 w-6" />}
          value={stats.totalRequests}
          label="Total Requests"
          href="/dashboard/requests"
          colorClass="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={<Clock className="h-6 w-6" />}
          value={stats.open}
          label="Open"
          href="/dashboard/requests?status=open"
          colorClass="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={<CheckCircle className="h-6 w-6" />}
          value={stats.pending}
          label="Pending"
          href="/dashboard/requests?status=pending"
          colorClass="bg-[#FFF4DE] text-[#FFB020]"
        />
        <StatCard
          icon={<Users className="h-6 w-6" />}
          value={pendingUserCount}
          label="Pending Users"
          href="/dashboard/admin/approvals"
          colorClass="bg-purple-50 text-purple-600"
        />
        <StatCard
          icon={<CheckCircle className="h-6 w-6" />}
          value={stats.resolved}
          label="Resolved"
          href="/dashboard/requests?status=resolved"
          colorClass="bg-green-50 text-green-600"
        />
        <StatCard
          icon={<XCircle className="h-6 w-6" />}
          value={stats.cancelled}
          label="Cancelled"
          href="/dashboard/requests?status=cancelled"
          colorClass="bg-gray-50 text-gray-600"
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Quick Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
            <p className="text-sm font-semibold text-blue-900">
              Request Management
            </p>
            <p className="text-sm text-blue-800 mt-1">
              View and manage all requests across branches. Use the &quot;All Requests&quot; tab
              to see the full list with filtering options.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-green-50 border border-green-100">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-700" />
              <p className="text-sm font-semibold text-green-900">
                {stats.resolved} resolved / {stats.cancelled} cancelled
              </p>
            </div>
            <p className="text-sm text-green-800 mt-1">
              Requests that are completed or cancelled.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AllRequestsTabContent({
  rows,
}: {
  rows: RequestTableRow[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900">All Requests</h3>
        <Link href="/dashboard/requests/create">
          <Button className="bg-[#358334] hover:bg-[#2d6f2c]">
            New Request
          </Button>
        </Link>
      </div>
      <RequestTable rows={rows} emptyMessage="No requests found." />
    </div>
  );
}

export function UsersTabContent({
  pendingUserCount,
}: {
  pendingUserCount: number;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900">User Management</h3>
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Pending User Approvals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-900">
            Review and approve pending user applications
          </p>
          {pendingUserCount > 0 && (
            <p className="text-2xl font-bold text-orange-600">
              {pendingUserCount} pending
            </p>
          )}
          <Link href="/dashboard/admin/approvals">
            <Button className="bg-[#358334] hover:bg-[#2d6f2c]">
              View Applications
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
