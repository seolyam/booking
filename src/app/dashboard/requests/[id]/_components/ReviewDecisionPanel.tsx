"use client";

import { useState, useTransition } from "react";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { updateRequestStatus } from "@/actions/request";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type DecisionId = "resolve" | "reopen" | "cancel";

const ACTIVE_CLASSES: Record<DecisionId, string> = {
    resolve: "border-green-500 bg-green-50 text-green-700 ring-1 ring-green-500",
    reopen: "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500",
    cancel: "border-gray-500 bg-gray-50 text-gray-900 ring-1 ring-gray-500",
};

function DecisionButton({
    id,
    icon: Icon,
    label,
    sublabel,
    isSelected,
    onSelect,
}: {
    id: DecisionId;
    icon: LucideIcon;
    label: string;
    sublabel: string;
    isSelected: boolean;
    onSelect: (id: DecisionId) => void;
}) {
    const activeClass = isSelected ? ACTIVE_CLASSES[id] : "";

    return (
        <button
            onClick={() => onSelect(id)}
            className={cn(
                "flex flex-col items-start p-4 rounded-xl border transition-all text-left h-full w-full",
                isSelected ? activeClass : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 bg-white"
            )}
        >
            <div className="flex items-center gap-2 mb-2">
                <Icon className={cn("h-5 w-5", isSelected ? "currentColor" : "text-gray-400")} />
                <span className={cn("font-bold text-sm", isSelected ? "currentColor" : "text-gray-900")}>{label}</span>
            </div>
            <span className={cn("text-xs", isSelected ? "currentColor" : "text-gray-500")}>{sublabel}</span>
        </button>
    );
}

export default function ReviewDecisionPanel({ requestId }: { requestId: string; currentStatus?: string }) {
    const [selectedDecision, setSelectedDecision] = useState<DecisionId | null>(null);
    const [comment, setComment] = useState("");
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleSubmit = async () => {
        if (!selectedDecision) return;
        if (selectedDecision !== "resolve" && !comment.trim()) {
            alert("Please provide a comment for this decision.");
            return;
        }

        startTransition(async () => {
            try {
                let status = "";
                switch (selectedDecision) {
                    case "resolve":
                        status = "resolved";
                        break;
                    case "reopen":
                        status = "open";
                        break;
                    case "cancel":
                        status = "cancelled";
                        break;
                }

                if (status) {
                    await updateRequestStatus(requestId, status, comment);
                    router.refresh();
                }
            } catch (error) {
                console.error("Failed to update status:", error);
                alert("An error occurred. Please try again.");
            }
        });
    };

    return (
        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm ring-1 ring-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 md:mb-6">Make Decision</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
                <DecisionButton
                    id="resolve"
                    icon={CheckCircle2}
                    label="Resolve"
                    sublabel="Mark as resolved"
                    isSelected={selectedDecision === "resolve"}
                    onSelect={setSelectedDecision}
                />
                <DecisionButton
                    id="reopen"
                    icon={RotateCcw}
                    label="Reopen"
                    sublabel="Send back to open"
                    isSelected={selectedDecision === "reopen"}
                    onSelect={setSelectedDecision}
                />
                <DecisionButton
                    id="cancel"
                    icon={XCircle}
                    label="Cancel"
                    sublabel="Cancel this request"
                    isSelected={selectedDecision === "cancel"}
                    onSelect={setSelectedDecision}
                />
            </div>

            {selectedDecision && (
                <>
                    <div className="space-y-3 mt-6">
                        <label className="text-sm font-bold text-gray-900 flex items-center gap-1">
                            Comment <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder={
                                selectedDecision === "resolve"
                                    ? "Reason for resolution..."
                                    : selectedDecision === "reopen"
                                        ? "Reason for reopening..."
                                        : "Reason for cancellation..."
                            }
                            className="w-full rounded-lg border-gray-200 text-base md:text-sm p-3 min-h-[100px] resize-none focus:border-gray-400 focus:ring-0 text-gray-900"
                        />
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={handleSubmit}
                            disabled={isPending}
                            className="bg-[#358334] text-white font-bold py-3 px-8 rounded-lg hover:bg-[#2d6f2c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto min-h-[44px] touch-manipulation"
                        >
                            {isPending ? "Submitting..." : "Submit Decision"}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
