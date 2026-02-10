"use client";

import { MessageSquare } from "lucide-react";
import type { Comment } from "@/db/schema";
import { formatDateTime } from "@/lib/utils";

interface RequestCommentsProps {
    comments: (Comment & { user: { full_name: string | null; email: string } | null })[];
}

export default function RequestComments({ comments }: RequestCommentsProps) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h3 className="font-bold text-gray-900 mb-2">Comments</h3>
            <div className="space-y-4">
                {comments.length === 0 ? (
                    <div className="text-sm text-gray-500 italic py-2">No comments yet.</div>
                ) : (
                    comments.map((comment) => (
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
                                <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 rounded-tl-none italic leading-relaxed">
                                    "{comment.content}"
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
