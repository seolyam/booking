"use client";

import { useState } from "react";
import { Edit2 } from "lucide-react";
import ApprovalDecisionPanel from "@/app/dashboard/_components/ApprovalDecisionPanel";

type Props = {
  budgetId: string;
  budgetStatus: string;
  redirectHref?: string | null;
};

export default function ApprovalDecisionButton({
  budgetId,
  budgetStatus,
  redirectHref = "/dashboard/approver/approvals",
}: Props) {
  const [open, setOpen] = useState(false);

  const isReviewable =
    budgetStatus === "verified" || budgetStatus === "verified_by_reviewer";
  const isApproved = budgetStatus === "approved";
  const isRejected = budgetStatus === "rejected";

  const showButton = isReviewable || isApproved || isRejected;
  if (!showButton) return null;

  const buttonText = isReviewable ? "Make Decision" : "Edit Decision";
  const buttonClass = isReviewable
    ? "bg-[#358334] hover:bg-[#2d6f2c]"
    : "bg-white hover:bg-gray-50 text-gray-900 border border-gray-200";
  const iconClass = isReviewable ? "text-white" : "text-gray-700";
  const textClass = isReviewable ? "text-white" : "text-gray-900";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-colors whitespace-nowrap ${buttonClass}`}
      >
        <Edit2 className={`h-4 w-4 ${iconClass}`} />
        <span className={textClass}>{buttonText}</span>
      </button>

      {open && (
        <ApprovalDecisionPanel
          budgetId={budgetId}
          budgetStatus={budgetStatus}
          isModal
          onClose={() => setOpen(false)}
          redirectHref={redirectHref}
        />
      )}
    </>
  );
}
