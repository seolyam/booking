"use client";

import { useCallback, useRef } from "react";
import { Upload, X, FileText, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CategoryMeta } from "@/db/schema";

export function DocumentUpload({
  category,
  requiredPdfs,
  files,
  onFilesChange,
  onSubmit,
  onSaveDraft,
  onCancel,
  onBack,
  isSubmitting,
  error,
}: {
  category: CategoryMeta;
  requiredPdfs: string[];
  files: File[];
  onFilesChange: (files: File[]) => void;
  onSubmit: () => void;
  onSaveDraft: () => void;
  onCancel: () => void;
  onBack: () => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
      const validFiles = Array.from(newFiles).filter((f) =>
        allowedTypes.includes(f.type)
      );
      onFilesChange([...files, ...validFiles]);
    },
    [files, onFilesChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-gray-900">
            Required Documents — {category.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Required PDFs list */}
          {requiredPdfs.length > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Required documents for this category:
                  </p>
                  <ul className="mt-2 space-y-1">
                    {requiredPdfs.map((label) => (
                      <li
                        key={label}
                        className="text-sm text-yellow-700 flex items-center gap-2"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors",
              "border-gray-300 bg-gray-50 hover:border-[#2F5E3D] hover:bg-[#2F5E3D]/5"
            )}
          >
            <Upload className="h-10 w-10 text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-900">
              Drag & drop PDF or Image files here
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Supported: PDF, PNG, JPG
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf,.png,image/png,.jpg,.jpeg,image/jpeg"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {/* Uploaded files list */}
          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">
                Uploaded files ({files.length})
              </p>
              {files.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
                >
                  <FileText className="h-5 w-5 text-red-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatSize(file.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between pt-2">
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isSubmitting}
          >
            Back
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onSaveDraft}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save as Draft"}
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </div>
    </div>
  );
}
