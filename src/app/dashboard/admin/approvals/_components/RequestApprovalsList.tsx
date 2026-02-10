import { Button } from "@/components/ui/button";
import { Check, X, FileText, Calendar } from "lucide-react";
import { updateRequestStatus } from "@/actions/request";
import Link from "next/link";
import { CATEGORY_MAP } from "@/db/schema";

type RequestWithDetails = {
    id: string;
    title: string;
    category: string;
    priority: string;
    status: string;
    created_at: Date;
    requester: {
        full_name: string | null;
        email: string;
        department: string | null;
    } | null;
    branch: {
        name: string;
    } | null;
    form_data: Record<string, unknown>;
};

export default function RequestApprovalsList({
    requests,
}: {
    requests: RequestWithDetails[];
}) {
    if (requests.length === 0) {
        return (
            <div className="bg-white rounded-[2rem] p-12 text-center text-gray-500 shadow-sm border border-gray-100/50">
                No pending request approvals found.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {requests.map((r) => (
                <div
                    key={r.id}
                    className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100/50 transition-all hover:shadow-md"
                >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide">
                                    {CATEGORY_MAP[r.category]?.code || r.category}
                                </span>
                                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                                    {r.id.slice(0, 8)}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                {r.title}
                            </h3>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wide">
                                Reviewed
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        {/* Details */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                                <div>
                                    <p className="text-gray-500 text-xs font-medium mb-1">Requester</p>
                                    <p className="font-semibold text-gray-900">
                                        {r.requester?.full_name || r.requester?.email || "Unknown"}
                                    </p>
                                    {r.requester?.department && (
                                        <p className="text-gray-500 text-xs">{r.requester.department}</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs font-medium mb-1">Branch</p>
                                    <p className="font-medium text-gray-900">{r.branch?.name || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs font-medium mb-1">Date Submitted</p>
                                    <div className="flex items-center gap-1.5 font-medium text-gray-900">
                                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                        {r.created_at.toLocaleDateString()}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs font-medium mb-1">Priority</p>
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold capitalize ${r.priority === 'urgent' ? 'bg-red-50 text-red-700' :
                                            r.priority === 'high' ? 'bg-orange-50 text-orange-700' :
                                                r.priority === 'medium' ? 'bg-blue-50 text-blue-700' :
                                                    'bg-gray-100 text-gray-900'
                                        }`}>
                                        {r.priority}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions / Link */}
                        <div className="flex flex-col justify-center items-start lg:items-end gap-3">
                            <Link
                                href={`/dashboard/requests/${r.id}`}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                                View Full Details <FileText className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-6 border-t border-gray-100 flex flex-wrap gap-4">
                        <form
                            action={async () => {
                                "use server";
                                await updateRequestStatus(r.id, "approved", "Approved by admin");
                            }}
                        >
                            <Button
                                type="submit"
                                className="bg-[#00C853] hover:bg-[#00a844] text-white font-bold px-6 py-2.5 rounded-lg shadow-sm transition-all hover:shadow-md flex items-center gap-2"
                            >
                                <Check className="h-4 w-4" />
                                Approve Request
                            </Button>
                        </form>

                        <form
                            action={async () => {
                                "use server";
                                // For rejection, we might want a reason modal, but simple reject works for now or redirect
                                await updateRequestStatus(r.id, "rejected", "Rejected by admin");
                            }}
                        >
                            <Button
                                type="submit"
                                variant="destructive"
                                className="bg-[#FF3D00] hover:bg-[#d50000] text-white font-bold px-6 py-2.5 rounded-lg shadow-sm transition-all hover:shadow-md flex items-center gap-2"
                            >
                                <X className="h-4 w-4" />
                                Reject Request
                            </Button>
                        </form>
                    </div>
                </div>
            ))}
        </div>
    );
}
