"use client";

import { useState } from "react";
import { Download, FileImage, FileText, Loader2, ChevronDown } from "lucide-react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";

interface ExportButtonProps {
  targetId: string;
  fileName?: string;
}

export default function ExportButton({ targetId, fileName = "request-details" }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (type: "png" | "pdf") => {
    try {
      setIsExporting(true);
      setIsOpen(false);
      
      const element = document.getElementById(targetId);
      if (!element) {
        console.error("Target element not found");
        return;
      }

      // Filter out elements that should be ignored (like this button)
      const filter = (node: HTMLElement) => {
        // Only process elements
        if (node.nodeType === 1 && node.hasAttribute("data-export-ignore")) {
          return false;
        }
        return true;
      };

      const dataUrl = await toPng(element, {
        cacheBust: true,
        backgroundColor: "#ffffff",
        pixelRatio: 2, // Better resolution
        filter: filter as (node: Node) => boolean,
        skipFonts: true, // Fix for "font is undefined" error
      });

      if (type === "png") {
        const link = document.createElement("a");
        link.download = `${fileName}.png`;
        link.href = dataUrl;
        link.click();
      } else if (type === "pdf") {
        // Get image dimensions to maintain aspect ratio
        const img = new Image();
        img.src = dataUrl;
        
        await new Promise((resolve) => {
          img.onload = resolve;
        });

        // Calculate dimensions to fit A4
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        // const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgWidth = img.width;
        const imgHeight = img.height;
        
        const imgY = 10; // Top margin
        
        // Simple scale to width implementation
        const finalWidth = pdfWidth - 20; // 10mm margin each side
        const finalHeight = (imgHeight * finalWidth) / imgWidth;

        pdf.addImage(dataUrl, "PNG", 10, imgY, finalWidth, finalHeight);
        pdf.save(`${fileName}.pdf`);
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative" data-export-ignore="true">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center gap-2 bg-gray-700 text-white text-sm font-medium px-3 sm:px-4 py-2 min-h-[44px] rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 touch-manipulation"
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">Export Details</span>
        <span className="sm:hidden">Export</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 sm:right-0 bottom-full mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
            <button
              onClick={() => handleExport("png")}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 min-h-[44px] touch-manipulation"
            >
              <FileImage className="h-4 w-4" /> Export as PNG
            </button>
            <button
              onClick={() => handleExport("pdf")}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 min-h-[44px] touch-manipulation"
            >
              <FileText className="h-4 w-4" /> Export as PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}
