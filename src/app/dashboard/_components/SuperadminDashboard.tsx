"use client";

import * as React from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  OverviewSection,
  AllRequestsTabContent,
  UsersTabContent,
} from "./Superadmin/SuperadminTabContents";
import type { RequestTableRow } from "./RequestTable";
import { RequestsFilter } from "@/components/dashboard/RequestsFilter";

interface SuperadminDashboardProps {
  stats: {
    totalRequests: number;
    open: number;
    pending: number;
    resolved: number;
    cancelled: number;
  };
  rows: RequestTableRow[];
  pendingUserCount: number;
}

export default function SuperadminDashboard({
  stats,
  rows,
  pendingUserCount,
}: SuperadminDashboardProps) {
  const [activeTab, setActiveTab] = React.useState("requests");

  return (
    <div className="space-y-6 md:space-y-10">
      <OverviewSection stats={stats} pendingUserCount={pendingUserCount} />

      {/* Tabbed Interface */}
      <div className="rounded-2xl md:rounded-4xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="sticky top-15 md:top-0 z-10 w-full h-12 md:h-14 justify-start rounded-none border-b border-gray-100 bg-gray-50/50 p-0 overflow-x-auto overflow-y-hidden flex-nowrap">
            <TabsTrigger
              value="requests"
              className="h-full shrink-0 rounded-none border-b-2 border-transparent px-3 md:px-6 py-0 text-xs md:text-sm whitespace-nowrap data-[state=active]:border-[#358334] data-[state=active]:bg-white"
            >
              All Tickets
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="h-full shrink-0 rounded-none border-b-2 border-transparent px-3 md:px-6 py-0 text-xs md:text-sm whitespace-nowrap data-[state=active]:border-[#358334] data-[state=active]:bg-white"
            >
              Users
            </TabsTrigger>
          </TabsList>

          <div className="overflow-hidden rounded-b-2xl md:rounded-b-4xl">
            {/* All Requests Tab */}
            <TabsContent
              value="requests"
              className="p-4 md:p-8 space-y-6 md:space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-900">Recent Tickets</h2>
                  <RequestsFilter />
                </div>
                <Link href="/dashboard/admin/requests" className="text-sm font-bold text-gray-500 hover:text-gray-900 underline underline-offset-4 hidden md:block">
                  View all
                </Link>
              </div>
              <AllRequestsTabContent
                rows={rows}
              />
              <div className="mt-6 flex justify-end md:hidden">
                <Link href="/dashboard/admin/requests" className="text-sm font-bold text-gray-500 hover:text-gray-900 underline underline-offset-4">
                  View all
                </Link>
              </div>
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
