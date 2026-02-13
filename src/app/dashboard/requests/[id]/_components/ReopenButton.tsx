"use client";

import { useTransition, useState } from "react";
import { updateRequestStatus } from "@/actions/request";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function ReopenButton({ requestId }: { requestId: string }) {
    const [isPending, startTransition] = useTransition();
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    const handleReopen = () => {
        startTransition(async () => {
            try {
                await updateRequestStatus(requestId, "pending", "Request reopened by admin");
                setIsOpen(false);
                router.refresh();
            } catch (error) {
                console.error("Failed to reopen request:", error);
                alert("An error occurred while reopening the request.");
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button
                    disabled={isPending}
                    className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs md:text-sm font-bold px-3 md:px-4 py-2 rounded-lg transition-colors min-h-[44px] flex items-center gap-2"
                >
                    <RotateCcw className="h-4 w-4" />
                    {isPending ? "Reopening..." : "Reopen Request"}
                </button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Reopen Request</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to reopen this request? It will be set back to 'Pending' status.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleReopen} disabled={isPending}>
                        {isPending ? "Reopening..." : "Confirm Reopen"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
