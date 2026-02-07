"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, AlertCircle, Archive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { updateRequestStatus } from "@/actions/request";
import SuccessModal from "@/components/SuccessModal";

interface ApprovalActionsProps {
  requestId: string;
}

export default function ApprovalActions({ requestId }: ApprovalActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: "", message: "" });

  const handleAction = async (actionType: string) => {
    if (actionType === "reject" && !comment.trim()) {
      alert("Rejection reason is required");
      return;
    }

    startTransition(async () => {
      let result;
      try {
        switch (actionType) {
          case "approve":
            result = await updateRequestStatus(requestId, "approved", comment);
            break;
          case "reject":
            result = await updateRequestStatus(requestId, "rejected", comment);
            break;
          case "hold":
            result = await updateRequestStatus(requestId, "on_hold", comment);
            break;
          case "close":
            result = await updateRequestStatus(requestId, "closed", comment);
            break;
        }

        if (result?.success) {
          setOpenDialog(null);
          setComment("");
          setSuccessMessage({
            title: `Request ${actionType.charAt(0).toUpperCase() + actionType.slice(1)}!`,
            message: `The request has been successfully ${actionType}.`,
          });
          setShowSuccessModal(true);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          alert((result as any)?.message || "Action failed");
        }
      } catch {
        alert("An unexpected error occurred");
      }
    });
  };

  const openActionDialog = (type: string) => {
    setComment("");
    setOpenDialog(type);
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    router.refresh();
  };

  return (
    <>
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleModalClose}
        title={successMessage.title}
        message={successMessage.message}
      />
      <div className="flex flex-wrap gap-3">
      {/* Approve Button */}
      <Dialog open={openDialog === 'approve'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogTrigger asChild>
          <Button
            onClick={() => openActionDialog('approve')}
            className="bg-green-600 hover:bg-green-700 text-white gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Approve
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this request? You can add an optional comment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="approve-comment">Comment (Optional)</Label>
            <Textarea
              id="approve-comment"
              placeholder="Add approval notes..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(null)}>Cancel</Button>
            <Button
              onClick={() => handleAction('approve')}
              className="bg-green-600 hover:bg-green-700"
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Button */}
      <Dialog open={openDialog === 'reject'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogTrigger asChild>
          <Button
            variant="destructive"
            onClick={() => openActionDialog('reject')}
            className="gap-2"
          >
            <XCircle className="h-4 w-4" />
            Reject
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this request. This will be visible to the requester.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="reject-reason" className="text-red-600 font-medium">Reason (Required)</Label>
            <Textarea
              id="reject-reason"
              placeholder="Why is this request being rejected?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="border-red-200 focus:ring-red-500"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => handleAction('reject')}
              disabled={isPending || !comment.trim()}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hold Button */}
      <Dialog open={openDialog === 'hold'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            onClick={() => openActionDialog('hold')}
            className="border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800 gap-2"
          >
            <AlertCircle className="h-4 w-4" />
            Hold
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Put Request On Hold</DialogTitle>
            <DialogDescription>
              Temporarily pause this request. Provide a reason so the requester knows why.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="hold-reason">Reason (Optional)</Label>
            <Textarea
              id="hold-reason"
              placeholder="e.g., Waiting for budget allocation..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(null)}>Cancel</Button>
            <Button
              onClick={() => handleAction('hold')}
              className="bg-orange-600 hover:bg-orange-700 text-white"
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Hold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

       {/* Close Button - Maybe for superadmin only or special cases, adding for completeness */}
       <Dialog open={openDialog === 'close'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            onClick={() => openActionDialog('close')}
            className="text-gray-500 hover:text-gray-900 gap-2"
          >
            <Archive className="h-4 w-4" />
            Close
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Request</DialogTitle>
            <DialogDescription>
              Mark this request as closed. This is usually for requests that are no longer relevant or withdrawn.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="close-comment">Comment (Optional)</Label>
            <Textarea
              id="close-comment"
              placeholder="Closing remarks..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(null)}>Cancel</Button>
            <Button
              onClick={() => handleAction('close')}
              className="bg-gray-800 hover:bg-gray-900 text-white"
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}

