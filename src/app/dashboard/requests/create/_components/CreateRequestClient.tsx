"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategoryMeta, FormConfig } from "@/db/schema";
import { createRequest, saveAttachments, getBranches } from "@/actions/request";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CategorySelect } from "./CategorySelect";
import { RequestForm, type FieldDef } from "./RequestForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import SuccessModal from "@/components/SuccessModal";

const STEPS = [
  { label: "Select category", number: 1 },
  { label: "Fill up form", number: 2 },
  { label: "Submit", number: 3 },
];

export function CreateRequestClient({
  categories,
  formConfigs
}: {
  categories: CategoryMeta[];
  formConfigs: Record<string, FormConfig>;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<CategoryMeta | null>(
    null
  );
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingData, setPendingData] = useState<{
    values: Record<string, unknown>;
    asDraft: boolean;
  } | null>(null);
  const [newRequestId, setNewRequestId] = useState<string | null>(null);
  const [newTicketNumber, setNewTicketNumber] = useState<string | number | null>(null);
  const [branches, setBranches] = useState<{ id: string; name: string; code: string }[]>([]);

  useEffect(() => {
    getBranches().then(setBranches).catch(console.error);
  }, []);

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

  const handleFormSubmit = (values: Record<string, unknown>, asDraft: boolean) => {
    setPendingData({ values, asDraft });
    setShowConfirmation(true);
  };

  const executeSubmission = async () => {
    if (!selectedCategory || !pendingData) return;

    setShowConfirmation(false);
    setIsSubmitting(true);

    const { values } = pendingData;
    setFormValues(values);

    console.log("Submitting values:", values); // Debug log

    try {
      const result = await createRequest({
        title: (values.title as string) || `${selectedCategory.label} Request`,
        category: selectedCategory.key,
        priority: (values.priority as string) || "medium",
        branch_id: values.branch_id as string,
        form_data: values,
        status: "open",
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
      setNewTicketNumber(result.ticket_number);
      setShowSuccessModal(true);
    } catch (err: unknown) {
      console.error(err instanceof Error ? err.message : "Failed to create request");
      setIsSubmitting(false); // Only unset on error
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

  // Get config for selected category
  const activeConfig = selectedCategory ? formConfigs[selectedCategory.key] : null;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const formFields = (activeConfig?.fields as any as FieldDef[]) ?? [];
  const requiredPdfs = activeConfig?.required_pdfs ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleModalClose}
        title={newTicketNumber ? `Ticket #${String(newTicketNumber).padStart(4, "0")} Submitted!` : "Ticket Submitted!"}
        message="Your ticket has been successfully submitted for review."
        buttonText="View Ticket"
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
                    ? "border-[#358334] bg-[#358334] text-white"
                    : step > s.number
                      ? "border-[#358334] bg-white text-[#358334]"
                      : "border-gray-300 bg-white text-gray-300"
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
          categories={categories}
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
          requiredPdfs={requiredPdfs}
          fields={formFields}
          onSubmit={handleFormSubmit}
          onCancel={handleCancel}
          onBack={handleBack}
          isSubmitting={isSubmitting}
          branches={branches}
        />
      )}

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Ticket Submission</DialogTitle>
            <DialogDescription>
              Please review your ticket details before submitting.
            </DialogDescription>
          </DialogHeader>

          {pendingData && (
            <div className="py-4 text-sm space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-3 gap-2">
                <span className="font-medium text-gray-500">Title:</span>
                <span className="col-span-2 font-medium text-gray-900">{pendingData.values.title as string}</span>

                <span className="font-medium text-gray-500">Category:</span>
                <span className="col-span-2 text-gray-900">{selectedCategory?.label}</span>

                <span className="font-medium text-gray-500">Priority:</span>
                <span className="col-span-2 capitalize text-gray-900">{pendingData.values.priority as string}</span>

                <span className="font-medium text-gray-500">Branch:</span>
                <span className="col-span-2 text-gray-900">
                  {branches.find(b => b.id === pendingData.values.branch_id)?.name || "Unknown Branch"}
                </span>

                {/* Dynamic Fields */}
                {Object.entries(pendingData.values).map(([key, value]) => {
                  if (["title", "priority", "branch_id", "category"].includes(key)) return null;
                  // Find label from config if possible, else format key
                  const fieldDef = formConfigs[selectedCategory?.key || ""]?.fields?.find((f: any) => f.name === key);
                  const label = fieldDef?.label || key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

                  if (value === undefined || value === "" || value === null) return null;

                  return (
                    <div key={key} className="contents">
                      <span className="font-medium text-gray-500">{label}:</span>
                      <span className="col-span-2 text-gray-900 break-words">
                        {String(value)}
                      </span>
                    </div>
                  );
                })}

                <span className="font-medium text-gray-500">Attachments:</span>
                <span className="col-span-2 text-gray-900">
                  {files.length > 0 ? `${files.length} file(s)` : "None"}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmation(false)}>
              Back to Edit
            </Button>
            <Button onClick={executeSubmission} className="bg-[#358334] hover:bg-[#2F5E3D]">
              Confirm Submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
