"use client";

import Link from "next/link";
import {
    FileText,
    CheckCircle,
    XCircle,
    Clock,
    PauseCircle,
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
    stats: AdminDashboardStats;
    rows: RequestTableRow[];
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

export default function AdminDashboard({
    stats,
    rows,
}: AdminDashboardProps) {
    return (
        <div className="space-y-6 md:space-y-10">
            <div className="space-y-4 md:space-y-6">
                <div>
                    <h1 className="text-2xl md:text-4xl font-black text-gray-900">
                        Admin Dashboard
                    </h1>
                    <p className="text-gray-500 mt-1 md:mt-2 font-medium text-sm md:text-base">
                        Manage requests and approvals for your assigned branches
                    </p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-6 md:grid-cols-4">
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
                        icon={<XCircle className="h-6 w-6 text-gray-500" />}
                        value={stats.rejected}
                        label="Rejected"
                        href="/dashboard/requests?status=rejected"
                    />
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900">Recent Requests</h3>
                    <Link href="/dashboard/requests/create">
                        <Button className="bg-[#358334] hover:bg-[#2d6f2c]">
                            New Request
                        </Button>
                    </Link>
                </div>

                <RequestTable rows={rows} emptyMessage="No requests found for your branches." />
            </div>
        </div>
    );
}
