"use client";

import { useState } from "react";
import {
  Check,
  Clock,
  FileText,
  MessageSquare,
  Activity,
  Send,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { addComment, updateRequestStatus } from "@/actions/request";

type SerializedRequest = {
  id: string;
  ticket_number: number;
  title: string;
  category: string;
  status: string;
  priority: string;
  form_data: unknown;
  remarks: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  requester: {
    full_name: string | null;
    email: string;
    position: string | null;
    department: string | null;
  } | null;
  branch: { name: string; code: string } | null;
  attachments: {
    id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    file_type: string;
    label: string | null;
    created_at: string;
  }[];
  comments: {
    id: string;
    content: string;
    created_at: string;
    user: { full_name: string | null; email: string } | null;
  }[];
  activityLogs: {
    id: string;
    action: string;
    previous_status: string | null;
    new_status: string | null;
    comment: string | null;
    created_at: string;
    actor: { full_name: string | null; email: string } | null;
  }[];
};

const statusBadgeColors: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  error: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  default: "bg-gray-100 text-gray-900",
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-900",
  medium: "bg-blue-100 text-blue-600",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

function WorkflowStepper({
  steps,
  currentStatus,
}: {
  steps: string[];
  currentStatus: string;
}) {
  // Map statuses to step indexes
  const statusStepMap: Record<string, number> = {
    open: 0,
    pending: 1,
    resolved: 2,
    cancelled: 2,
  };
  const currentStep = statusStepMap[currentStatus] ?? 0;
  const isRejected = currentStatus === "cancelled";

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                i < currentStep
                  ? "border-[#2F5E3D] bg-[#2F5E3D] text-white"
                  : i === currentStep && isRejected
                    ? "border-red-500 bg-red-500 text-white"
                    : i === currentStep
                      ? "border-[#2F5E3D] bg-[#2F5E3D]/10 text-[#2F5E3D]"
                      : "border-gray-300 bg-white text-gray-400"
              )}
            >
              {i < currentStep ? (
                <Check className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={cn(
                "mt-1.5 text-[10px] font-medium text-center whitespace-nowrap",
                i <= currentStep ? "text-[#2F5E3D]" : "text-gray-400"
              )}
            >
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "mx-2 h-0.5 flex-1",
                i < currentStep ? "bg-[#2F5E3D]" : "bg-gray-200"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function formatFormKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function RequestDetailView({
  request,
  statusConfig,
  workflowSteps,
  categoryLabel,
  userRole,
}: {
  request: SerializedRequest;
  statusConfig: Record<string, { label: string; variant: string }>;
  workflowSteps: string[];
  categoryLabel: string;
  userRole: "requester" | "admin" | "superadmin";
}) {
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const sCfg = statusConfig[request.status];
  const badgeColor = statusBadgeColors[sCfg?.variant ?? "default"];

  const formData = (request.form_data as Record<string, unknown>) ?? {};
  // Exclude meta fields we show separately
  const displayFields = Object.entries(formData).filter(
    ([key]) => !["title", "priority", "branch_id"].includes(key)
  );

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setIsSubmittingComment(true);
    try {
      await addComment(request.id, commentText);
      setCommentText("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      await updateRequestStatus(request.id, newStatus);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Workflow Progress */}
      <Card>
        <CardContent className="py-6">
          <WorkflowStepper
            steps={workflowSteps}
            currentStatus={request.status}
          />
        </CardContent>
      </Card>

      {/* Status + Meta */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="text-sm text-gray-500">Status</div>
            <span
              className={cn(
                "text-xs font-medium px-2.5 py-1 rounded-full",
                badgeColor
              )}
            >
              {sCfg?.label ?? request.status}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="text-sm text-gray-500">Priority</div>
            <span
              className={cn(
                "text-xs font-medium px-2.5 py-1 rounded-full capitalize",
                priorityColors[request.priority] ?? "bg-gray-100 text-gray-900"
              )}
            >
              {request.priority}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="text-sm text-gray-500">Category</div>
            <span className="text-xs font-medium text-[#2F5E3D] bg-[#2F5E3D]/10 px-2.5 py-1 rounded">
              {categoryLabel}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Requester + Branch info */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {request.requester && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">
                Requester
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm font-medium text-gray-900">
                {request.requester.full_name ?? request.requester.email}
              </p>
              {request.requester.position && (
                <p className="text-xs text-gray-500">
                  {request.requester.position}
                  {request.requester.department &&
                    ` | ${request.requester.department}`}
                </p>
              )}
            </CardContent>
          </Card>
        )}
        {request.branch && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">Branch</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm font-medium text-gray-900">
                {request.branch.name}
              </p>
              <p className="text-xs text-gray-500">{request.branch.code}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs: Details, Documents, Comments, Activity */}
      <Tabs defaultValue="details">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="details" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Details
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Documents ({request.attachments.length})
          </TabsTrigger>
          <TabsTrigger value="comments" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Comments ({request.comments.length})
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details">
          <Card>
            <CardContent className="p-6">
              {displayFields.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No additional details recorded.
                </p>
              ) : (
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {displayFields.map(([key, value]) => (
                    <div
                      key={key}
                      className={
                        typeof value === "string" && value.length > 80
                          ? "sm:col-span-2"
                          : ""
                      }
                    >
                      <dt className="text-xs font-medium text-gray-500">
                        {formatFormKey(key)}
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                        {String(value ?? "—")}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              {request.rejection_reason && request.status !== "resolved" && (
                <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-xs font-medium text-red-700 mb-1">
                    Rejection Reason
                  </p>
                  <p className="text-sm text-red-600">
                    {request.rejection_reason}
                  </p>
                </div>
              )}

              <div className="mt-6 flex items-center gap-2 text-xs text-gray-400">
                <Clock className="h-3.5 w-3.5" />
                Created{" "}
                {new Date(request.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardContent className="p-6">
              {request.attachments.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No documents uploaded.
                </p>
              ) : (
                <div className="space-y-3">
                  {request.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
                    >
                      <FileText className="h-5 w-5 text-red-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {att.file_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {att.label && `${att.label} — `}
                          {(att.file_size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(att.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments">
          <Card>
            <CardContent className="p-6 space-y-4">
              {request.comments.length === 0 && (
                <p className="text-sm text-gray-500">No comments yet.</p>
              )}

              {request.comments.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {c.user?.full_name ?? c.user?.email ?? "Unknown"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(c.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {c.content}
                  </p>
                </div>
              ))}

              {/* Add comment form */}
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleAddComment}
                    disabled={isSubmittingComment || !commentText.trim()}
                  >
                    <Send className="mr-2 h-3.5 w-3.5" />
                    {isSubmittingComment ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardContent className="p-6">
              {request.activityLogs.length === 0 ? (
                <p className="text-sm text-gray-500">No activity recorded.</p>
              ) : (
                <div className="space-y-0">
                  {request.activityLogs.map((log, i) => (
                    <div key={log.id} className="flex gap-3">
                      {/* Timeline */}
                      <div className="flex flex-col items-center">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2F5E3D]/10">
                          <Activity className="h-3 w-3 text-[#2F5E3D]" />
                        </div>
                        {i < request.activityLogs.length - 1 && (
                          <div className="w-px flex-1 bg-gray-200 my-1" />
                        )}
                      </div>
                      {/* Content */}
                      <div className="pb-4 min-w-0 flex-1">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">
                            {log.actor?.full_name ?? log.actor?.email ?? "System"}
                          </span>{" "}
                          <span className="text-gray-900">
                            {log.action.replace(/_/g, " ")}
                          </span>
                          {log.new_status && (
                            <>
                              {" "}
                              <span className="font-medium">
                                {log.new_status.replace(/_/g, " ")}
                              </span>
                            </>
                          )}
                        </p>
                        {log.comment && (
                          <p className="text-xs text-gray-500 mt-1">
                            &ldquo;{log.comment}&rdquo;
                          </p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {new Date(log.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Admin actions (for non-cancelled requests) */}
      {userRole !== "requester" && !["cancelled"].includes(request.status) && (
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-3">
            {request.status === "open" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange("pending")}
                disabled={isUpdatingStatus}
              >
                Start Review
              </Button>
            )}
            {["open", "pending"].includes(request.status) && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleStatusChange("resolved")}
                  disabled={isUpdatingStatus}
                >
                  Resolve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleStatusChange("cancelled")}
                  disabled={isUpdatingStatus}
                >
                  Cancel
                </Button>
              </>
            )}
            {request.status === "resolved" && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleStatusChange("pending")}
                disabled={isUpdatingStatus}
              >
                Reopen
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
