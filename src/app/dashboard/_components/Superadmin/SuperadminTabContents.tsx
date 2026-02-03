"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileText,
  Eye,
  CheckCircle,
  Users,
  XCircle,
} from "lucide-react";
import BudgetTable, { SuperadminDashboardRow } from "../BudgetTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SuperadminOverviewProps {
  requesterStats: {
    totalSubmitted: number;
    pendingReview: number;
    approved: number;
    needsRevision: number;
  };
  reviewerStats: {
    totalSubmitted: number;
    pendingReview: number;
    approved: number;
  };
  approverStats: {
    totalApproved: number;
    awaitingApproval: number;
    approvedThisMonth: number;
    rejected: number;
  };
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
  requesterStats,
  reviewerStats,
  approverStats,
  pendingUserCount,
}: SuperadminOverviewProps) {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-4xl font-black text-gray-900">
          Superadmin Dashboard
        </h1>
        <p className="text-gray-500 mt-1 md:mt-2 font-medium text-sm md:text-base">
          Manage all budgets, reviews, approvals, and users
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-6 md:grid-cols-5">
        <StatCard
          icon={<FileText className="h-6 w-6 text-blue-500" />}
          value={requesterStats.totalSubmitted}
          label="Budgets Created"
          href="/dashboard/budget"
        />
        <StatCard
          icon={<Eye className="h-6 w-6 text-orange-500" />}
          value={reviewerStats.pendingReview}
          label="Awaiting Review"
          href="/dashboard/reviewer"
        />
        <StatCard
          icon={<CheckCircle className="h-6 w-6 text-green-500" />}
          value={approverStats.totalApproved}
          label="Total Approved"
          href="/dashboard/approver/approvals"
        />
        <StatCard
          icon={<Users className="h-6 w-6 text-purple-500" />}
          value={pendingUserCount}
          label="Pending Users"
          href="/dashboard/admin/approvals"
        />
        <StatCard
          icon={<XCircle className="h-6 w-6 text-gray-500" />}
          value={approverStats.rejected}
          label="Rejected"
          href="/dashboard"
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
            <p className="text-sm font-semibold text-blue-900">
              🔍 Quick Access
            </p>
            <p className="text-sm text-blue-800 mt-1">
              Switch between Requester, Reviewer, and Approver roles using the
              tabs above. All actions are logged and attributed to the
              superadmin account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RequesterTabContent({
  requesterStats,
  requesterRows,
}: {
  requesterStats: SuperadminOverviewProps["requesterStats"];
  requesterRows: SuperadminDashboardRow[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900">Your Budgets</h3>
        <Link href="/dashboard/budget/create">
          <Button className="bg-[#358334] hover:bg-[#2d6f2c]">
            Create Budget
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
          <p className="text-xs text-gray-500 font-semibold uppercase">
            Total Submitted
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {requesterStats.totalSubmitted}
          </p>
        </div>
        <div className="rounded-lg bg-orange-50 p-4 border border-orange-100">
          <p className="text-xs text-orange-600 font-semibold uppercase">
            Pending Review
          </p>
          <p className="text-2xl font-bold text-orange-900 mt-2">
            {requesterStats.pendingReview}
          </p>
        </div>
        <div className="rounded-lg bg-green-50 p-4 border border-green-100">
          <p className="text-xs text-green-600 font-semibold uppercase">
            Approved
          </p>
          <p className="text-2xl font-bold text-green-900 mt-2">
            {requesterStats.approved}
          </p>
        </div>
        <div className="rounded-lg bg-red-50 p-4 border border-red-100">
          <p className="text-xs text-red-600 font-semibold uppercase">
            Needs Revision
          </p>
          <p className="text-2xl font-bold text-red-900 mt-2">
            {requesterStats.needsRevision}
          </p>
        </div>
      </div>
      <BudgetTable rows={requesterRows} emptyMessage="No budgets found." />
    </div>
  );
}

export function ReviewerTabContent({
  reviewerStats,
  reviewerRows,
}: {
  reviewerStats: SuperadminOverviewProps["reviewerStats"];
  reviewerRows: SuperadminDashboardRow[];
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900">Budgets for Review</h3>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
          <p className="text-xs text-gray-500 font-semibold uppercase">
            Total Submitted
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {reviewerStats.totalSubmitted}
          </p>
        </div>
        <div className="rounded-lg bg-orange-50 p-4 border border-orange-100">
          <p className="text-xs text-orange-600 font-semibold uppercase">
            Pending Review
          </p>
          <p className="text-2xl font-bold text-orange-900 mt-2">
            {reviewerStats.pendingReview}
          </p>
        </div>
        <div className="rounded-lg bg-green-50 p-4 border border-green-100">
          <p className="text-xs text-green-600 font-semibold uppercase">
            Verified
          </p>
          <p className="text-2xl font-bold text-green-900 mt-2">
            {reviewerStats.approved}
          </p>
        </div>
      </div>
      <BudgetTable rows={reviewerRows} emptyMessage="No budgets found." />
    </div>
  );
}

export function ApproverTabContent({
  approverStats,
  approverRows,
}: {
  approverStats: SuperadminOverviewProps["approverStats"];
  approverRows: SuperadminDashboardRow[];
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900">Budget Approvals</h3>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-lg bg-green-50 p-4 border border-green-100">
          <p className="text-xs text-green-600 font-semibold uppercase">
            Total Approved
          </p>
          <p className="text-2xl font-bold text-green-900 mt-2">
            {approverStats.totalApproved}
          </p>
        </div>
        <div className="rounded-lg bg-orange-50 p-4 border border-orange-100">
          <p className="text-xs text-orange-600 font-semibold uppercase">
            Awaiting Approval
          </p>
          <p className="text-2xl font-bold text-orange-900 mt-2">
            {approverStats.awaitingApproval}
          </p>
        </div>
        <div className="rounded-lg bg-blue-50 p-4 border border-blue-100">
          <p className="text-xs text-blue-600 font-semibold uppercase">
            This Month
          </p>
          <p className="text-2xl font-bold text-blue-900 mt-2">
            {approverStats.approvedThisMonth}
          </p>
        </div>
        <div className="rounded-lg bg-red-50 p-4 border border-red-100">
          <p className="text-xs text-red-600 font-semibold uppercase">
            Rejected
          </p>
          <p className="text-2xl font-bold text-red-900 mt-2">
            {approverStats.rejected}
          </p>
        </div>
      </div>
      <BudgetTable rows={approverRows} emptyMessage="No budgets found." />
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