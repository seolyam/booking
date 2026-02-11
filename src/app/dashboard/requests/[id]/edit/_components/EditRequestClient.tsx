"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RequestForm } from "@/app/dashboard/requests/create/_components/RequestForm";
import { CATEGORIES, REQUIRED_PDFS, type CategoryMeta, type Request, type Attachment } from "@/db/schema";
import { updateRequest, saveAttachments } from "@/actions/request";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function EditRequestClient({
    request,
    category,
    existingAttachments,
}: {
    request: Request & { form_data: Record<string, unknown> };
    category: CategoryMeta;
    existingAttachments: Attachment[];
}) {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (values: Record<string, unknown>, asDraft: boolean) => {
        if (!confirm("Are you sure you want to save these changes?")) {
            return;
        }

        setIsSubmitting(true);

        try {
            // 1. Update Request Data
            await updateRequest(request.id, {
                title: (values.title as string) || request.title,
                category: request.category,
                priority: (values.priority as string) || "medium",
                branch_id: values.branch_id as string,
                form_data: values,
            });

            // 2. Upload New Files if any
            if (files.length > 0) {
                const supabase = createSupabaseBrowserClient();
                const uploadedFiles = [];

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

            // 3. Navigate back
            router.push(`/dashboard/requests/${request.id}`);
            router.refresh();

        } catch (err: unknown) {
            console.error(err);
            alert(err instanceof Error ? err.message : "Failed to update request");
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        router.push(`/dashboard/requests/${request.id}`);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Edit Request</h1>
                <p className="text-sm text-gray-500">
                    REQ-{String(request.ticket_number).padStart(4, "0")} • {category.label}
                </p>
            </div>

            <RequestForm
                category={category}
                initialValues={{
                    ...request.form_data,
                    title: request.title,
                    priority: request.priority,
                    branch_id: request.branch_id,
                }}
                files={files}
                onFilesChange={setFiles}
                requiredPdfs={REQUIRED_PDFS[category.key] ?? []}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                onBack={handleCancel} // Edit mode has no "back to category" step, so back goes to cancel
                isSubmitting={isSubmitting}
                existingAttachmentsCount={existingAttachments.length}
            />
        </div>
    );
}
