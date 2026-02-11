"use client";

import { useCallback, useRef } from "react";
import { Upload, X, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CategoryMeta } from "@/db/schema";

export function DocumentUpload({
  category,
  requiredPdfs,
  files,
  onFilesChange,
  error,
}: {
  category: CategoryMeta;
  requiredPdfs: string[];
  files: File[];
  onFilesChange: (files: File[]) => void;
  error: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const allowedTypes = ["application/pdf"];
      const validFiles = Array.from(newFiles).filter((f) =>
        allowedTypes.includes(f.type)
      );
      if (validFiles.length !== newFiles.length) {
        alert("Only PDF files are allowed.");
      }
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
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-black" />
        <h3 className="text-lg font-bold text-gray-900">
          Required Documents <span className="text-red-500">*</span>
        </h3>
      </div>

      <p className="text-sm text-gray-900 font-medium">
        Upload the following documents (PDF only):
      </p>

      {requiredPdfs.length > 0 && (
        <ul className="list-disc list-inside text-sm text-gray-600 ml-1 space-y-1">
          {requiredPdfs.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      )}

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors mt-4",
          "border-gray-300 bg-white hover:border-[#358334] hover:bg-gray-50"
        )}
      >
        <Upload className="h-10 w-10 text-gray-400 mb-4" />
        <p className="text-base font-medium text-gray-900 mb-1">
          Drag and drop PDF files here
        </p>
        <p className="text-sm text-gray-500 mb-4">or</p>

        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          className="border-gray-300 text-gray-700 font-medium"
        >
          Browse Files
        </Button>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
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
        <div className="space-y-2 mt-4">
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

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 mt-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
