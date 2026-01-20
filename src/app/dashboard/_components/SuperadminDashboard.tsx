"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  CheckCircle,
  Eye,
  Check,
  Users,
  Settings,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type SuperadminDashboardRow = {
  budgetId: string;
  displayId: string;
  projectName: string;
  projectSub: string;
  type: "CapEx" | "OpEx";
  amount: string;
  statusLabel: "Approved" | "Pending" | "Revision" | "Rejected";
  dateLabel: string;
  actionLabel?: "Edit" | "View";
  actionHref?: string;
};

interface SuperadminDashboardProps {
  requesterStats: {
    totalSubmitted: number;
    pendingReview: number;
    approved: number;
    needsRevision: number;
  };
  requesterRows: SuperadminDashboardRow[];
  reviewerStats: {
    totalSubmitted: number;
    pendingReview: number;
    approved: number;
  };
  reviewerRows: SuperadminDashboardRow[];
  approverStats: {
    totalApproved: number;
    awaitingApproval: number;
    approvedThisMonth: number;
    rejected: number;
  };
  approverRows: SuperadminDashboardRow[];
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
      className="rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow group"
    >
      <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-blue-50 transition-transform group-hover:scale-110">
        {icon}
      </div>
      <div className="mt-6 text-4xl font-bold text-gray-900 tracking-tight">
        {value}
      </div>
      <div className="mt-1 text-sm font-medium text-gray-500">{label}</div>
    </Link>
  );
}

function BudgetTable({ rows }: { rows: SuperadminDashboardRow[] }) {
  const typePill = (type: "CapEx" | "OpEx") => {
    const cls =
      type === "CapEx"
        ? "bg-blue-100 text-blue-600"
        : "bg-purple-100 text-purple-600";
    return (
      <span
        className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${cls}`}
      >
        {type}
      </span>
    );
  };

  const statusPill = (s: SuperadminDashboardRow["statusLabel"]) => {
    const cls =
      s === "Approved"
        ? "bg-green-50 text-green-600 ring-1 ring-green-100"
        : s === "Pending"
          ? "bg-orange-50 text-orange-600 ring-1 ring-orange-100"
          : "bg-gray-100 text-gray-500 ring-1 ring-gray-200";

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${cls}`}>
        {s}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">
            <th className="pb-4 pr-4 font-bold">BUDGET ID</th>
            <th className="pb-4 pr-4 font-bold">PROJECT NAME</th>
            <th className="pb-4 pr-4 font-bold">TYPE</th>
            <th className="pb-4 pr-4 font-bold text-center">AMOUNT</th>
            <th className="pb-4 pr-4 font-bold text-center">STATUS</th>
            <th className="pb-4 pr-4 font-bold text-center">DATE</th>
            <th className="pb-4 pr-0 font-bold text-center">ACTION</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="py-20 text-center text-gray-400 font-medium"
              >
                No budgets found.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr
                key={r.budgetId}
                className="group hover:bg-gray-50/50 transition-colors"
              >
                <td className="py-5 pr-4 font-bold text-gray-400 text-xs">
                  {r.displayId}
                </td>
                <td className="py-5 pr-4">
                  <div className="font-bold text-gray-900 leading-tight">
                    {r.projectName}
                  </div>
                  <div className="text-xs font-semibold text-gray-400 mt-0.5">
                    {r.projectSub}
                  </div>
                </td>
                <td className="py-5 pr-4">{typePill(r.type)}</td>
                <td className="py-5 pr-4 text-gray-900 font-bold text-center">
                  {r.amount}
                </td>
                <td className="py-5 pr-4 text-center">
                  {statusPill(r.statusLabel)}
                </td>
                <td className="py-5 pr-4 text-gray-400 font-bold text-xs text-center">
                  {r.dateLabel}
                </td>
                <td className="py-5 pr-0 text-center">
                  <Link
                    href={r.actionHref || `/dashboard/budget/${r.budgetId}`}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
                      r.actionLabel === "Edit"
                        ? "bg-orange-500 text-white hover:bg-orange-600"
                        : "bg-gray-200/80 text-gray-600 hover:bg-gray-300/80"
                    }`}
                  >
                    {r.actionLabel || "View"}{" "}
                    {r.actionLabel === "Edit" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function SuperadminDashboard({
  requesterStats,
  requesterRows,
  reviewerStats,
  reviewerRows,
  approverStats,
  approverRows,
  pendingUserCount,
}: SuperadminDashboardProps) {
  const [activeTab, setActiveTab] = React.useState("overview");

  return (
    <div className="space-y-10">
      {/* Overview Section */}
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900">
            Superadmin Dashboard
          </h1>
          <p className="text-gray-500 mt-2 font-medium">
            Manage all budgets, reviews, approvals, and users
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
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
            icon={<Settings className="h-6 w-6 text-gray-500" />}
            value={approverStats.rejected}
            label="Rejected"
            href="/dashboard"
          />
        </div>
      </div>

      {/* Tabbed Interface for All Roles */}
      <div className="rounded-4xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-gray-100">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-gray-100 bg-gray-50/50 p-0">
            <TabsTrigger
              value="overview"
              className="rounded-none border-b-2 border-transparent px-6 py-4 data-[state=active]:border-[#358334] data-[state=active]:bg-white"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="requester"
              className="rounded-none border-b-2 border-transparent px-6 py-4 data-[state=active]:border-[#358334] data-[state=active]:bg-white"
            >
              My Budgets
            </TabsTrigger>
            <TabsTrigger
              value="reviewer"
              className="rounded-none border-b-2 border-transparent px-6 py-4 data-[state=active]:border-[#358334] data-[state=active]:bg-white"
            >
              Review Queue
            </TabsTrigger>
            <TabsTrigger
              value="approver"
              className="rounded-none border-b-2 border-transparent px-6 py-4 data-[state=active]:border-[#358334] data-[state=active]:bg-white"
            >
              Approvals
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="rounded-none border-b-2 border-transparent px-6 py-4 data-[state=active]:border-[#358334] data-[state=active]:bg-white"
            >
              Users
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="p-8 space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900">
                Recent Activity
              </h3>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-sm font-semibold text-blue-900">
                    🔍 Quick Access
                  </p>
                  <p className="text-sm text-blue-800 mt-1">
                    Switch between Requester, Reviewer, and Approver roles using
                    the tabs above. All actions are logged and attributed to the
                    superadmin account.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Requester Tab */}
          <TabsContent value="requester" className="p-8 space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">
                  Your Budgets
                </h3>
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
              <BudgetTable rows={requesterRows} />
            </div>
          </TabsContent>

          {/* Reviewer Tab */}
          <TabsContent value="reviewer" className="p-8 space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900">
                Budgets for Review
              </h3>
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
              <BudgetTable rows={reviewerRows} />
            </div>
          </TabsContent>

          {/* Approver Tab */}
          <TabsContent value="approver" className="p-8 space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900">
                Budget Approvals
              </h3>
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
              <BudgetTable rows={approverRows} />
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="p-8 space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900">
                User Management
              </h3>
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
