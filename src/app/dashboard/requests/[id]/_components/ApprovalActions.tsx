"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, CheckCheck, Loader2 } from "lucide-react";
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
import { updateRequestStatus, saveAttachments } from "@/actions/request";
import SuccessModal from "@/components/SuccessModal";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface ApprovalActionsProps {
  requestId: string;
}

// Maps internal action types to the valid DB status they produce and UX labels.
// "approve"  -> "pending"   (admin accepts the request; work begins)
// "reject"   -> "cancelled" (admin denies the request; terminal state)
// "resolve"  -> "resolved"  (admin marks work as complete)
const ACTION_STATUS_MAP: Record<string, { status: string; pastTense: string }> = {
  approve: { status: "pending", pastTense: "approved" },
  reject: { status: "cancelled", pastTense: "cancelled" },
  resolve: { status: "resolved", pastTense: "resolved" },
};

export default function ApprovalActions({ requestId }: ApprovalActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: "", message: "" });

  // Attachment upload
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = e.target.files ? Array.from(e.target.files) : [];
    setAttachments(files);
  };

  const handleAction = async (actionType: string) => {
    if (actionType === "reject" && !comment.trim()) {
      alert("Rejection reason is required");
      return;
    }

    const mapping = ACTION_STATUS_MAP[actionType];
    if (!mapping) return;

    startTransition(async () => {
      try {

        if (actionType === "resolve" && attachments.length > 0) {
          setIsUploading(true);
          const supabase = createSupabaseBrowserClient();
          const uploadedFiles = [];
          for (const file of attachments) {
            const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
            const filePath = `${requestId}/${Date.now()}-${sanitizedName}`;
            const { error: uploadError } = await supabase.storage
              .from("attachments")
              .upload(filePath, file);
            if (uploadError) {
              setUploadError(`Failed to upload ${file.name}: ${uploadError.message}`);
              setIsUploading(false);
              return;
            }
            uploadedFiles.push({
              fileName: file.name,
              filePath,
              fileSize: file.size,
              fileType: file.type,
            });
          }
          await saveAttachments(requestId, uploadedFiles);
          setIsUploading(false);
        }
        const result = await updateRequestStatus(requestId, mapping.status, comment);

        if (result?.success) {
          setOpenDialog(null);
          setComment("");
          setAttachments([]);
          setSuccessMessage({
            title: `Request ${mapping.pastTense.charAt(0).toUpperCase() + mapping.pastTense.slice(1)}!`,
            message: `The request has been successfully ${mapping.pastTense}.`,
          });
          setShowSuccessModal(true);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          alert((result as any)?.message || "Action failed");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "An unexpected error occurred";
        alert(msg);
      }
    });
  };

  const openActionDialog = (type: string) => {
    setComment("");
    setAttachments([]);
    setOpenDialog(type);
    setUploadError(null);
  };

  return (
    <>
<SuccessModal
         isOpen={showSuccessModal}
         onClose={() => {
           setShowSuccessModal(false);
           router.refresh();
         }}
         title={successMessage.title}
         message={successMessage.message}
       />
      <div className="flex flex-wrap gap-3">
      {/* Approve Button — transitions request from open → pending */}
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
              Accept this request and move it to processing. You can add an optional comment.
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

      {/* Reject Button — transitions request to cancelled (terminal) */}
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

      {/* Resolve Button — transitions request from pending → resolved */}
      <Dialog open={openDialog === 'resolve'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            onClick={() => openActionDialog('resolve')}
            className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 gap-2"
          >
            <CheckCheck className="h-4 w-4" />
            Resolve
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Request</DialogTitle>
            <DialogDescription>
              Mark this request as resolved. This indicates the work has been completed.
            </DialogDescription>
          </DialogHeader>
           <div className="space-y-2 py-4">
             <Label htmlFor="resolve-comment">Comment (Optional)</Label>
             <Textarea
               id="resolve-comment"
               placeholder="Closing remarks..."
               value={comment}
               onChange={(e) => setComment(e.target.value)}
             />

             <Label htmlFor="resolve-files">Attachments (Optional)</Label>
             <input
               id="resolve-files"
               type="file"
               multiple
               onChange={handleFileChange}
               className="mt-1"
             />
             {uploadError && (
               <div className="text-xs text-red-600">{uploadError}</div>
             )}
             {isUploading && (
               <div className="flex items-center gap-2 text-xs text-gray-500">
                 <Loader2 className="animate-spin h-4 w-4" /> Uploading files...
               </div>
             )}
           </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(null)}>Cancel</Button>
            <Button
              onClick={() => handleAction('resolve')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
   );
}


