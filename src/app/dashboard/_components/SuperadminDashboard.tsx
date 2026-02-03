"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  OverviewSection,
  RequesterTabContent,
  ReviewerTabContent,
  ApproverTabContent,
  UsersTabContent,
} from "./Superadmin/SuperadminTabContents";
import { type SuperadminDashboardRow } from "./BudgetTable";

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
    <div className="space-y-6 md:space-y-10">
      {/* Overview Section - Now Handled by OverviewSection Component */}
      <OverviewSection
        requesterStats={requesterStats}
        reviewerStats={reviewerStats}
        approverStats={approverStats}
        pendingUserCount={pendingUserCount}
      />

      {/* Tabbed Interface for All Roles */}
      <div className="rounded-2xl md:rounded-4xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="sticky top-15 md:top-0 z-10 w-full h-12 md:h-14 justify-start rounded-none border-b border-gray-100 bg-gray-50/50 p-0 overflow-x-auto overflow-y-hidden flex-nowrap">
            <TabsTrigger
              value="overview"
              className="h-full shrink-0 rounded-none border-b-2 border-transparent px-3 md:px-6 py-0 text-xs md:text-sm whitespace-nowrap data-[state=active]:border-[#358334] data-[state=active]:bg-white"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="requester"
              className="h-full shrink-0 rounded-none border-b-2 border-transparent px-3 md:px-6 py-0 text-xs md:text-sm whitespace-nowrap data-[state=active]:border-[#358334] data-[state=active]:bg-white"
            >
              My Budgets
            </TabsTrigger>
            <TabsTrigger
              value="reviewer"
              className="h-full shrink-0 rounded-none border-b-2 border-transparent px-3 md:px-6 py-0 text-xs md:text-sm whitespace-nowrap data-[state=active]:border-[#358334] data-[state=active]:bg-white"
            >
              Review Queue
            </TabsTrigger>
            <TabsTrigger
              value="approver"
              className="h-full shrink-0 rounded-none border-b-2 border-transparent px-3 md:px-6 py-0 text-xs md:text-sm whitespace-nowrap data-[state=active]:border-[#358334] data-[state=active]:bg-white"
            >
              Approvals
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="h-full shrink-0 rounded-none border-b-2 border-transparent px-3 md:px-6 py-0 text-xs md:text-sm whitespace-nowrap data-[state=active]:border-[#358334] data-[state=active]:bg-white"
            >
              Users
            </TabsTrigger>
          </TabsList>

          <div className="overflow-hidden rounded-b-2xl md:rounded-b-4xl">
            {/* Overview Tab */}
            <TabsContent
              value="overview"
              className="p-4 md:p-8 space-y-6 md:space-y-8"
            >
              <OverviewSection
                requesterStats={requesterStats}
                reviewerStats={reviewerStats}
                approverStats={approverStats}
                pendingUserCount={pendingUserCount}
              />
            </TabsContent>

            {/* Requester Tab */}
            <TabsContent
              value="requester"
              className="p-4 md:p-8 space-y-6 md:space-y-8"
            >
              <RequesterTabContent
                requesterStats={requesterStats}
                requesterRows={requesterRows}
              />
            </TabsContent>

            {/* Reviewer Tab */}
            <TabsContent
              value="reviewer"
              className="p-4 md:p-8 space-y-6 md:space-y-8"
            >
              <ReviewerTabContent
                reviewerStats={reviewerStats}
                reviewerRows={reviewerRows}
              />
            </TabsContent>

            {/* Approver Tab */}
            <TabsContent
              value="approver"
              className="p-4 md:p-8 space-y-6 md:space-y-8"
            >
              <ApproverTabContent
                approverStats={approverStats}
                approverRows={approverRows}
              />
            </TabsContent>

            {/* Users Tab */}
            <TabsContent
              value="users"
              className="p-4 md:p-8 space-y-6 md:space-y-8"
            >
              <UsersTabContent pendingUserCount={pendingUserCount} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
