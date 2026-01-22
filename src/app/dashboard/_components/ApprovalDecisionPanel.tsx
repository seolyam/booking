"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { finalizeBudget } from "@/actions/budget";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle } from "lucide-react";

interface ApprovalDecisionPanelProps {
  budgetId: string;
  budgetStatus: string;
}

type ApprovalAction = "approve" | "reject";

export default function ApprovalDecisionPanel({
  budgetId,
  budgetStatus,
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
        router.push("/dashboard/approver/approvals");
        router.refresh();
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

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        Approval decision
      </h2>

      {!isReviewable && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-100 rounded-xl">
          <p className="text-sm text-gray-500 font-medium">
            This budget is in {budgetStatus} status and cannot be acted upon.
          </p>
        </div>
      )}

      <div className="space-y-4 mb-8">
        {/* Approve Option */}
        <button
          onClick={() => setSelectedAction("approve")}
          disabled={!isReviewable}
          className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
            selectedAction === "approve"
              ? "border-green-500 bg-green-50/30"
              : "border-gray-100 hover:border-green-200"
          } ${!isReviewable ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className="flex items-start gap-3">
            <CheckCircle
              className={`h-5 w-5 mt-0.5 ${selectedAction === "approve" ? "text-green-600" : "text-gray-400"}`}
            />
            <div>
              <div className="font-bold text-gray-900">Approve</div>
              <div className="text-xs text-gray-500 font-medium">
                Grant final approval
              </div>
            </div>
          </div>
        </button>

        {/* Reject Option */}
        <button
          onClick={() => setSelectedAction("reject")}
          disabled={!isReviewable}
          className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
            selectedAction === "reject"
              ? "border-red-500 bg-red-50/30"
              : "border-gray-100 hover:border-red-200"
          } ${!isReviewable ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className="flex items-start gap-3">
            <XCircle
              className={`h-5 w-5 mt-0.5 ${selectedAction === "reject" ? "text-red-600" : "text-gray-400"}`}
            />
            <div>
              <div className="font-bold text-gray-900">Reject</div>
              <div className="text-xs text-gray-500 font-medium">
                Decline this request
              </div>
            </div>
          </div>
        </button>
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
          className="w-full resize-none border-gray-200 rounded-xl focus:ring-[#358334]/20 focus:border-[#358334] min-h-30"
        />
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
          <p className="text-xs text-red-600 font-medium">{errorMessage}</p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={
          !selectedAction || isSubmitting || !comment.trim() || !isReviewable
        }
        className="w-full bg-[#358334] hover:bg-[#2d6f2c] text-white font-bold py-3 rounded-xl shadow-lg shadow-green-900/10 transition-all active:scale-[0.98]"
      >
        {isSubmitting ? "Submitting..." : "Submit"}
      </Button>
    </div>
  );
}
