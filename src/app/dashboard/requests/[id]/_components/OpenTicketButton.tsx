"use client";

import { useTransition, useState } from "react";
import { reissueTicket } from "@/actions/request";
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

export default function OpenTicketButton({ requestId }: { requestId: string }) {
    const [isPending, startTransition] = useTransition();
    const [isOpen, setIsOpen] = useState(false);

    const handleReissue = () => {
        startTransition(async () => {
            try {
                await reissueTicket(requestId);
                setIsOpen(false);
            } catch (error) {
                console.error("Failed to open ticket:", error);
                alert("An error occurred while opening the ticket.");
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button
                    disabled={isPending}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs md:text-sm font-bold px-3 md:px-4 py-2 rounded-lg transition-colors min-h-[44px] flex items-center"
                >
                    {isPending ? "Opening..." : "Open Ticket"}
                </button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Open Ticket</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to open this ticket? It will remove your assignment and re-issue the ticket to the dashboard where another admin can pick it up.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleReissue} disabled={isPending}>
                        {isPending ? "Opening..." : "Confirm Open"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
