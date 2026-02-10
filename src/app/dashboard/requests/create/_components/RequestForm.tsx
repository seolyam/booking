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
    { name: "allocated_budget", label: "Allocated Budget", type: "number" },
    { name: "special_requests", label: "Special Requests / Dietary", type: "textarea" },
  ],
  room_reservation: [
    { name: "room_name", label: "Room / Space", type: "text", required: true },
    { name: "reservation_date", label: "Date", type: "date", required: true },
    { name: "start_time", label: "Start Time", type: "time", required: true },
    { name: "end_time", label: "End Time", type: "time", required: true },
    { name: "number_of_attendees", label: "Number of Attendees", type: "number", required: true },
    { name: "purpose", label: "Purpose", type: "textarea", required: true },
    { name: "equipment_needed", label: "Equipment Needed", type: "textarea", placeholder: "Projector, whiteboard, etc." },
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
    { name: "justification", label: "Justification / Purpose", type: "textarea", required: true },
    { name: "vendor_name", label: "Preferred Vendor", type: "text" },
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
  onSubmit,
  onBack,
}: {
  category: CategoryMeta;
  initialValues: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void;
  onBack: () => void;
}) {
  const fields = CATEGORY_FIELDS[category.key] ?? [];

  // Initialize values, converting any 12h time strings back to 24h for the inputs
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const processed = { ...initialValues };
    fields.forEach((field) => {
      if (field.type === "time" && typeof processed[field.name] === "string") {
        processed[field.name] = to24Hour(processed[field.name] as string);
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

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!values.title || !(values.title as string).trim()) {
      newErrors.title = "Project title is required";
    }
    if (!values.branch_id) {
      newErrors.branch_id = "Branch is required";
    }

    for (const field of fields) {
      if (field.required && !values[field.name]) {
        newErrors[field.name] = `${field.label} is required`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      // Transform 24h time values to 12h format before submitting
      const processed = { ...values };
      fields.forEach((field) => {
        if (field.type === "time" && typeof processed[field.name] === "string") {
          processed[field.name] = to12Hour(processed[field.name] as string);
        }
      });
      onSubmit(processed);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-gray-900">
            {category.label} — Request Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Common fields */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="title" className="text-gray-900">
                Project Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={(values.title as string) ?? ""}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Enter project title"
                className="mt-1.5"
              />
              {errors.title && (
                <p className="text-xs text-red-500 mt-1">{errors.title}</p>
              )}
            </div>

            <div>
              <Label htmlFor="priority" className="text-gray-900">Priority Level</Label>
              <Select
                value={(values.priority as string) ?? "medium"}
                onValueChange={(v) => handleChange("priority", v)}
              >
                <SelectTrigger className="mt-1.5">
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
              <Label htmlFor="branch_id" className="text-gray-900">
                Branch <span className="text-red-500">*</span>
              </Label>
              <Select
                value={(values.branch_id as string) ?? ""}
                onValueChange={(v) => handleChange("branch_id", v)}
              >
                <SelectTrigger className="mt-1.5">
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

          {/* Divider */}
          <div className="border-t border-gray-100 pt-5">
            <p className="text-sm font-bold text-gray-900 mb-4">
              Category-specific information
            </p>
          </div>

          {/* Dynamic fields */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {fields.map((field) => {
              const isFullWidth =
                field.type === "textarea" || field.name.includes("address");

              return (
                <div
                  key={field.name}
                  className={isFullWidth ? "sm:col-span-2" : ""}
                >
                  <div className="flex justify-between items-end mb-1.5">
                    <Label htmlFor={field.name} className="text-gray-900">
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
                        className="text-[10px] text-[#2F5E3D] hover:underline font-medium"
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
                      rows={3}
                    />
                  ) : field.type === "select" ? (
                    <Select
                      value={(values[field.name] as string) ?? ""}
                      onValueChange={(v) => handleChange(field.name, v)}
                    >
                      <SelectTrigger className="">
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
                      className={
                        field.type === "time"
                          ? "[&::-webkit-calendar-picker-indicator]:cursor-pointer"
                          : ""
                      }
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
        </CardContent>
      </Card>

      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit">Next</Button>
      </div>
    </form>
  );
}
