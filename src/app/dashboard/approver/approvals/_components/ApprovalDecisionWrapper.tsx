"use client";

import { useState } from "react";
import ApprovalDecisionPanel from "@/app/dashboard/_components/ApprovalDecisionPanel";
import { Edit2 } from "lucide-react";

interface ApprovalDecisionWrapperProps {
  budgetId: string;
  budgetStatus: string;
}

export default function ApprovalDecisionWrapper({
  budgetId,
  budgetStatus,
}: ApprovalDecisionWrapperProps) {
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);

  const isReviewable =
    budgetStatus === "verified" || budgetStatus === "verified_by_reviewer";
  const isApproved = budgetStatus === "approved";
  const isRejected = budgetStatus === "rejected";
  const canEdit = isReviewable || isApproved || isRejected;

  const getButtonText = () => {
    if (isApproved) return "Edit Approval";
    if (isRejected) return "Edit Rejection";
    return "Make Decision";
  };

  const getButtonColor = () => {
    if (isApproved) return "bg-blue-600 hover:bg-blue-700";
    if (isRejected) return "bg-blue-600 hover:bg-blue-700";
    return "bg-[#358334] hover:bg-[#2d6f2c]";
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          {isApproved
            ? "Approval Status"
            : isRejected
              ? "Rejection Status"
              : "Approval Decision"}
        </h2>

        {!canEdit && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-100 rounded-xl">
            <p className="text-sm text-gray-500 font-medium">
              This budget is in {budgetStatus} status and cannot be acted upon.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
            <p className="text-sm text-gray-600 font-medium">Current Status</p>
            <p className="text-lg font-bold text-gray-900 mt-1 capitalize">
              {budgetStatus === "verified_by_reviewer"
                ? "Verified (Pending Approval)"
                : budgetStatus.replace(/_/g, " ")}
            </p>
          </div>

          {canEdit && (
            <button
              onClick={() => setDecisionModalOpen(true)}
              className={`w-full mt-6 px-4 py-3 rounded-xl font-bold text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg ${getButtonColor()}`}
            >
              <Edit2 className="h-4 w-4" />
              {getButtonText()}
            </button>
          )}
        </div>
      </div>

      {/* Decision Modal */}
      {decisionModalOpen && (
        <ApprovalDecisionPanel
          budgetId={budgetId}
          budgetStatus={budgetStatus}
          isModal={true}
          onClose={() => setDecisionModalOpen(false)}
        />
      )}
    </>
  );
}
