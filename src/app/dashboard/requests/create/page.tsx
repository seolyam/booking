import { getAllFormConfigs } from "@/actions/form-config";
import CreateRequestClient from "./_components/CreateRequestClient";
import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function CreateRequestPage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES, REQUIRED_PDFS, type CategoryMeta } from "@/db/schema";
import { createRequest, saveAttachments } from "@/actions/request";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CategorySelect } from "./_components/CategorySelect";
import { RequestForm } from "./_components/RequestForm";
import SuccessModal from "@/components/SuccessModal";

    const configs = await getAllFormConfigs();

export default function CreateRequestPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<CategoryMeta | null>(
    null
  );
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [newRequestId, setNewRequestId] = useState<string | null>(null);

  const handleCategorySelect = useCallback((category: CategoryMeta) => {
    setSelectedCategory(category);
  }, []);

  const handleNext = () => {
    if (step === 1 && selectedCategory) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  // No longer separate intermediate step handler.
  const handleSubmit = async (values: Record<string, unknown>, asDraft: boolean) => {
    if (!selectedCategory) return;
    setIsSubmitting(true);
    setFormValues(values); // Save for potential back navigation

    try {
      const result = await createRequest({
        title: (values.title as string) || `${selectedCategory.label} Request`,
        category: selectedCategory.key,
        priority: (values.priority as string) || "medium",
        branch_id: values.branch_id as string,
        form_data: values,
        status: asDraft ? "draft" : "submitted",
      });

      if (files.length > 0) {
        const supabase = createSupabaseBrowserClient();
        const uploadedFiles: {
          fileName: string;
          filePath: string;
          fileSize: number;
          fileType: string;
        }[] = [];

        for (const file of files) {
          // Sanitize filename to avoid issues
          const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
          const filePath = `${result.id}/${Date.now()}-${sanitizedName}`;

          const { error: uploadError } = await supabase.storage
            .from("attachments")
            .upload(filePath, file);

          if (uploadError) {
            console.error("Upload error:", uploadError);
            throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
          }

          uploadedFiles.push({
            fileName: file.name,
            filePath,
            fileSize: file.size,
            fileType: file.type,
          });
        }

        await saveAttachments(result.id, uploadedFiles);
      }

      setNewRequestId(result.id);
      setShowSuccessModal(true);
    } catch (err: unknown) {
      console.error(err instanceof Error ? err.message : "Failed to create request");
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/dashboard/requests");
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    if (newRequestId) {
      router.push(`/dashboard/requests/${newRequestId}`);
    } else {
      router.push("/dashboard/requests");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleModalClose}
        title="Request Submitted!"
        message="Your request has been successfully submitted for review."
        buttonText="View Request"
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Request</h1>
        <p className="text-sm text-gray-500 mt-1">
          Submit a new booking or service request
        </p>
      </div>

      {/* Progress Stepper */}
      <div className="flex items-center justify-center">
        {STEPS.map((s, i) => (
          <div key={s.number} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
                  step === s.number
                    ? "border-[#358334] bg-[#358334] text-white" // Current: Green solid, white text
                    : step > s.number
                      ? "border-[#358334] bg-white text-[#358334]" // Past: Green border, green text
                      : "border-gray-300 bg-white text-gray-300"   // Future: Gray border, gray text
                )}
              >
                {step === s.number ? (
                  <Check className="h-5 w-5" />
                ) : (
                  s.number
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs font-medium",
                  step >= s.number ? "text-[#358334]" : "text-gray-400"
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-4 h-0.5 w-16 sm:w-24 transition-colors",
                  step > s.number ? "bg-[#358334]" : "bg-gray-300"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {step === 1 && (
        <CategorySelect
          categories={CATEGORIES}
          selected={selectedCategory}
          onSelect={handleCategorySelect}
          onNext={handleNext}
          onCancel={handleCancel}
        />
      )}

      {step === 2 && selectedCategory && (
        <RequestForm
          category={selectedCategory}
          initialValues={formValues}
          files={files}
          onFilesChange={setFiles}
          requiredPdfs={REQUIRED_PDFS[selectedCategory.key] ?? []}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onBack={handleBack}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
