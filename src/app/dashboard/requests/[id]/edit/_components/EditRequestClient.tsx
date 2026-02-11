"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, REQUIRED_PDFS } from "@/db/schema";
import type { Request } from "@/db/schema";
import { updateRequest, saveAttachments } from "@/actions/request";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { RequestForm } from "../../../create/_components/RequestForm";
import SuccessModal from "@/components/SuccessModal";

interface EditRequestClientProps {
  request: Request;
  revisionReason: string | null;
}

export default function EditRequestClient({ request, revisionReason }: EditRequestClientProps) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const category = CATEGORIES.find((c) => c.key === request.category);
  if (!category) {
    return (
      <div className="text-center py-12 text-red-600">
        Unknown category: {request.category}
      </div>
    );
  }

  const formData = request.form_data as Record<string, unknown>;

  // Merge top-level request fields into initialValues so the form can pre-fill them
  const initialValues: Record<string, unknown> = {
    title: request.title,
    priority: request.priority,
    branch_id: request.branch_id,
    ...formData,
  };

  const handleSubmit = async (values: Record<string, unknown>, _asDraft: boolean) => {
    setIsSubmitting(true);
    setError(null);

    try {
      await updateRequest(request.id, {
        title: (values.title as string) || request.title,
        priority: (values.priority as string) || request.priority,
        branch_id: (values.branch_id as string) || request.branch_id,
        form_data: values,
      });

      // Upload new files if any
      if (files.length > 0) {
        const supabase = createSupabaseBrowserClient();
        const uploadedFiles: {
          fileName: string;
          filePath: string;
          fileSize: number;
          fileType: string;
        }[] = [];

        for (const file of files) {
          const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
          const filePath = `${request.id}/${Date.now()}-${sanitizedName}`;

          const { error: uploadError } = await supabase.storage
            .from("attachments")
            .upload(filePath, file);

          if (uploadError) {
            throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
          }

          uploadedFiles.push({
            fileName: file.name,
            filePath,
            fileSize: file.size,
            fileType: file.type,
          });
        }

        await saveAttachments(request.id, uploadedFiles);
      }

      setShowSuccessModal(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update request");
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/requests/${request.id}`);
  };

  const handleBack = () => {
    router.push(`/dashboard/requests/${request.id}`);
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    router.push(`/dashboard/requests/${request.id}`);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleModalClose}
        title="Request Updated!"
        message="Your request has been updated and resubmitted for review."
        buttonText="View Request"
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Request</h1>
        <p className="text-sm text-gray-500 mt-1">
          Update your request details and resubmit for review
        </p>
      </div>

      {/* Admin Feedback Banner */}
      {revisionReason && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
          <p className="text-xs font-bold text-amber-700 mb-1">Admin feedback:</p>
          <p className="text-sm text-amber-900">{revisionReason}</p>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <RequestForm
        category={category}
        initialValues={initialValues}
        files={files}
        onFilesChange={setFiles}
        requiredPdfs={REQUIRED_PDFS[request.category] ?? []}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        onBack={handleBack}
        isSubmitting={isSubmitting}
        mode="edit"
      />
    </div>
  );
}
