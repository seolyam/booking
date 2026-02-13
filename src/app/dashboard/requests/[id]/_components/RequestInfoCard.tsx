"use client";

import { cn } from "@/lib/utils";
import { MapPin, Building2, Ban, MessageSquare } from "lucide-react";
import dynamic from "next/dynamic";
import type { Request, Comment } from "@/db/schema";
import { formatDateTime, formatCurrency } from "@/lib/utils";

const ExportButton = dynamic(() => import("./ExportButton"), { ssr: false });

// Form Data Types
interface FlightFormData {
    departure_from?: string;
    destination?: string;
    airline?: string;
    travel_class?: string;
    departure_date?: string;
    return_date?: string;
    number_of_passengers?: number;
    passenger_name?: string;
    purpose_of_travel?: string;
}

interface HotelFormData {
    hotel_name?: string;
    hotel_address?: string;
    check_in_date?: string;
    check_out_date?: string;
    number_of_guests?: number;
    number_of_rooms?: number;
    guest_names?: string;
    purpose_of_stay?: string;
}

interface MealsFormData {
    event_name?: string;
    venue?: string;
    meal_date?: string;
    meal_time?: string;
    number_of_pax?: number;
    meal_type?: string;
    special_requests?: string;
}

// Form Data Helpers
function InfoCard({ label, value, className }: { label: string; value: string | number | null | undefined; className?: string }) {
    if (value === null || value === undefined || value === "") return <div className={cn("flex flex-col", className)}><span className="text-xs text-gray-500 mb-1">{label}</span><span className="text-base font-semibold text-gray-900">—</span></div>;
    return (
        <div className={cn("flex flex-col", className)}>
            <span className="text-xs text-gray-500 mb-1">{label}</span>
            <span className="text-base font-semibold text-gray-900 break-words">{String(value)}</span>
        </div>
    );
}

// Helper to get value from multiple possible keys
const getVal = (data: any, keys: string[]) => {
    for (const key of keys) {
        if (data[key] !== undefined && data[key] !== null && data[key] !== "") {
            return data[key];
        }
    }
    return undefined;
};

function FlightDetails({ data }: { data: any }) {
    return (
        <div className="space-y-6">
            <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                    <div className="text-sm font-medium text-gray-900">
                        {getVal(data, ["departure_from", "origin", "from"]) || "—"} → {getVal(data, ["destination", "to"]) || "—"}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        {getVal(data, ["airline", "carrier"]) || "Any Airline"} • {getVal(data, ["travel_class", "class"])}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-gray-100 pt-6">
                <InfoCard label="Departure" value={getVal(data, ["departure_date", "departure"])} />
                <InfoCard label="Return" value={getVal(data, ["return_date", "return"]) || "One-way"} />
                <InfoCard label="Passengers" value={getVal(data, ["number_of_passengers", "passengers", "pax"])} />
                <InfoCard label="Passenger Name" value={getVal(data, ["passenger_name", "passenger_names", "names"])} />
            </div>

            <div className="border-t border-gray-100 pt-6">
                <span className="text-xs text-gray-500 block mb-2">Purpose of Travel</span>
                <p className="text-sm text-gray-900">{getVal(data, ["purpose_of_travel", "purpose", "reason"]) || "—"}</p>
            </div>
        </div>
    );
}

