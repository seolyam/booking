"use client";

import { FileText } from "lucide-react";

interface ReviewerAssessmentCardProps {
    reviewerName: string;
    comment: string;
}

export default function ReviewerAssessmentCard({
    reviewerName,
    comment,
}: ReviewerAssessmentCardProps) {
    return (
        <div className="bg-blue-50/50 rounded-2xl border border-blue-100 p-8 space-y-4">
            <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-700" />
                <h2 className="text-lg font-bold text-blue-900">Reviewer&apos;s Assessment</h2>
            </div>

            <div className="space-y-1">
                <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                    Reviewed by {reviewerName}
                </p>
                <p className="text-sm text-blue-800 font-medium leading-relaxed italic">
                    &ldquo;{comment}&rdquo;
                </p>
            </div>
        </div>
    );
}
