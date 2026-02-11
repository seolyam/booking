"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReactNode } from "react";

interface ApprovalsTabsProps {
    userApprovals: ReactNode;
    requestApprovals: ReactNode;
    showUserApprovals?: boolean;
}

export default function ApprovalsTabs({
    userApprovals,
    requestApprovals,
    showUserApprovals = true,
}: ApprovalsTabsProps) {
    if (!showUserApprovals) {
        return <>{requestApprovals}</>;
    }

    return (
        <Tabs defaultValue="requests" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8 bg-gray-100 p-1 rounded-xl">
                <TabsTrigger
                    value="requests"
                    className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm font-medium transition-all"
                >
                    Request Approvals
                </TabsTrigger>
                <TabsTrigger
                    value="users"
                    className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm font-medium transition-all"
                >
                    User Approvals
                </TabsTrigger>
            </TabsList>
            <TabsContent value="requests">{requestApprovals}</TabsContent>
            <TabsContent value="users">{userApprovals}</TabsContent>
        </Tabs>
    );
}
