"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface FloatingLabelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const FloatingLabelInput = React.forwardRef<
  HTMLInputElement,
  FloatingLabelInputProps
>(({ label, error, className, id, ...props }, ref) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const [hasValue, setHasValue] = React.useState(false);
  const generatedId = React.useId();
  const inputId = id || generatedId;

  const handleFocus = () => setIsFocused(true);
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    setHasValue(!!e.target.value);
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasValue(!!e.target.value);
    props.onChange?.(e);
  };

  const isActive = isFocused || hasValue;

  return (
    <div className="relative">
      <input
        ref={ref}
        id={inputId}
        {...props}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        className={cn(
          "peer w-full h-14 px-4 pt-5 pb-2 text-base bg-white border rounded-xl outline-none transition-all",
          "focus:ring-2 focus:ring-[#358334]/20 focus:border-[#358334]",
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
            : "border-gray-200",
          className,
        )}
      />
      <label
        htmlFor={inputId}
        className={cn(
          "absolute left-4 transition-all pointer-events-none text-gray-500",
          isActive
            ? "top-2 text-xs font-medium text-[#358334]"
            : "top-1/2 -translate-y-1/2 text-base",
        )}
      >
        {label}
      </label>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
});
FloatingLabelInput.displayName = "FloatingLabelInput";

interface FloatingLabelSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const FloatingLabelSelect = React.forwardRef<
  HTMLSelectElement,
  FloatingLabelSelectProps
>(({ label, error, options, className, id, ...props }, ref) => {
  const [hasValue, setHasValue] = React.useState(!!props.value);
  const generatedId = React.useId();
  const selectId = id || generatedId;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setHasValue(!!e.target.value);
    props.onChange?.(e);
  };

  return (
    <div className="relative">
      <select
        ref={ref}
        id={selectId}
        {...props}
        onChange={handleChange}
        className={cn(
          "peer w-full h-14 px-4 pt-5 pb-2 text-base bg-white border rounded-xl outline-none transition-all appearance-none",
          "focus:ring-2 focus:ring-[#358334]/20 focus:border-[#358334]",
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
            : "border-gray-200",
          !hasValue && "text-transparent",
          className,
        )}
      >
        <option value="" className="text-gray-500">
          Select...
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="text-gray-900">
            {opt.label}
          </option>
        ))}
      </select>
      <label
        htmlFor={selectId}
        className={cn(
          "absolute left-4 transition-all pointer-events-none",
          hasValue
            ? "top-2 text-xs font-medium text-[#358334]"
            : "top-1/2 -translate-y-1/2 text-base text-gray-500",
        )}
      >
        {label}
      </label>
      {/* Dropdown arrow */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg
          className="h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
});
FloatingLabelSelect.displayName = "FloatingLabelSelect";

interface FloatingLabelTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const FloatingLabelTextarea = React.forwardRef<
  HTMLTextAreaElement,
  FloatingLabelTextareaProps
>(({ label, error, className, id, ...props }, ref) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const [hasValue, setHasValue] = React.useState(false);
  const generatedId = React.useId();
  const textareaId = id || generatedId;

  const handleFocus = () => setIsFocused(true);
  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false);
    setHasValue(!!e.target.value);
  };
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setHasValue(!!e.target.value);
    props.onChange?.(e);
  };

  const isActive = isFocused || hasValue;

  return (
    <div className="relative">
      <textarea
        ref={ref}
        id={textareaId}
        {...props}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        className={cn(
          "peer w-full min-h-[120px] px-4 pt-7 pb-3 text-base bg-white border rounded-xl outline-none transition-all resize-none",
          "focus:ring-2 focus:ring-[#358334]/20 focus:border-[#358334]",
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
            : "border-gray-200",
          className,
        )}
      />
      <label
        htmlFor={textareaId}
        className={cn(
          "absolute left-4 transition-all pointer-events-none text-gray-500",
          isActive
            ? "top-2 text-xs font-medium text-[#358334]"
            : "top-4 text-base",
        )}
      >
        {label}
      </label>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
});
FloatingLabelTextarea.displayName = "FloatingLabelTextarea";
