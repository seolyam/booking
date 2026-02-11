"use client";

import { cn } from "@/lib/utils";
import { MapPin, Building2, Ban, MessageSquare } from "lucide-react";
import {
    CATEGORY_MAP,
} from "@/db/schema";
import type { Request, Comment } from "@/db/schema";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import ExportButton from "./ExportButton";

// Form Data Helpers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function InfoCard({ label, value, className }: { label: string; value: any; className?: string }) {
    if (value === null || value === undefined || value === "") return <div className={cn("flex flex-col", className)}><span className="text-xs text-gray-500 mb-1">{label}</span><span className="text-base font-semibold text-gray-900">—</span></div>;
    return (
        <div className={cn("flex flex-col", className)}>
            <span className="text-xs text-gray-500 mb-1">{label}</span>
            <span className="text-base font-semibold text-gray-900 break-words">{String(value)}</span>
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FlightDetails({ data }: { data: any }) {
    return (
        <div className="space-y-6">
            <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                    <div className="text-sm font-medium text-gray-900">{data.departure_from} → {data.destination}</div>
                    <div className="text-xs text-gray-500 mt-1">{data.airline || "Any Airline"} • {data.travel_class}</div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-gray-100 pt-6">
                <InfoCard label="Departure" value={data.departure_date} />
                <InfoCard label="Return" value={data.return_date || "One-way"} />
                <InfoCard label="Passengers" value={data.number_of_passengers} />
                <InfoCard label="Passenger Name" value={data.passenger_name} />
            </div>

            <div className="border-t border-gray-100 pt-6">
                <span className="text-xs text-gray-500 block mb-2">Purpose of Travel</span>
                <p className="text-sm text-gray-900">{data.purpose_of_travel}</p>
            </div>
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HotelDetails({ data }: { data: any }) {
    return (
        <div className="space-y-8">
            {/* Title & Location */}
            <div className="space-y-2">
                <h3 className="text-lg font-bold text-gray-900">{data.hotel_name}</h3>
                <div className="flex items-start gap-2 text-gray-500">
                    <MapPin className="h-5 w-5 mt-0.5 shrink-0" />
                    <p className="text-sm leading-snug">{data.hotel_address}</p>
                </div>
            </div>

            {/* Grid Specs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 py-6 md:py-8 border-y border-gray-100">
                <InfoCard label="Check-in" value={data.check_in_date} />
                <InfoCard label="Check-out" value={data.check_out_date} />
                <InfoCard label="Guests" value={data.number_of_guests} />
                <InfoCard label="Rooms" value={data.number_of_rooms} />
            </div>

            {/* Bottom info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                <div>
                    <span className="text-sm text-gray-500 block mb-3">Name of guest(s)</span>
                    <div className="text-base font-medium text-gray-900 space-y-1">
                        {String(data.guest_names).split('\n').map((name, i) => (
                            <div key={i} className="flex gap-2">
                                <span className="text-gray-400">•</span>
                                <span>{name}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <span className="text-sm text-gray-500 block mb-3">Purpose of stay</span>
                    <div className="flex gap-2 text-base font-medium text-gray-900">
                        <span className="text-gray-400">•</span>
                        <p className="leading-snug max-w-md">{data.purpose_of_stay}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MealsDetails({ data }: { data: any }) {
    return (
        <div className="space-y-6">
            <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                    <div className="text-sm font-medium text-gray-900">{data.event_name}</div>
                    <div className="text-xs text-gray-500 mt-1">{data.venue}</div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-gray-100 pt-6">
                <InfoCard label="Date" value={data.meal_date} />
                <InfoCard label="Time" value={data.meal_time} />
                <InfoCard label="Pax" value={data.number_of_pax} />
                <InfoCard label="Type" value={data.meal_type} />
            </div>

            <div className="border-t border-gray-100 pt-6">
                <span className="text-xs text-gray-500 block mb-2">Special Requests</span>
                <p className="text-sm text-gray-900">{data.special_requests || "None"}</p>
            </div>
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DefaultDetails({ data }: { data: any }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Object.entries(data).map(([key, value]) => (
                <InfoCard
                    key={key}
                    label={key.replace(/_/g, " ")}
                    value={value}
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formData = request.form_data as any;

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
                        <InfoCard label="Budget" value={formatCurrency(formData.allocated_budget || formData.budget || formData.total_budget)} className="items-center md:items-start text-center md:text-left" />
                        <InfoCard label="Created" value={formatDateShort(request.created_at)} className="items-center md:items-start text-center md:text-left" />
                    </div>
                </div>

                {/* Category Details (Dynamic) */}
                <div className="px-1">
                    {request.category === "flight_booking" ? (
                        <FlightDetails data={formData} />
                    ) : request.category === "hotel_accommodation" ? (
                        <HotelDetails data={formData} />
                    ) : request.category === "meals" ? (
                        <MealsDetails data={formData} />
                    ) : (
                        <DefaultDetails data={formData} />
                    )}
                </div>

                {/* Footer Button */}
                <div className="flex justify-end mt-8 md:mt-12 bg-transparent">
                    <ExportButton 
                        targetId="request-printable-area" 
                        fileName={`REQ-${String(request.ticket_number).padStart(4, "0")}-Details`}
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
