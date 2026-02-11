import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { approveUser, rejectUser } from "@/actions/admin";
import { Check, X } from "lucide-react";
import IdDocumentImage from "./IdDocumentImage";

type UserWithDetails = {
    id: string;
    email: string;
    full_name: string | null;
    approval_status: "pending" | "approved" | "rejected";
    department: string | null;
    position: string | null;
    requested_role: "requester" | "admin" | "superadmin";
    created_at: Date;
    id_document_path: string | null;
    rejection_reason: string | null;
};

export default function UserApprovalsList({
    users,
}: {
    users: UserWithDetails[];
}) {
    if (users.length === 0) {
        return (
            <Card className="rounded-[2rem] border-none shadow-sm">
                <CardContent className="p-12 text-center text-gray-500">
                    No pending, user applications found.
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {users.map((u) => (
                <div
                    key={u.id}
                    className="bg-white rounded-2xl md:rounded-[2rem] p-4 md:p-8 shadow-sm border border-gray-100/50"
                >
                    {/* Header: Name & Status */}
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4 md:mb-8">
                        <h3 className="text-lg md:text-xl font-bold text-gray-900 break-words">
                            {u.full_name || u.email}
                        </h3>
                        {u.approval_status === "pending" ? (
                            <span className="bg-[#FFF4DE] text-[#FFB020] text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wide">
                                Pending
                            </span>
                        ) : (
                            <span className="bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wide">
                                Rejected
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 mb-6 md:mb-8">
                        {/* Left Column: Details Grid */}
                        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-y-6 md:gap-y-8 gap-x-8 md:gap-x-12">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Email</p>
                                <p className="font-semibold text-gray-900">{u.email}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Department</p>
                                <p className="font-semibold text-gray-900">
                                    {u.department || "—"}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Position</p>
                                <p className="font-semibold text-gray-900">{u.position || "—"}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Requested Role</p>
                                <p className="font-semibold text-gray-900 capitalize">
                                    {u.requested_role}
                                </p>
                            </div>
                            <div className="col-span-1 sm:col-span-2">
                                <p className="text-sm text-gray-500 mb-1">Registered</p>
                                <p className="font-semibold text-gray-900">
                                    {u.created_at.toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "numeric",
                                        day: "numeric",
                                    })}
                                </p>
                            </div>
                        </div>

                        {/* Right Column: ID Document */}
                        <div className="lg:col-span-5 border-t pt-6 lg:border-t-0 lg:pt-0 lg:border-l lg:pl-8">
                            <p className="text-sm text-gray-500 mb-3">ID Document</p>
                            {u.id_document_path ? (
                                <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm relative h-48 w-full bg-gray-50">
                                    <IdDocumentImage filePath={u.id_document_path} />
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-48 w-full rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
                                    <p className="text-sm text-gray-400 font-medium italic">
                                        No ID document uploaded
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Rejection Reason (if any) */}
                    {u.rejection_reason && (
                        <div className="mb-6 bg-red-50 border border-red-100 rounded-xl p-4">
                            <p className="text-xs font-bold text-red-800 uppercase mb-1">
                                Rejection Reason
                            </p>
                            <p className="text-sm text-red-700">{u.rejection_reason}</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {u.approval_status === "pending" && (
                        <div className="pt-4 md:pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3 md:gap-4">
                            <form
                                action={async () => {
                                    "use server";
                                    await approveUser(u.id);
                                }}
                            >
                                <Button
                                    type="submit"
                                    className="bg-[#00C853] hover:bg-[#00a844] text-white font-bold px-6 py-2.5 rounded-lg shadow-sm transition-all hover:shadow-md flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px] touch-manipulation"
                                >
                                    <Check className="h-4 w-4" />
                                    Approve User
                                </Button>
                            </form>
                            <form
                                action={async () => {
                                    "use server";
                                    await rejectUser(u.id, "Does not meet requirements");
                                }}
                            >
                                <Button
                                    type="submit"
                                    variant="destructive"
                                    className="bg-[#FF3D00] hover:bg-[#d50000] text-white font-bold px-6 py-2.5 rounded-lg shadow-sm transition-all hover:shadow-md flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px] touch-manipulation"
                                >
                                    <X className="h-4 w-4" />
                                    Reject User
                                </Button>
                            </form>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
