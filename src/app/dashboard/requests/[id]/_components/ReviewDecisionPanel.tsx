"use client";

import { useState, useTransition } from "react";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, XCircle, RotateCcw, AlertTriangle } from "lucide-react";
import { updateRequestStatus } from "@/actions/request";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
                "flex items-center gap-4 p-4 rounded-xl border transition-all text-left w-full",
                isSelected ? activeClass : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 bg-white"
            )}
        >
            <div className={cn(
                "flex items-center justify-center h-10 w-10 rounded-full shrink-0 transition-colors",
                isSelected ? "bg-white/20" : "bg-gray-100 text-gray-500"
            )}>
                <Icon className={cn("h-5 w-5", isSelected ? "text-current" : "text-gray-600")} />
            </div>
            <div className="flex flex-col">
                <span className={cn("font-bold text-sm", isSelected ? "text-current" : "text-gray-900")}>
                    {label}
                </span>
                <span className={cn("text-xs", isSelected ? "text-current opacity-80" : "text-gray-500")}>
                    {sublabel}
                </span>
            </div>
        </button>
    );
}

export default function ReviewDecisionPanel({ requestId }: { requestId: string; currentStatus?: string }) {
    const [selectedDecision, setSelectedDecision] = useState<DecisionId | null>(null);
    const [comment, setComment] = useState("");
    const [isPending, startTransition] = useTransition();
    const [isVerificationOpen, setIsVerificationOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleSubmit = async () => {
        if (!selectedDecision) return;
        setError(null);

        // Comment is only required for "cancel", optional for "resolve" and "reopen"
        if (selectedDecision === "cancel" && !comment.trim()) {
            setError("Please provide a comment for this decision.");
            return;
        }

        if (selectedDecision === "resolve") {
            setIsVerificationOpen(true);
            return;
        }

        // Process other decisions immediately
        executeDecision(selectedDecision);
    };

    const handleConfirmResolve = () => {
        executeDecision("resolve");
        setIsVerificationOpen(false);
    };

    const executeDecision = (decision: DecisionId) => {
        startTransition(async () => {
            try {
                let status = "";
                switch (decision) {
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

                    if (decision === "resolve") {
                        // Redirect to request tracking for resolved requests
                        router.push("/dashboard/requests");
                    } else {
                        // Just refresh for others
                        router.refresh();
                        // Reset selection
                        setSelectedDecision(null);
                        setComment("");
                    }
                }
            } catch (error) {
                console.error("Failed to update status:", error);
                setError("An error occurred. Please try again.");
            }
        });
    };

    return (
        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm ring-1 ring-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 md:mb-6">Make Decision</h3>

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600 text-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            <div className="flex flex-col gap-3">
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
                    sublabel="Cancel this ticket"
                    isSelected={selectedDecision === "cancel"}
                    onSelect={setSelectedDecision}
                />
            </div>

            {selectedDecision && (
                <>
                    <div className="space-y-3 mt-6">
                        <label className="text-sm font-bold text-gray-900 flex items-center gap-1">
                            Comment
                            {selectedDecision === "cancel" ? (
                                <span className="text-red-500">*</span>
                            ) : (
                                <span className="text-gray-400 font-normal text-xs ml-1">(Optional)</span>
                            )}
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder={
                                selectedDecision === "cancel"
                                    ? "Reason for cancellation..."
                                    : "Add an optional comment..."
                            }
                            className="w-full rounded-lg border-gray-200 text-base md:text-sm p-3 min-h-[100px] resize-none focus:border-gray-400 focus:ring-0 text-gray-900"
                        />
                    </div>

                    <div className="mt-6 flex justify-center">
                        <Button
                            onClick={handleSubmit}
                            disabled={isPending}
                            className="w-full md:w-auto bg-[#358334] hover:bg-[#2d6f2c] text-white font-bold py-6 px-8 rounded-lg"
                        >
                            {isPending ? "Submitting..." : "Submit Decision"}
                        </Button>
                    </div>
                </>
            )}

            <Dialog open={isVerificationOpen} onOpenChange={setIsVerificationOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Resolution</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to mark this ticket as resolved? This action will notify the requester.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2">
                        <p className="text-sm text-gray-500">
                            Once resolved, you will be redirected to the Ticket Tracking page.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsVerificationOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmResolve}
                            disabled={isPending}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {isPending ? "Resolving..." : "Confirm & Resolve"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
