"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBranches } from "@/actions/request";
import type { CategoryMeta } from "@/db/schema";
import { DocumentUpload } from "./DocumentUpload";
import { ArrowLeft, Save, Send, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type Branch = { id: string; name: string; code: string };

// Dynamic form field definitions per category
type FieldDef = {
  name: string;
  label: string;
  type: "text" | "date" | "number" | "textarea" | "select" | "time";
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
};

const CATEGORY_FIELDS: Record<string, FieldDef[]> = {
  flight_booking: [
    { name: "passenger_name", label: "Passenger Name", type: "text", required: true },
    { name: "departure_from", label: "Departure From", type: "text", required: true },
    { name: "destination", label: "Destination", type: "text", required: true },
    { name: "departure_date", label: "Departure Date", type: "date", required: true },
    { name: "return_date", label: "Return Date", type: "date" },
    { name: "number_of_passengers", label: "Number of Passengers", type: "number", required: true },
    {
      name: "travel_class", label: "Travel Class", type: "select", options: [
        { label: "Economy", value: "economy" },
        { label: "Business", value: "business" },
        { label: "First Class", value: "first_class" },
      ]
    },
    { name: "allocated_budget", label: "Allocated Budget", type: "number", placeholder: "e.g. 50000" },
    { name: "purpose_of_travel", label: "Purpose of Travel", type: "textarea", required: true },
  ],
  hotel_accommodation: [
    { name: "hotel_name", label: "Hotel Name", type: "text" },
    { name: "hotel_address", label: "Hotel Address", type: "text" },
    { name: "check_in_date", label: "Check-in Date", type: "date", required: true },
    { name: "check_out_date", label: "Check-out Date", type: "date", required: true },
    { name: "number_of_rooms", label: "Number of Rooms", type: "number", required: true },
    { name: "number_of_guests", label: "Number of Guests", type: "number", required: true },
    { name: "guest_names", label: "Guest Names", type: "textarea", placeholder: "One name per line" },
    { name: "allocated_budget", label: "Allocated Budget", type: "number", placeholder: "e.g. 25000" },
    { name: "purpose_of_stay", label: "Purpose of Stay", type: "textarea", required: true },
  ],
  meals: [
    { name: "event_name", label: "Event / Occasion", type: "text", required: true },
    { name: "meal_date", label: "Date", type: "date", required: true },
    { name: "meal_time", label: "Time", type: "time" },
    { name: "number_of_pax", label: "Number of Pax", type: "number", required: true },
    { name: "venue", label: "Venue / Restaurant", type: "text" },
    {
      name: "meal_type", label: "Meal Type", type: "select", options: [
        { label: "Breakfast", value: "breakfast" },
        { label: "Lunch", value: "lunch" },
        { label: "Dinner", value: "dinner" },
        { label: "Snacks / Refreshments", value: "snacks" },
      ]
    },
    {
      name: "serving_style", label: "Serving Style", type: "select", options: [
        { label: "Plated", value: "plated" },
        { label: "Buffet", value: "buffet" },
        { label: "Packed / Bento", value: "packed" },
        { label: "Snacks", value: "snacks" },
      ]
    },
    { name: "allocated_budget", label: "Allocated Budget", type: "number" },
    { name: "special_requests", label: "Special Requests / Dietary", type: "textarea" },
  ],
  room_reservation: [
    { name: "room_name", label: "Room / Space", type: "text", required: true },
    { name: "reservation_date", label: "Date", type: "date", required: true },
    { name: "start_time", label: "Start Time", type: "time", required: true },
    { name: "end_time", label: "End Time", type: "time", required: true },
    { name: "number_of_attendees", label: "Number of Attendees", type: "number", required: true },
    { name: "equipment_needed", label: "Equipment Needed", type: "textarea", placeholder: "Projector, whiteboard, etc." },
    { name: "purpose", label: "Purpose", type: "textarea", required: true },
  ],
  business_permits: [
    { name: "permit_type", label: "Permit Type", type: "text", required: true },
    { name: "business_name", label: "Business Name", type: "text", required: true },
    { name: "business_address", label: "Business Address", type: "text", required: true },
    { name: "application_date", label: "Application Date", type: "date", required: true },
    { name: "expiry_date", label: "Expiry Date", type: "date" },
    { name: "remarks", label: "Remarks / Notes", type: "textarea" },
  ],
  radio_licenses: [
    { name: "license_type", label: "License Type", type: "text", required: true },
    { name: "equipment_description", label: "Equipment Description", type: "text", required: true },
    { name: "frequency_range", label: "Frequency Range", type: "text" },
    { name: "location", label: "Installation Location", type: "text", required: true },
    { name: "application_date", label: "Application Date", type: "date", required: true },
    { name: "expiry_date", label: "Expiry Date", type: "date" },
    { name: "remarks", label: "Remarks / Notes", type: "textarea" },
  ],
  work_permit: [
    { name: "worker_name", label: "Worker Name", type: "text", required: true },
    { name: "worker_position", label: "Worker Position", type: "text", required: true },
    { name: "work_location", label: "Work Location", type: "text", required: true },
    { name: "start_date", label: "Start Date", type: "date", required: true },
    { name: "end_date", label: "End Date", type: "date", required: true },
    { name: "permit_type", label: "Permit Type", type: "text" },
    { name: "remarks", label: "Remarks / Notes", type: "textarea" },
  ],
  equipments_assets: [
    { name: "item_description", label: "Item Description", type: "text", required: true },
    { name: "quantity", label: "Quantity", type: "number", required: true },
    { name: "unit_cost", label: "Unit Cost (estimated)", type: "number" },
    { name: "total_budget", label: "Total Budget", type: "number" },
    { name: "date_needed", label: "Date Needed", type: "date", required: true },
    { name: "vendor_name", label: "Preferred Vendor", type: "text" },
    { name: "justification", label: "Justification / Purpose", type: "textarea", required: true },
  ],
};

// Helper to convert 12h format (e.g. "02:30 PM") to 24h format (e.g. "14:30") for <input type="time">
function to24Hour(timeStr: string) {
  if (!timeStr) return "";
  // If it doesn't have AM/PM, assume it's already 24h or invalid, return as is
  if (!/AM|PM/i.test(timeStr)) return timeStr;

  const [time, modifier] = timeStr.split(" ");
  const [hours, minutes] = time.split(":");
  let h = parseInt(hours, 10);

  if (modifier.toUpperCase() === "PM" && h < 12) {
    h += 12;
  }
  if (modifier.toUpperCase() === "AM" && h === 12) {
    h = 0;
  }

  return `${h.toString().padStart(2, "0")}:${minutes}`;
}

// Helper to convert 24h format (e.g. "14:30") to 12h format (e.g. "02:30 PM") for DB/Display
function to12Hour(timeStr: string) {
  if (!timeStr) return "";
  // If it has AM/PM, it's already 12h
  if (/AM|PM/i.test(timeStr)) return timeStr;

  const [hours, minutes] = timeStr.split(":");
  let h = parseInt(hours, 10);
  const modifier = h >= 12 ? "PM" : "AM";

  h = h % 12;
  h = h ? h : 12; // 0 should be 12

  return `${h.toString().padStart(2, "0")}:${minutes} ${modifier}`;
}

export function RequestForm({
  category,
  initialValues,
  files,
  onFilesChange,
  requiredPdfs,
  onSubmit,
  onCancel,
  onBack,
  isSubmitting,
  existingAttachmentsCount,
  submitLabel,
}: {
  category: CategoryMeta;
  initialValues: Record<string, unknown>;
  files: File[];
  onFilesChange: (files: File[]) => void;
  requiredPdfs: string[];
  onSubmit: (values: Record<string, unknown>, asDraft: boolean) => void;
  onCancel: () => void;
  onBack: () => void;
  isSubmitting: boolean;
  existingAttachmentsCount?: number;
  submitLabel?: string;
}) {
  const fields = CATEGORY_FIELDS[category.key] ?? [];

  // Initialize values, converting any 12h time strings back to 24h for the inputs
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const processed: Record<string, unknown> = {};

    // Copy common fields
    if (initialValues.title) processed.title = initialValues.title;
    if (initialValues.priority) processed.priority = initialValues.priority;
    if (initialValues.branch_id) processed.branch_id = initialValues.branch_id;

    // Copy category fields if they exist in initialValues
    fields.forEach((field) => {
      if (initialValues[field.name] !== undefined) {
        if (field.type === "time" && typeof initialValues[field.name] === "string") {
          processed[field.name] = to24Hour(initialValues[field.name] as string);
        } else {
          processed[field.name] = initialValues[field.name];
        }
      }
    });

    return processed;
  });

  const [branches, setBranches] = useState<Branch[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    getBranches().then(setBranches).catch(console.error);
  }, []);

  const handleChange = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const validate = (asDraft: boolean): boolean => {
    const newErrors: Record<string, string> = {};

    if (!values.title || !(values.title as string).trim()) {
      newErrors.title = "Ticket name is required";
    }
    if (!values.branch_id) {
      newErrors.branch_id = "Branch is required";
    }

    if (!asDraft) {
      if (files.length + (existingAttachmentsCount || 0) === 0) {
        newErrors.files = "At least one document must be uploaded";
      }

      for (const field of fields) {
        if (field.required && !values[field.name]) {
          newErrors[field.name] = `${field.label} is required`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmit = (e: React.FormEvent, asDraft: boolean) => {
    e.preventDefault();
    // For drafts, we might skip validation or loosen it, but typically we want at least basic fields.
    // Let's validate for now to ensure data integrity.
    if (validate(asDraft)) {
      // Transform 24h time values to 12h format before submitting
      const processed = { ...values };
      fields.forEach((field) => {
        if (field.type === "time" && typeof processed[field.name] === "string") {
          processed[field.name] = to12Hour(processed[field.name] as string);
        }
      });
      onSubmit(processed, asDraft);
    }
  };

  return (
    <form className="space-y-6" autoComplete="off">
      <div className="flex items-center gap-2 mb-4">
        <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>

      <Card className="rounded-2xl md:rounded-[2rem] border-gray-100/50 shadow-sm bg-white">
        <CardHeader className="p-4 md:p-8 pb-0">
          <div className="flex items-center gap-3">
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span>{category.label}</span>
            </CardTitle>
          </div>
          <p className="text-sm text-gray-500">Fill in the required information</p>
        </CardHeader>
        <CardContent className="space-y-6 md:space-y-8 p-4 md:p-8">
          {/* Common fields (Row 1) */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <Label htmlFor="title" className="text-gray-900 font-medium">
                Ticket Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={(values.title as string) ?? ""}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Enter ticket name"
                className="mt-1.5 h-11"
              />
              {errors.title && (
                <p className="text-xs text-red-500 mt-1">{errors.title}</p>
              )}
            </div>

            <div>
              <Label htmlFor="ticket_id" className="text-gray-900 text-gray-400 font-medium">
                Ticket ID
              </Label>
              <Input
                id="ticket_id"
                disabled
                value="Auto-generated"
                className="mt-1.5 bg-gray-50 text-gray-500 h-11"
              />
            </div>
          </div>

          {/* Common fields (Row 2) */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <Label htmlFor="priority" className="text-gray-900 font-medium">Priority Level <span className="text-red-500">*</span></Label>
              <Select
                value={(values.priority as string) ?? "medium"}
                onValueChange={(v) => handleChange("priority", v)}
              >
                <SelectTrigger className="mt-1.5 h-11">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="branch_id" className="text-gray-900 font-medium">
                Branch <span className="text-red-500">*</span>
              </Label>
              <Select
                value={(values.branch_id as string) ?? ""}
                onValueChange={(v) => handleChange("branch_id", v)}
              >
                <SelectTrigger className="mt-1.5 h-11">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.branch_id && (
                <p className="text-xs text-red-500 mt-1">{errors.branch_id}</p>
              )}
            </div>
          </div>

          {/* Dynamic fields */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {fields.map((field) => {
              const isFullWidth =
                (field.type === "textarea" && field.name !== "purpose_of_stay") ||
                (field.name.includes("address") && field.name !== "hotel_address") ||
                field.name === "justification";

              return (
                <div
                  key={field.name}
                  className={isFullWidth ? "sm:col-span-2" : ""}
                >
                  <div className="flex justify-between items-end mb-1.5">
                    <Label htmlFor={field.name} className="text-gray-900 font-medium">
                      {field.label}
                      {field.required && (
                        <span className="text-red-500"> *</span>
                      )}
                    </Label>
                    {field.type === "date" && (
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date().toISOString().split("T")[0];
                          handleChange(field.name, today);
                        }}
                        className="text-[10px] text-[#358334] hover:underline font-medium"
                      >
                        Current date today
                      </button>
                    )}
                  </div>

                  {field.type === "textarea" ? (
                    <Textarea
                      id={field.name}
                      value={(values[field.name] as string) ?? ""}
                      onChange={(e) =>
                        handleChange(field.name, e.target.value)
                      }
                      placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`}
                      className=""
                      rows={field.name === "purpose_of_stay" || field.name === "justification" ? 3 : 3}
                    />
                  ) : field.type === "select" ? (
                    <Select
                      value={(values[field.name] as string) ?? ""}
                      onValueChange={(v) => handleChange(field.name, v)}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue
                          placeholder={`Select ${field.label.toLowerCase()}`}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={field.name}
                      type={field.type}
                      value={(values[field.name] as string) ?? ""}
                      onKeyDown={(e) => {
                        if (field.type === "number") {
                          // Block invalid chars: e, E, +, -
                          if (["e", "E", "+", "-"].includes(e.key)) {
                            e.preventDefault();
                          }
                          // Block decimal point for integer fields
                          // Integer fields: NOT budget, cost, price, amount
                          const isCurrency =
                            field.name.includes("budget") ||
                            field.name.includes("cost") ||
                            field.name.includes("price") ||
                            field.name.includes("amount");

                          if (!isCurrency && e.key === ".") {
                            e.preventDefault();
                          }
                        }
                      }}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (field.type === "number") {
                          if (val === "") {
                            handleChange(field.name, val);
                            return;
                          }

                          const isCurrency =
                            field.name.includes("budget") ||
                            field.name.includes("cost") ||
                            field.name.includes("price") ||
                            field.name.includes("amount");

                          if (isCurrency) {
                            val = val.replace(/[^0-9.]/g, "");
                            const parts = val.split(".");
                            if (parts.length > 2) {
                              val = parts[0] + "." + parts.slice(1).join("");
                            }
                          } else {
                            val = val.replace(/[^0-9]/g, "");
                          }
                        }
                        handleChange(field.name, val);
                      }}
                      placeholder={
                        field.placeholder ?? `Enter ${field.label.toLowerCase()}`
                      }
                      className={cn(
                        "h-11",
                        field.type === "time"
                          ? "[&::-webkit-calendar-picker-indicator]:cursor-pointer text-gray-900"
                          : "text-gray-900"
                      )}
                    />
                  )}

                  {errors[field.name] && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors[field.name]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Existing Attachments Notification */}
          {existingAttachmentsCount && existingAttachmentsCount > 0 ? (
            <div className="rounded-lg bg-blue-50 p-4 border border-blue-100">
              <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {existingAttachmentsCount} document{existingAttachmentsCount > 1 ? 's' : ''} already attached.
              </p>
              <p className="text-xs text-blue-600 mt-1">
                You can upload additional documents below. To manage existing documents, please visit the request detail page.
              </p>
            </div>
          ) : null}

          {/* Document Upload Section */}
          <div className="pt-6 border-t border-gray-100">
            <DocumentUpload
              requiredPdfs={requiredPdfs}
              files={files}
              onFilesChange={onFilesChange}
              error={errors.files ?? null}
            />
          </div>

          <p className="text-xs text-gray-500 italic mt-4">Please review all information before submitting. You cannot edit after submission.</p>

        </CardContent>
      </Card>

      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4">
        <Button
          type="button"
          variant="destructive"
          onClick={onCancel}
          disabled={isSubmitting}
          className="bg-[#F95018] hover:bg-[#d64112] text-white w-full sm:w-auto"
        >
          Cancel
        </Button>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={(e) => handleFormSubmit(e, true)}
            disabled={isSubmitting}
            className="border-gray-300 text-gray-700 gap-2 w-full sm:w-auto"
          >
            <Save className="h-4 w-4" /> Save as draft
          </Button>
          <Button
            type="button"
            onClick={(e) => handleFormSubmit(e, false)}
            disabled={isSubmitting}
            className="bg-[#358334] hover:bg-[#2d6f2c] text-white gap-2 w-full sm:w-auto"
          >
            <Send className="h-4 w-4" /> {submitLabel || "Submit request"}
          </Button>
        </div>
      </div>
    </form>
  );
}
