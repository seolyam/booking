"use client";

import { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Download, FileText } from "lucide-react";
import type { Attachment } from "@/db/schema";

type AttachmentHandlerProps = {
  attachments: Attachment[];
  requestTicketNumber: number;
};

function formatDateShort(input: Date | string) {
  const d = new Date(input);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${mm}-${dd}-${yyyy}`;
}

export default function AttachmentHandler({ attachments, requestTicketNumber }: AttachmentHandlerProps) {
  const [isZipping, setIsZipping] = useState(false);

  const downloadAll = async () => {
    if (attachments.length === 0) return;
    setIsZipping(true);
    
    try {
      const zip = new JSZip();
      const promises = attachments.map(async (file) => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/attachments/${file.file_path}`);
        if (!response.ok) {
          console.error(`Failed to fetch file: ${file.file_name}`);
          return;
        }
        const blob = await response.blob();
        zip.file(file.file_name, blob);
      });

      await Promise.all(promises);

      zip.generateAsync({ type: "blob" }).then((content) => {
        saveAs(content, `Request-${String(requestTicketNumber).padStart(4, "0")}-Attachments.zip`);
      });
    } catch (error) {
      console.error("Error creating zip file:", error);
      // You might want to show an error message to the user here
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Attachments ({attachments.length})</h3>
        <button
          onClick={downloadAll}
          disabled={isZipping || attachments.length === 0}
          className="flex items-center gap-1.5 bg-gray-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Download className="h-3.5 w-3.5" />
          {isZipping ? "Zipping..." : "Download all"}
        </button>
      </div>

      {attachments.length === 0 ? (
        <div className="text-sm text-gray-500 italic py-4">No attachments found.</div>
      ) : (
        <ul className="space-y-3">
          {attachments.map((file) => (
            <li key={file.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors group">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex-shrink-0 w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate max-w-[150px]">{file.file_name}</p>
                  <p className="text-[10px] text-gray-400">{(file.file_size / 1024).toFixed(1)} KB • Uploaded {formatDateShort(file.created_at)}</p>
                </div>
              </div>
              <a
                href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/attachments/${file.file_path}`}
                download={file.file_name}
                className="text-gray-400 hover:text-gray-900 p-1"
              >
                <Download className="h-4 w-4" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