function HotelDetails({ data }: { data: any }) {
    const guestNames = getVal(data, ["guest_names", "names", "guests_names"]);
    return (
        <div className="space-y-8">
            {/* Title & Location */}
            <div className="space-y-2">
                <h3 className="text-lg font-bold text-gray-900">{getVal(data, ["hotel_name", "hotel"]) || "—"}</h3>
                <div className="flex items-start gap-2 text-gray-500">
                    <MapPin className="h-5 w-5 mt-0.5 shrink-0" />
                    <p className="text-sm leading-snug">{getVal(data, ["hotel_address", "address", "location"]) || "—"}</p>
                </div>
            </div>

            {/* Grid Specs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 py-6 md:py-8 border-y border-gray-100">
                <InfoCard label="Check-in" value={getVal(data, ["check_in_date", "check_in"])} />
                <InfoCard label="Check-out" value={getVal(data, ["check_out_date", "check_out"])} />
                <InfoCard label="Guests" value={getVal(data, ["number_of_guests", "guests"])} />
                <InfoCard label="Rooms" value={getVal(data, ["number_of_rooms", "rooms"])} />
            </div>

            {/* Bottom info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                <div>
                    <span className="text-sm text-gray-500 block mb-3">Name of guest(s)</span>
                    <div className="text-base font-medium text-gray-900 space-y-1">
                        {guestNames ? String(guestNames).split('\n').map((name, i) => (
                            <div key={i} className="flex gap-2">
                                <span className="text-gray-400">•</span>
                                <span>{name}</span>
                            </div>
                        )) : "—"}
                    </div>
                </div>
                <div>
                    <span className="text-sm text-gray-500 block mb-3">Purpose of stay</span>
                    <div className="flex gap-2 text-base font-medium text-gray-900">
                        <span className="text-gray-400">•</span>
                        <p className="leading-snug max-w-md">{getVal(data, ["purpose_of_stay", "purpose", "reason"]) || "—"}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MealsDetails({ data }: { data: any }) {
    return (
        <div className="space-y-6">
            <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                    <div className="text-sm font-medium text-gray-900">{getVal(data, ["event_name", "event", "name"]) || "—"}</div>
                    <div className="text-xs text-gray-500 mt-1">{getVal(data, ["venue", "location", "place"])}</div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-gray-100 pt-6">
                <InfoCard label="Date" value={getVal(data, ["meal_date", "date"])} />
                <InfoCard label="Time" value={getVal(data, ["meal_time", "time"])} />
                <InfoCard label="Pax" value={getVal(data, ["number_of_pax", "pax", "attendees"])} />
                <InfoCard label="Type" value={getVal(data, ["meal_type", "type", "meal"])} />
            </div>

            <div className="border-t border-gray-100 pt-6">
                <span className="text-xs text-gray-500 block mb-2">Special Requests</span>
                <p className="text-sm text-gray-900">{getVal(data, ["special_requests", "requests", "notes"]) || "None"}</p>
            </div>
        </div>
    );
}

function DefaultDetails({ data }: { data: Record<string, unknown> }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Object.entries(data).map(([key, value]) => (
                <InfoCard
                    key={key}
                    label={key.replace(/_/g, " ")}
                    value={value as string | number | null | undefined}
                />
            ))}
        </div>
    );
}

function formatDateShort(input: Date | string) {
    const d = new Date(input);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = String(d.getFullYear());
    return `${mm}-${dd}-${yyyy}`;
}

interface RequestInfoCardProps {
    request: Request & { requester: { full_name: string | null; email: string }; branch: { name: string } | null; comments: (Comment & { user: { full_name: string | null; email: string } | null })[] };
    hideComments?: boolean;
}

export default function RequestInfoCard({ request, hideComments = false }: RequestInfoCardProps) {
    const formData = (request.form_data as Record<string, unknown>) ?? {};

    // Helper to get value from multiple possible keys
    const getValue = (keys: string[]) => {
        for (const key of keys) {
            if (formData[key] !== undefined && formData[key] !== null && formData[key] !== "") {
                return formData[key];
            }
        }
        return undefined;
    };

    const budget = getValue(["allocated_budget", "budget", "total_budget", "estimated_budget", "cost", "total_cost"]) as string | number | null | undefined;

    return (
        <div id="request-printable-area" className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-sm ring-1 ring-gray-100 h-full">
            {/* Main Info Block */}
            <div className="mb-8">
                {/* Header Line */}
                <div className="flex items-center gap-3 mb-6">
                    <span className={cn(
                        "text-xs font-bold px-3 py-1 rounded-full capitalize",
                        request.priority === "urgent" ? "bg-red-50 text-red-700" :
                            request.priority === "high" ? "bg-orange-50 text-orange-700" :
                                request.priority === "medium" ? "bg-blue-50 text-blue-700" :
                                    "bg-gray-100 text-gray-700"
                    )}>
                        {request.priority}
                    </span>
                </div>

                {/* Primary Metric Strip */}
                <div className="bg-gray-50/80 rounded-xl md:rounded-2xl p-4 md:p-6 mb-6 md:mb-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                        <InfoCard label="Requester" value={request.requester.full_name || request.requester.email} className="items-center md:items-start text-center md:text-left" />
                        <InfoCard label="Branch" value={request.branch?.name || "Main Branch"} className="items-center md:items-start text-center md:text-left" />
                        <InfoCard label="Budget" value={formatCurrency(budget)} className="items-center md:items-start text-center md:text-left" />
                        <InfoCard label="Created" value={formatDateShort(request.created_at)} className="items-center md:items-start text-center md:text-left" />
                    </div>
                </div>

                {/* Category Details (Dynamic) */}
                <div className="px-1">
                    {request.category === "flight_booking" ? (
                        <FlightDetails data={formData as any} />
                    ) : request.category === "hotel_accommodation" ? (
                        <HotelDetails data={formData as any} />
                    ) : request.category === "meals" ? (
                        <MealsDetails data={formData as any} />
                    ) : (
                        <DefaultDetails data={formData} />
                    )}
                </div>

                {/* Footer Button */}
                <div className="flex justify-end mt-8 md:mt-12 bg-transparent">
                    <ExportButton
                        targetId="request-printable-area"
                        fileName={`TICKET-${String(request.ticket_number).padStart(4, "0")}-Details`}
                    />
                </div>
            </div>

            {request.remarks && (
                <div className="mt-8 border-t border-gray-100 pt-8">
                    <h4 className="text-sm font-bold text-gray-900 mb-2">Additional Remarks</h4>
                    <p className="text-gray-900 bg-gray-50 p-4 rounded-xl text-sm leading-relaxed">{request.remarks}</p>
                </div>
            )}
            {request.rejection_reason && (
                <div className="mt-8 bg-red-50 border border-red-100 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-red-900 mb-1 flex items-center gap-2">
                        <Ban className="h-4 w-4" /> Rejection Reason
                    </h4>
                    <p className="text-red-800 text-sm">{request.rejection_reason}</p>
                </div>
            )}

            {!hideComments && (
                <div className="pt-8 border-t border-gray-100 mt-8">
                    <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-900">
                        <MessageSquare className="h-5 w-5 text-gray-400" /> Comments
                    </h3>
                    <div className="space-y-6">
                        {request.comments.length === 0 ? (
                            <div className="text-sm text-gray-500 italic">No comments yet.</div>
                        ) : (
                            request.comments.map((comment) => (
                                <div key={comment.id} className="flex gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold text-xs">
                                        {(comment.user?.full_name || comment.user?.email || "?").charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold text-gray-900">
                                                {comment.user?.full_name || comment.user?.email}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {formatDateTime(comment.created_at)}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3 rounded-tl-none">
                                            {comment.content}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
