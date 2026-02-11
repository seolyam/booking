"use client";

import { useState, useTransition } from "react";
import { RotateCcw, Pencil } from "lucide-react";
import { updateRequestStatus } from "@/actions/request";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ResubmitPanelProps {
  requestId: string;
  revisionReason?: string | null;
}

export default function ResubmitPanel({ requestId, revisionReason }: ResubmitPanelProps) {
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleResubmit = () => {
    startTransition(async () => {
      try {
        await updateRequestStatus(
          requestId,
          "resubmitted",
          comment.trim() || "Request resubmitted for review",
        );
        router.refresh();
      } catch (error) {
        console.error("Failed to resubmit:", error);
        alert("An error occurred. Please try again.");
      }
    });
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm ring-1 ring-amber-200">
      <div className="flex items-center gap-2 mb-4">
        <RotateCcw className="h-5 w-5 text-amber-600" />
        <h3 className="font-bold text-gray-900">Revision Requested</h3>
      </div>

      {revisionReason && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-100 p-4">
          <p className="text-xs font-medium text-amber-700 mb-1">Admin feedback:</p>
          <p className="text-sm text-amber-900">{revisionReason}</p>
        </div>
      )}

      <p className="text-sm text-gray-500 mb-4">
        The admin has requested changes to this request. You can edit the details and resubmit, or resubmit as-is.
      </p>

      {/* Edit & Resubmit Button */}
      <Link
        href={`/dashboard/requests/${requestId}/edit`}
        className="flex items-center justify-center gap-2 w-full bg-[#358334] text-white font-bold py-3 px-8 rounded-lg hover:bg-[#2d6f2c] transition-colors mb-3 min-h-[44px]"
      >
        <Pencil className="h-4 w-4" /> Edit & Resubmit
      </Link>

      {/* Quick Resubmit (without editing) */}
      <div className="border-t border-gray-100 pt-3 mt-3">
        <p className="text-xs text-gray-400 mb-2">Or resubmit without changes:</p>
        <div className="space-y-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional note about resubmission..."
            className="w-full rounded-lg border-gray-200 text-sm p-3 min-h-[60px] resize-none focus:border-gray-400 focus:ring-0"
          />
        </div>

        <div className="mt-3 flex justify-end">
          <button
            onClick={handleResubmit}
            disabled={isPending}
            className="bg-amber-600 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm w-full md:w-auto min-h-[44px]"
          >
            {isPending ? "Resubmitting..." : "Resubmit as-is"}
          </button>
        </div>
      </div>
    </div>
  );
}
