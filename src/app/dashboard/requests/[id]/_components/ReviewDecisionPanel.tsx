"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, AlertCircle, XCircle, Archive } from "lucide-react";
import { updateRequestStatus } from "@/actions/request";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface ReviewDecisionPanelProps {
    requestId: string;
    currentStatus: string;
}

export default function ReviewDecisionPanel({ requestId, currentStatus }: ReviewDecisionPanelProps) {
    const [selectedDecision, setSelectedDecision] = useState<"approve" | "revision" | "reject" | "close" | "hold" | null>(null);
    const [comment, setComment] = useState("");
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleSubmit = async () => {
        if (!selectedDecision) return;
        if (selectedDecision !== "approve" && !comment.trim()) {
            alert("Please provide a comment for this decision.");
            return;
        }

        startTransition(async () => {
            try {
                let status = "";
                switch (selectedDecision) {
                    case "approve":
                        // resolved -> approved status (displayed as "Resolved")
                        status = "approved";
                        break;
                    case "revision":
                        status = "on_hold"; // Both revision and hold map to on_hold for now
                        break;
                    case "hold":
                        status = "on_hold";
                        break;
                    case "reject":
                        status = "rejected";
                        break;
                    case "close":
                        status = "closed";
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

    const DecisionButton = ({
        id,
        icon: Icon,
        label,
        sublabel,
    }: {
        id: "approve" | "revision" | "reject" | "close" | "hold";
        icon: any;
        label: string;
        sublabel: string;
    }) => {
        const isSelected = selectedDecision === id;
        let activeClass = "";

        if (isSelected) {
            if (id === "approve") activeClass = "border-green-500 bg-green-50 text-green-700 ring-1 ring-green-500";
            else if (id === "reject") activeClass = "border-red-500 bg-red-50 text-red-700 ring-1 ring-red-500";
            else if (id === "close") activeClass = "border-gray-500 bg-gray-50 text-gray-900 ring-1 ring-gray-500";
            else activeClass = "border-orange-500 bg-orange-50 text-orange-700 ring-1 ring-orange-500";
        }

        return (
            <button
                onClick={() => setSelectedDecision(id)}
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
    };

    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm ring-1 ring-gray-100">
            <h3 className="font-bold text-gray-900 mb-6">Make Decision</h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <DecisionButton
                    id="approve"
                    icon={CheckCircle2}
                    label="Resolved"
                    sublabel="Finalize request"
                />
                <DecisionButton
                    id="revision"
                    icon={AlertCircle}
                    label="Request Revision"
                    sublabel="Send back to user"
                />
                <DecisionButton
                    id="hold"
                    icon={Archive}
                    label="On Hold"
                    sublabel="Pause processing"
                />
                <DecisionButton
                    id="reject"
                    icon={XCircle}
                    label="Rejected"
                    sublabel="Decline request"
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
                            placeholder={selectedDecision === "approve" ? "Reason for resolution..." : "Additional note"}
                            className="w-full rounded-lg border-gray-200 text-sm p-3 min-h-[100px] resize-none focus:border-gray-400 focus:ring-0"
                        />
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={handleSubmit}
                            disabled={isPending}
                            className="bg-[#358334] text-white font-bold py-3 px-8 rounded-lg hover:bg-[#2d6f2c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
                        >
                            {isPending ? "Submitting..." : "Submit Decision"}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
