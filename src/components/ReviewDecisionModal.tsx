"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { verifyBudget, requestRevision, rejectBudget } from "@/actions/budget";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, AlertTriangle, X } from "lucide-react";

interface ReviewDecisionModalProps {
  budgetId: string;
  budgetStatus?: string;
  checklistState?: Record<string, boolean>;
  checklistItems?: Array<{ key: string; label: string }>;
}

type ReviewAction = "verify" | "request_revision" | "reject";

export default function ReviewDecisionModal({
  budgetId,
  budgetStatus = "submitted",
  checklistState = {},
  checklistItems = [],
}: ReviewDecisionModalProps) {
  const router = useRouter();
  const [selectedAction, setSelectedAction] = useState<ReviewAction | null>(
    null,
  );
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleDecisionClick = () => {
    if (!selectedAction) return;

    const isCommentRequired =
      selectedAction === "request_revision" || selectedAction === "reject";

    if (isCommentRequired && !comment.trim()) {
      setErrorMessage("Comment is required for this action");
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirmedSubmit = async () => {
    if (!selectedAction) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("budgetId", budgetId);

      if (
        selectedAction === "request_revision" ||
        selectedAction === "reject"
      ) {
        formData.append("comment", comment);
      }

      // Add checklist state
      formData.append("checklistState", JSON.stringify(checklistState));
      formData.append("checklistItems", JSON.stringify(checklistItems));

      if (selectedAction === "verify") {
        await verifyBudget(formData);
      } else if (selectedAction === "request_revision") {
        await requestRevision(formData);
      } else if (selectedAction === "reject") {
        await rejectBudget(formData);
      }

      // Refresh to show updated status
      router.refresh();
      router.push("/dashboard/reviewer/review");
    } catch (error) {
      console.error("Review action failed:", error);
      setErrorMessage("Failed to process review action. Please try again.");
      setShowConfirmation(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
  };

  const isCommentRequired =
    selectedAction === "request_revision" || selectedAction === "reject";

  // Don't show the component if the budget is not in a reviewable status
  const isReviewable =
    budgetStatus === "submitted" ||
    budgetStatus === "revision_requested" ||
    budgetStatus === "verified_by_reviewer";

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Review Decision
      </h2>

      {!isReviewable && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-sm text-gray-600">
            This budget is no longer in a reviewable status.
          </p>
        </div>
      )}

      <div className="space-y-3 mb-6">
        {/* Verify & Forward Option */}
        <button
          onClick={() => setSelectedAction("verify")}
          disabled={!isReviewable}
          className={`w-full p-4 rounded-lg border-2 transition-colors text-left ${
            selectedAction === "verify"
              ? "border-green-500 bg-green-50"
              : "border-gray-200 hover:border-green-300"
          } ${!isReviewable ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-green-800">Verify & Forward</div>
              <div className="text-sm text-green-600">
                Approve and send to approver
              </div>
            </div>
          </div>
        </button>

        {/* Request Revision Option */}
        <button
          onClick={() => setSelectedAction("request_revision")}
          disabled={!isReviewable}
          className={`w-full p-4 rounded-lg border-2 transition-colors text-left ${
            selectedAction === "request_revision"
              ? "border-orange-500 bg-orange-50"
              : "border-gray-200 hover:border-orange-300"
          } ${!isReviewable ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-orange-800">
                Request Revision
              </div>
              <div className="text-sm text-orange-600">
                Send back for changes
              </div>
            </div>
          </div>
        </button>

        {/* Reject Option */}
        <button
          onClick={() => setSelectedAction("reject")}
          disabled={!isReviewable}
          className={`w-full p-4 rounded-lg border-2 transition-colors text-left ${
            selectedAction === "reject"
              ? "border-red-500 bg-red-50"
              : "border-gray-200 hover:border-red-300"
          } ${!isReviewable ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-red-800">Reject</div>
              <div className="text-sm text-red-600">
                Deny this budget request
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Comment Section */}
      {selectedAction && (
        <div className="mb-6">
          <Label
            htmlFor="comment"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Comment{" "}
            {isCommentRequired && <span className="text-red-500">*</span>}
          </Label>
          <Textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              selectedAction === "verify"
                ? "Additional note (optional)..."
                : "Please provide detailed feedback..."
            }
            className="w-full"
            rows={3}
          />
          {isCommentRequired && comment.trim().length === 0 && (
            <p className="text-red-500 text-sm mt-1">
              Comment is required for this action
            </p>
          )}
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{errorMessage}</p>
        </div>
      )}

      {/* Action Button */}
      <Button
        onClick={handleDecisionClick}
        disabled={
          !selectedAction ||
          isSubmitting ||
          (isCommentRequired && !comment.trim()) ||
          !isReviewable
        }
        className={`w-full ${
          selectedAction === "verify"
            ? "bg-green-600 hover:bg-green-700"
            : selectedAction === "reject"
              ? "bg-red-600 hover:bg-red-700"
              : "bg-orange-600 hover:bg-orange-700"
        }`}
      >
        {isSubmitting
          ? "Processing..."
          : selectedAction === "verify"
            ? "Verify & Forward"
            : selectedAction === "request_revision"
              ? "Request Revision"
              : "Reject"}
      </Button>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                {selectedAction === "verify" && (
                  <CheckCircle className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
                )}
                {selectedAction === "request_revision" && (
                  <AlertTriangle className="h-6 w-6 text-orange-600 shrink-0 mt-0.5" />
                )}
                {selectedAction === "reject" && (
                  <XCircle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedAction === "verify"
                      ? "Confirm Verification"
                      : selectedAction === "request_revision"
                        ? "Confirm Revision Request"
                        : "Confirm Rejection"}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedAction === "verify"
                      ? "This budget will be forwarded to the approver."
                      : selectedAction === "request_revision"
                        ? "This budget will be sent back to the requester for revisions."
                        : "This budget request will be permanently rejected."}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancelConfirmation}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {comment && (
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <p className="text-xs font-medium text-gray-700 mb-1">
                  Comment:
                </p>
                <p className="text-sm text-gray-900">{comment}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleCancelConfirmation}
                disabled={isSubmitting}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmedSubmit}
                disabled={isSubmitting}
                className={`flex-1 ${
                  selectedAction === "verify"
                    ? "bg-green-600 hover:bg-green-700"
                    : selectedAction === "reject"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-orange-600 hover:bg-orange-700"
                }`}
              >
                {isSubmitting ? "Processing..." : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
