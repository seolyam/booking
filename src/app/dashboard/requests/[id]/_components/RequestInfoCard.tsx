"use client";

import { cn } from "@/lib/utils";
import { Ban, MessageSquare } from "lucide-react";
import dynamic from "next/dynamic";
import type { Request, Comment, FieldSchema } from "@/db/schema";
import { formatDateTime, formatCurrency } from "@/lib/utils";

const ExportButton = dynamic(() => import("./ExportButton"), { ssr: false });

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

/**
 * Dynamic detail renderer that uses form config fields to decode
 * dynamic field IDs (e.g. "field_177...") back to human-readable labels.
 * Falls back to key-based rendering when no config is available.
 */
function DynamicDetails({
    data,
    configFields,
}: {
    data: Record<string, unknown>;
    configFields?: FieldSchema[];
}) {
    // Keys to exclude from rendering (already shown elsewhere in the card)
    const excludeKeys = new Set(["title", "branch_id", "priority", "status"]);

    if (configFields && configFields.length > 0) {
        // Config-driven: iterate over config fields and look up values by field name/ID
        const renderedKeys = new Set<string>();

        const configEntries = configFields
            .filter((f) => f.enabled !== false)
            .map((field) => {
                const value = data[field.name];
                renderedKeys.add(field.name);
                return { label: field.label, value, key: field.name };
            });

        // Also render any data keys that aren't in the config (in case data has extra fields)
        const extraEntries = Object.entries(data)
            .filter(([key]) => !renderedKeys.has(key) && !excludeKeys.has(key))
            .map(([key, value]) => ({
                label: key.replace(/_/g, " "),
                value,
                key,
            }));

        const allEntries = [...configEntries, ...extraEntries];

        return (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {allEntries.map((entry) => (
                    <InfoCard
                        key={entry.key}
                        label={entry.label}
                        value={entry.value as string | number | null | undefined}
                    />
                ))}
            </div>
        );
    }

    // Fallback: no config available, render all keys with prettified labels
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {Object.entries(data)
                .filter(([key]) => !excludeKeys.has(key))
                .map(([key, value]) => (
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
    configFields?: FieldSchema[];
}

export default function RequestInfoCard({ request, hideComments = false, configFields }: RequestInfoCardProps) {
    const formData = (request.form_data as Record<string, unknown>) ?? {};
    const budget = (formData.allocated_budget ?? formData.budget ?? formData.total_budget) as string | number | null | undefined;

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
                        <InfoCard label="Created" value={formatDateShort(request.created_at)} className="items-center md:items-start text-center md:text-left" />
                    </div>
                </div>

                {/* Category Details (Dynamic) */}
                <div className="px-1">
                    <DynamicDetails data={formData} configFields={configFields} />
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
