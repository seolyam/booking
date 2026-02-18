"use client";

import { RequestsFilter } from "@/components/dashboard/RequestsFilter";
import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import RequestTable, { type RequestTableRow } from "./RequestTable";
import { StatCard } from "@/components/dashboard/StatCard";

interface RequesterDashboardProps {
  stats: {
    total: number;
    open: number;
    pending: number;
    resolved: number;
  };
  rows: RequestTableRow[];
}

export default function RequesterDashboard({
  stats,
  rows,
}: RequesterDashboardProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">
            Dashboard
          </h1>
          <p className="text-gray-500 font-medium">
            Overview of your booking requests
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/requests/create"
            className="inline-flex items-center justify-center rounded-xl bg-[#358334] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#2F5E3D] hover:shadow-lg shadow-md hover:-translate-y-0.5"
          >
            + Create Request
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<FileText className="h-6 w-6" />}
          value={stats.total}
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
          icon={<AlertCircle className="h-6 w-6" />}
          value={stats.pending}
          label="Pending"
          href="/dashboard/requests?status=pending"
          colorClass="bg-[#FFF4DE] text-[#FFB020]"
        />
        <StatCard
          icon={<CheckCircle className="h-6 w-6" />}
          value={stats.resolved}
          label="Resolved"
          href="/dashboard/requests?status=resolved"
          colorClass="bg-green-50 text-green-600"
        />
      </div>

      {/* Booking Requests Table Card */}
      <div className="bg-white rounded-2xl md:rounded-[2rem] p-4 md:p-8 shadow-sm border border-gray-100/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-gray-900">Recent Tickets</h3>
            <RequestsFilter />
          </div>
          <Link href="/dashboard/requests" className="text-sm font-bold text-gray-500 hover:text-gray-900 underline underline-offset-4 hidden md:block">
            View all
          </Link>
        </div>

        <RequestTable rows={rows} emptyMessage="No requests found." showRequester={false} />

        <div className="mt-6 flex justify-end md:hidden">
          <Link href="/dashboard/requests" className="text-sm font-bold text-gray-500 hover:text-gray-900 underline underline-offset-4">
            View all
          </Link>
        </div>
      </div>
    </div>
  );
}
