"use client";

import { useTransition } from "react";
import { updateRequestStatus } from "@/actions/request";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";

export default function ReopenButton({ requestId }: { requestId: string }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleReopen = () => {
        if (!confirm("Are you sure you want to reopen this request? It will be set to 'Pending Review'.")) {
            return;
        }

        startTransition(async () => {
            try {
                await updateRequestStatus(requestId, "pending_review", "Request reopened by admin");
                router.refresh();
            } catch (error) {
                console.error("Failed to reopen request:", error);
                alert("An error occurred while reopening the request.");
            }
        });
    };

    return (
        <button
            onClick={handleReopen}
            disabled={isPending}
            className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs md:text-sm font-bold px-3 md:px-4 py-2 rounded-lg transition-colors min-h-[44px] flex items-center gap-2"
        >
            <RotateCcw className="h-4 w-4" />
            {isPending ? "Reopening..." : "Reopen Request"}
        </button>
    );
}
