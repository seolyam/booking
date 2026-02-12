"use client";

import { useState, useTransition } from "react";
import { RotateCcw, Pencil } from "lucide-react";
import { updateRequestStatus } from "@/actions/request";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
        The admin has requested changes to this request. Review the feedback above, then resubmit when ready.
      </p>

      <div className="space-y-3">
        <label className="text-sm font-bold text-gray-900">
          Resubmission note <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Describe what changes you've made..."
          className="w-full rounded-lg border-gray-200 text-sm p-3 min-h-[80px] resize-none focus:border-gray-400 focus:ring-0 text-gray-900"
        />
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <Link
          href={`/dashboard/requests/${requestId}/edit`}
          className="flex-1 bg-white border border-gray-300 text-gray-700 font-bold py-3 px-4 rounded-lg hover:bg-gray-50 text-center transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          <Pencil className="h-4 w-4" /> Edit Request Details
        </Link>
        <button
          onClick={handleResubmit}
          disabled={isPending}
          className="flex-1 bg-amber-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {isPending ? "Resubmitting..." : "Resubmit Request"}
        </button>
      </div>
    </div>
  );
}
