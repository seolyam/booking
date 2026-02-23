"use client";

import { useState, useTransition } from "react";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { updateRequestStatus, saveAttachments } from "@/actions/request";
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
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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

function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    isProcessing,
    confirmLabel = "Confirm",
    confirmVariant = "default",
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    isProcessing: boolean;
    confirmLabel?: string;
    confirmVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{message}</DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                        Cancel
                    </Button>
                    <Button variant={confirmVariant} onClick={onConfirm} disabled={isProcessing}>
                        {isProcessing ? "Processing..." : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function SuccessModal({
    isOpen,
    onClose,
    title,
    message,
    buttonText = "Close",
}: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    buttonText?: string;
}) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                    <DialogTitle className="text-center">{title}</DialogTitle>
                    <DialogDescription className="text-center">{message}</DialogDescription>
                </DialogHeader>
                <DialogFooter className="sm:justify-center">
                    <Button onClick={onClose} className="w-full sm:w-auto min-w-[120px]">
                        {buttonText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ErrorModal({
    isOpen,
    onClose,
    title,
    message,
    buttonText = "Understood",
}: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    buttonText?: string;
}) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
                        <XCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <DialogTitle className="text-center">{title}</DialogTitle>
                    <DialogDescription className="text-center">{message}</DialogDescription>
                </DialogHeader>
                <DialogFooter className="sm:justify-center">
                    <Button onClick={onClose} variant="destructive" className="w-full sm:w-auto min-w-[120px]">
                        {buttonText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function ReviewDecisionPanel({ requestId, currentStatus }: { requestId: string; currentStatus?: string }) {
    const [selectedDecision, setSelectedDecision] = useState<DecisionId | null>(null);
    const [comment, setComment] = useState("");
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const [attachments, setAttachments] = useState<File[]>([]);
    const DECISION_OPTIONS: Record<string, DecisionId[]> = {
        pending: ["resolve", "cancel"],
        cancelled: ["resolve", "reopen"],
        open: ["resolve", "cancel"],
        resolved: ["reopen"], // Allow reopening resolved tickets
    };
    const allowedDecisions = DECISION_OPTIONS[currentStatus ?? "open"];

    // Modal States
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successData, setSuccessData] = useState({ title: "", message: "" });

    const handleInitialSubmit = () => {
        if (!selectedDecision) return;
        if (selectedDecision === "cancel" && !comment.trim()) {
            setShowErrorModal(true);
            return;
        }
        setShowConfirmModal(true);
    };

    const handleConfirm = async () => {
        if (!selectedDecision) return;

        startTransition(async () => {
            try {
                let status = "";
                let successTitle = "";
                let successMessage = "";

                // Attachment upload logic (only for resolve/cancel)
                const attachmentMeta: { fileName: string; filePath: string; fileSize: number; fileType: string }[] = [];
                if ((selectedDecision === "resolve" || selectedDecision === "cancel") && attachments.length > 0) {
                    const supabase = createSupabaseBrowserClient();
                    const bucket = "attachments";
                    // Note: Could validate max file size/type here
                    for (const file of attachments) {
                        const path = `${requestId}/attachments/${Date.now()}-${file.name}`;
                        const { error } = await supabase.storage.from(bucket).upload(path, file);
                        if (!error) {
                            attachmentMeta.push({
                                fileName: file.name,
                                filePath: path,
                                fileSize: file.size,
                                fileType: file.type,
                            });
                        } else {
                            throw new Error(`Failed to upload ${file.name}: ${error.message}`);
                        }
                    }
                }
                switch (selectedDecision) {
                    case "resolve":
                        status = "resolved";
                        successTitle = "Ticket Resolved";
                        successMessage = "The ticket has been successfully resolved.";
                        break;
                    case "reopen":
                        status = "open";
                        successTitle = "Ticket Reopened";
                        successMessage = "The ticket has been reopened and status updated.";
                        break;
                    case "cancel":
                        status = "cancelled";
                        successTitle = "Ticket Cancelled";
                        successMessage = "The ticket has been cancelled.";
                        break;
                }

                if (attachmentMeta.length > 0) {
                    await saveAttachments(requestId, attachmentMeta);
                }
                if (status) {
                    await updateRequestStatus(requestId, status, comment);

                    setSuccessData({ title: successTitle, message: successMessage });
                    setShowConfirmModal(false);
                    setShowSuccessModal(true);
                }
            } catch (error) {
                console.error("Failed to update status:", error);
                alert("An error occurred. Please try again.");
                setShowConfirmModal(false);
            }
        });
    };

    const handleSuccessClose = () => {
        setShowSuccessModal(false);
        if (selectedDecision === "cancel" || selectedDecision === "reopen" || selectedDecision === "resolve") {
            router.push(`/dashboard/requests/${requestId}`);
        } else {
            router.refresh();
        }
    };

    const getConfirmConfig = () => {
        switch (selectedDecision) {
            case "resolve":
                return {
                    title: "Resolve Ticket?",
                    message: "Are you sure you want to resolve this ticket? This action will close the ticket.",
                    label: "Resolve Ticket",
                    variant: "default" as const, // Changed from success to default (green usually default primary)
                };
            case "reopen":
                return {
                    title: "Reopen Ticket?",
                    message: "Are you sure you want to reopen this ticket? It will be moved back to 'Open' status.",
                    label: "Reopen Ticket",
                    variant: "default" as const,
                };
            case "cancel":
                return {
                    title: "Cancel Ticket?",
                    message: "Are you sure you want to cancel this ticket? This action cannot be undone.",
                    label: "Cancel Ticket",
                    variant: "destructive" as const,
                };
            default:
                return { title: "", message: "", label: "Confirm", variant: "default" as const };
        }
    };

    const confirmConfig = getConfirmConfig();

    return (
        <>
            <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm ring-1 ring-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 md:mb-6">Decision on Ticket</h3>

                <div className="flex flex-col gap-3">
                    {allowedDecisions.includes("resolve") && (
                        <DecisionButton
                            id="resolve"
                            icon={CheckCircle2}
                            label="Resolve"
                            sublabel="Mark as resolved"
                            isSelected={selectedDecision === "resolve"}
                            onSelect={setSelectedDecision}
                        />
                    )}
                    {allowedDecisions.includes("reopen") && (
                        <DecisionButton
                            id="reopen"
                            icon={RotateCcw}
                            label="Reopen"
                            sublabel="Send back to open"
                            isSelected={selectedDecision === "reopen"}
                            onSelect={setSelectedDecision}
                        />
                    )}
                    {allowedDecisions.includes("cancel") && (
                        <DecisionButton
                            id="cancel"
                            icon={XCircle}
                            label="Cancel"
                            sublabel="Cancel this ticket"
                            isSelected={selectedDecision === "cancel"}
                            onSelect={setSelectedDecision}
                        />
                    )}
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
                        {/* File attachment input */}
                        <div className="mt-3">
                            <label className="text-sm font-bold text-gray-900 block mb-2">Attachment (optional)</label>
                            <Input
                                type="file"
                                multiple
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    if (e.target.files) {
                                        setAttachments(Array.from(e.target.files));
                                    } else {
                                        setAttachments([]);
                                    }
                                }}
                            />
                        </div>
                        <div className="mt-6 flex justify-center">
                            <button
                                onClick={handleInitialSubmit}
                                disabled={isPending}
                                className={cn(
                                    "font-bold py-3 px-8 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto min-h-[44px] touch-manipulation text-white",
                                    selectedDecision === "cancel" ? "bg-red-600 hover:bg-red-700" : "bg-[#358334] hover:bg-[#2d6f2c]"
                                )}
                            >
                                Submit Decision
                            </button>
                        </div>
                    </>
                )}
            </div>

            <ConfirmationModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleConfirm}
                isProcessing={isPending}
                title={confirmConfig.title}
                message={confirmConfig.message}
                confirmLabel={confirmConfig.label}
                confirmVariant={confirmConfig.variant}
            />

            <SuccessModal
                isOpen={showSuccessModal}
                onClose={handleSuccessClose}
                title={successData.title}
                message={successData.message}
                buttonText="Okay"
            />

            <ErrorModal
                isOpen={showErrorModal}
                onClose={() => setShowErrorModal(false)}
                title="Comment Required"
                message="Please provide a reason or comment before cancelling this ticket."
            />
        </>
    );
}
