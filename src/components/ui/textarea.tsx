import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base md:text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#2F5E3D] focus:outline-none focus:ring-2 focus:ring-[#2F5E3D] focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export { Textarea };
