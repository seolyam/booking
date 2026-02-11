"use client";

import Link from "next/link";
import {
    FileText,
    CheckCircle,
    XCircle,
    Clock,
    PauseCircle,
    AlertCircle,
} from "lucide-react";
import RequestTable, { type RequestTableRow } from "./RequestTable";
import { Button } from "@/components/ui/button";

interface AdminDashboardStats {
    totalRequests: number;
    pendingReview: number;
    approved: number;
    rejected: number;
    onHold: number;
    closed: number;
}

interface AdminDashboardProps {
    userName: string;
    stats: AdminDashboardStats;
    rows: RequestTableRow[];
}

function StatCard({
    icon,
    value,
    label,
    href,
    colorClass,
}: {
    icon: React.ReactNode;
    value: number;
    label: string;
    href: string;
    colorClass: string;
}) {
    return (
        <Link
            href={href}
            className="flex flex-col justify-between rounded-2xl md:rounded-[2rem] bg-white shadow-sm p-4 md:p-6 hover:shadow-md transition-shadow group h-full border border-gray-100/50"
        >
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${colorClass} mb-4 transition-transform group-hover:scale-105`}>
                {icon}
            </div>
            <div>
                <div className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight mb-2">
                    {value}
                </div>
                <div className="text-sm font-semibold text-gray-500">
                    {label}
                </div>
            </div>
        </Link>
    );
}

export default function AdminDashboard({
    userName,
    stats,
    rows,
}: AdminDashboardProps) {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">
                    Welcome back, {userName}
                </h1>
                <p className="text-gray-500 font-medium">
                    Admin Dashboard
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    icon={<FileText className="h-6 w-6" />}
                    value={stats.totalRequests}
                    label="Total submitted"
                    href="/dashboard/requests"
                    colorClass="bg-blue-50 text-blue-600"
                />
                <StatCard
                    icon={<Clock className="h-6 w-6" />}
                    value={stats.pendingReview}
                    label="Pending review"
                    href="/dashboard/requests?status=pending"
                    colorClass="bg-[#FFF4DE] text-[#FFB020]"
                />
                <StatCard
                    icon={<CheckCircle className="h-6 w-6" />}
                    value={stats.approved}
                    label="Approved"
                    href="/dashboard/requests?status=approved"
                    colorClass="bg-green-50 text-green-600"
                />
                <StatCard
                    icon={<AlertCircle className="h-6 w-6" />}
                    value={stats.onHold}
                    label="On Hold"
                    href="/dashboard/requests?status=on_hold"
                    colorClass="bg-orange-50 text-orange-600"
                />
            </div>

            {/* Booking Requests Table Card */}
            <div className="bg-white rounded-2xl md:rounded-[2rem] p-4 md:p-8 shadow-sm border border-gray-100/50">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Booking Requests</h3>
                    {/* Create Request button removed as per admin restrictions */}
                </div>

                <RequestTable rows={rows} emptyMessage="No requests found." showRequester={false} />

                <div className="mt-6 flex justify-end">
                    <Link href="/dashboard/requests" className="text-sm font-bold text-gray-500 hover:text-gray-900 underline underline-offset-4">
                        View all
                    </Link>
                </div>
            </div>
        </div>
    );
}
