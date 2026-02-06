"use client";

import Link from "next/link";
import {
  FileText,
  CheckCircle,
  Users,
  XCircle,
  PauseCircle,
  Clock,
} from "lucide-react";
import RequestTable, { type RequestTableRow } from "../RequestTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SuperadminStats {
  totalRequests: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  onHold: number;
  closed: number;
}

interface SuperadminOverviewProps {
  stats: SuperadminStats;
  pendingUserCount: number;
}

function StatCard({
  icon,
  value,
  label,
  href,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl md:rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 md:p-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow group"
    >
      <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg md:rounded-xl flex items-center justify-center bg-blue-50 transition-transform group-hover:scale-110">
        {icon}
      </div>
      <div className="mt-3 md:mt-6 text-2xl md:text-4xl font-bold text-gray-900 tracking-tight">
        {value}
      </div>
      <div className="mt-0.5 md:mt-1 text-[10px] md:text-sm font-medium text-gray-500">
        {label}
      </div>
    </Link>
  );
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-6 md:grid-cols-5">
        <StatCard
          icon={<FileText className="h-6 w-6 text-blue-500" />}
          value={stats.totalRequests}
          label="Total Requests"
          href="/dashboard/requests"
        />
        <StatCard
          icon={<Clock className="h-6 w-6 text-orange-500" />}
          value={stats.pendingReview}
          label="Pending Review"
          href="/dashboard/requests?status=pending"
        />
        <StatCard
          icon={<CheckCircle className="h-6 w-6 text-green-500" />}
          value={stats.approved}
          label="Approved"
          href="/dashboard/requests?status=approved"
        />
        <StatCard
          icon={<Users className="h-6 w-6 text-purple-500" />}
          value={pendingUserCount}
          label="Pending Users"
          href="/dashboard/admin/approvals"
        />
        <StatCard
          icon={<XCircle className="h-6 w-6 text-gray-500" />}
          value={stats.rejected}
          label="Rejected"
          href="/dashboard/requests?status=rejected"
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
              <PauseCircle className="h-4 w-4 text-green-700" />
              <p className="text-sm font-semibold text-green-900">
                {stats.onHold} on hold / {stats.closed} closed
              </p>
            </div>
            <p className="text-sm text-green-800 mt-1">
              Requests that are paused or completed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AllRequestsTabContent({
  stats,
  rows,
}: {
  stats: SuperadminStats;
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
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
          <p className="text-xs text-gray-500 font-semibold uppercase">
            Total Requests
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {stats.totalRequests}
          </p>
        </div>
        <div className="rounded-lg bg-orange-50 p-4 border border-orange-100">
          <p className="text-xs text-orange-600 font-semibold uppercase">
            Pending Review
          </p>
          <p className="text-2xl font-bold text-orange-900 mt-2">
            {stats.pendingReview}
          </p>
        </div>
        <div className="rounded-lg bg-green-50 p-4 border border-green-100">
          <p className="text-xs text-green-600 font-semibold uppercase">
            Approved
          </p>
          <p className="text-2xl font-bold text-green-900 mt-2">
            {stats.approved}
          </p>
        </div>
        <div className="rounded-lg bg-red-50 p-4 border border-red-100">
          <p className="text-xs text-red-600 font-semibold uppercase">
            Rejected
          </p>
          <p className="text-2xl font-bold text-red-900 mt-2">
            {stats.rejected}
          </p>
        </div>
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
          <p className="text-gray-600">
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
