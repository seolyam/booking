"use client";

import { useState } from "react";
import { Download, FileImage, FileText, Loader2, ChevronDown } from "lucide-react";
import html2canvas from "html2canvas";
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

      // Add temporary padding/styling for better capture if needed
      const canvas = await html2canvas(element, {
        scale: 2, // Better resolution
        logging: false,
        useCORS: true,
        backgroundColor: "#ffffff", // Ensure white background
      });

      if (type === "png") {
        const link = document.createElement("a");
        link.download = `${fileName}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } else if (type === "pdf") {
        const imgData = canvas.toDataURL("image/png");
        
        // Calculate dimensions to fit A4 if needed, or just use custom size
        // Using A4 portrait logic for better printability
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        
        const imgY = 10; // Top margin
        
        // If image is very long, we might need multiple pages, but for now simple fit
        // For a dashboard card, usually it fits on one page if scaled
        
        // Simple scale to width implementation
        const finalWidth = pdfWidth - 20; // 10mm margin each side
        const finalHeight = (imgHeight * finalWidth) / imgWidth;

        pdf.addImage(imgData, "PNG", 10, imgY, finalWidth, finalHeight);
        pdf.save(`${fileName}.pdf`);
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative" data-html2canvas-ignore="true">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center gap-2 bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Export Details
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
            <button
              onClick={() => handleExport("png")}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <FileImage className="h-4 w-4" /> Export as PNG
            </button>
            <button
              onClick={() => handleExport("pdf")}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <FileText className="h-4 w-4" /> Export as PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}
