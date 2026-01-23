"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { finalizeBudget } from "@/actions/budget";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, X } from "lucide-react";

interface ApprovalDecisionPanelProps {
  budgetId: string;
  budgetStatus: string;
  isModal?: boolean;
  onClose?: () => void;
  redirectHref?: string | null;
}

type ApprovalAction = "approve" | "reject" | "revoke";

export default function ApprovalDecisionPanel({
  budgetId,
  budgetStatus,
  isModal = false,
  onClose,
  redirectHref = "/dashboard/approver/approvals",
}: ApprovalDecisionPanelProps) {
  const router = useRouter();
  const [selectedAction, setSelectedAction] = useState<ApprovalAction | null>(
    null,
  );
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async () => {
    if (!selectedAction) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const result = await finalizeBudget(budgetId, selectedAction, comment);

      if (result && "message" in result && result.message.includes("Failed")) {
        setErrorMessage(result.message);
      } else {
        router.refresh();
        if (redirectHref) {
          router.push(redirectHref);
        }
        if (onClose) onClose();
      }
    } catch (error) {
      console.error("Approval action failed:", error);
      setErrorMessage("Failed to process approval action. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReviewable =
    budgetStatus === "verified" || budgetStatus === "verified_by_reviewer";
  const isApproved = budgetStatus === "approved";
  const isRejected = budgetStatus === "rejected";
  const canEdit = isReviewable || isApproved || isRejected;

  const title = isApproved
    ? "Edit approval decision"
    : isRejected
      ? "Edit rejection decision"
      : "Approval decision";

  const panelContent = (
    <>
      {!canEdit && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-100 rounded-xl">
          <p className="text-sm text-gray-500 font-medium">
            This budget is in {budgetStatus} status and cannot be acted upon.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {/* Approve Option - shown for pending and rejected */}
        {(isReviewable || isRejected) && (
          <button
            onClick={() => setSelectedAction("approve")}
            disabled={!canEdit}
            className={`w-full p-5 rounded-2xl border-2 transition-all text-left hover:shadow-sm ${
              selectedAction === "approve"
                ? "border-green-500 bg-green-50/30"
                : "border-gray-100 hover:border-green-200 bg-white"
            } ${!canEdit ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="flex items-start gap-3">
              <CheckCircle
                className={`h-5 w-5 mt-0.5 ${selectedAction === "approve" ? "text-green-600" : "text-gray-400"}`}
              />
              <div>
                <div className="font-bold text-gray-900">Approve</div>
                <div className="text-xs text-gray-500 font-medium">
                  {isRejected ? "Approve this request" : "Grant final approval"}
                </div>
              </div>
            </div>
          </button>
        )}

        {/* Reject Option - shown for pending and approved */}
        {(isReviewable || isApproved) && (
          <button
            onClick={() => setSelectedAction("reject")}
            disabled={!canEdit}
            className={`w-full p-5 rounded-2xl border-2 transition-all text-left hover:shadow-sm ${
              selectedAction === "reject"
                ? "border-red-500 bg-red-50/30"
                : "border-gray-100 hover:border-red-200 bg-white"
            } ${!canEdit ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="flex items-start gap-3">
              <XCircle
                className={`h-5 w-5 mt-0.5 ${selectedAction === "reject" ? "text-red-600" : "text-gray-400"}`}
              />
              <div>
                <div className="font-bold text-gray-900">Reject</div>
                <div className="text-xs text-gray-500 font-medium">
                  {isApproved
                    ? "Change decision to rejected"
                    : "Decline this request"}
                </div>
              </div>
            </div>
          </button>
        )}

        {/* Revoke Option - shown for approved and rejected */}
        {(isApproved || isRejected) && (
          <button
            onClick={() => setSelectedAction("revoke")}
            disabled={!canEdit}
            className={`w-full p-5 rounded-2xl border-2 transition-all text-left hover:shadow-sm ${
              selectedAction === "revoke"
                ? "border-orange-500 bg-orange-50/30"
                : "border-gray-100 hover:border-orange-200 bg-white"
            } ${!canEdit ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="flex items-start gap-3">
              <XCircle
                className={`h-5 w-5 mt-0.5 ${selectedAction === "revoke" ? "text-orange-600" : "text-gray-400"}`}
              />
              <div>
                <div className="font-bold text-gray-900">Revoke</div>
                <div className="text-xs text-gray-500 font-medium">
                  Revoke this decision
                </div>
              </div>
            </div>
          </button>
        )}
      </div>

      {/* Comment Section */}
      <div className="mb-6">
        <Label
          htmlFor="comment"
          className="block text-sm font-bold text-gray-700 mb-2"
        >
          Comment <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Additional note"
          className="w-full resize-none border-gray-200 rounded-2xl focus:ring-[#358334]/20 focus:border-[#358334] min-h-28"
        />
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
          <p className="text-xs text-red-600 font-medium">{errorMessage}</p>
        </div>
      )}

    </>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex justify-center items-start bg-black/40 backdrop-blur-sm p-4 pt-10 sm:pt-16">
        <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 flex flex-col">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                {title}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Select an action, then add a comment.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="px-6 py-6 overflow-y-auto">
            {panelContent}
          </div>

          <div className="px-6 py-5 border-t border-gray-100 bg-white">
            <Button
              onClick={handleSubmit}
              disabled={
                !selectedAction || isSubmitting || !comment.trim() || !canEdit
              }
              className="w-full bg-[#358334] hover:bg-[#2d6f2c] text-white font-bold py-3 rounded-2xl shadow-lg shadow-green-900/10 transition-all active:scale-[0.98]"
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
      {panelContent}
    </div>
  );
}
