import { getAuthUser } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  Ban,
  Archive,
  Bell,
  MapPin,
  Building2,
} from "lucide-react";
import { getRequestById, updateRequestStatus } from "@/actions/request";
import {
  CATEGORY_MAP,
} from "@/db/schema";
import WorkflowProgress, {
  type WorkflowEvent,
  type WorkflowStep,
} from "./_components/WorkflowProgress";
import { cn } from "@/lib/utils";
import ApprovalActions from "./_components/ApprovalActions";
import AttachmentHandler from "./_components/AttachmentHandler";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import { db } from "@/db";
import { adminBranches } from "@/db/schema";
import { eq } from "drizzle-orm";
import RequestComments from "./_components/RequestComments";
import RequestInfoCard from "./_components/RequestInfoCard";
import ReviewDecisionPanel from "./_components/ReviewDecisionPanel";
import ExportButton from "./_components/ExportButton";

export const dynamic = "force-dynamic";

// ============================================================================
// Helpers
// ============================================================================

function formatDateShort(input: Date | string) {
  const d = new Date(input);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${mm}-${dd}-${yyyy}`;
}

function formatCurrency(amount: number | string | null | undefined) {
  if (!amount) return "—";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(amount));
}

function statusMeta(status: string) {
  switch (status) {
    case "approved":
      return {
        label: "Resolved",
        cls: "bg-green-50 text-green-700 border-green-100",
        icon: <CheckCircle2 className="h-4 w-4" />,
      };
    case "rejected":
      return {
        label: "Rejected",
        cls: "bg-red-50 text-red-700 border-red-100",
        icon: <XCircle className="h-4 w-4" />,
      };
    case "closed":
      return {
        label: "Closed",
        cls: "bg-gray-50 text-gray-900 border-gray-100",
        icon: <Archive className="h-4 w-4" />,
      };
    case "on_hold":
      return {
        label: "On Hold",
        cls: "bg-orange-50 text-orange-700 border-orange-100",
        icon: <AlertCircle className="h-4 w-4" />,
      };
    case "reviewed":
      return {
        label: "Reviewed",
        cls: "bg-purple-50 text-purple-700 border-purple-100",
        icon: <CheckCircle2 className="h-4 w-4" />,
      };
    case "pending_review":
      return {
        label: "Pending",
        cls: "bg-blue-50 text-blue-700 border-blue-100",
        icon: <Clock className="h-4 w-4" />,
      };
    case "submitted":
      return {
        label: "Open",
        cls: "bg-yellow-50 text-yellow-700 border-yellow-100",
        icon: <CheckCircle2 className="h-4 w-4" />,
      };
    default: // draft
      return {
        label: "Draft",
        cls: "bg-gray-50 text-gray-900 border-gray-100",
        icon: <FileText className="h-4 w-4" />,
      };
  }
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    created: "Created",
    submitted: "Submitted",
    status_changed: "Status Updated",
    comment_added: "Comment Added",
    file_uploaded: "File Uploaded",
    approved: "Resolved",
    rejected: "Rejected",
    closed: "Closed",
    reopened: "Reopened",
    reviewed: "Reviewed",
  };
  // Handle dynamic status change labels
  if (action.startsWith("status_changed_to_")) {
    const status = action.replace("status_changed_to_", "");
    return `Status Changed to ${status.replace(/_/g, " ")}`;
  }
  return map[action] || action.replace(/_/g, " ");
}

function computeSteps(status: string): WorkflowStep[] {
  const steps: Array<{ key: string; label: string }> = [
    { key: "created", label: "Created" },
    { key: "submitted", label: "Open" },
    { key: "reviewed", label: "Pending" },
    { key: "approved", label: "Resolved" },
  ];

  let activeIndex = 0;
  if (status === "draft") activeIndex = 0;
  else if (status === "submitted" || status === "pending_review") activeIndex = 1;
  else if (status === "reviewed" || status === "on_hold") activeIndex = 2;
  else if (status === "approved" || status === "rejected" || status === "closed") activeIndex = 3;

  // Handle terminal states label overrides
  if (activeIndex === 3) {
    if (status === "rejected") steps[3] = { ...steps[3], label: "Rejected" };
    else if (status === "closed") steps[3] = { ...steps[3], label: "Closed" };
  }

  return steps.map((s, idx) => {
    if (idx < activeIndex) return { ...s, state: "done" as const };
    if (idx === activeIndex) {
      return {
        ...s,
        state: "current" as const,
        statusType: status,
      };
    }
    return { ...s, state: "todo" as const };
  });
}

// ============================================================================
// Main Page
// ============================================================================

export default async function RequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const { mode } = await searchParams || {};

  const user = await getAuthUser();
  if (!user) redirect("/login");

  const appUser = await getOrCreateAppUserFromAuthUser({
    id: user.id,
    email: user.email ?? null,
    user_metadata: (user.user_metadata ?? null) as Record<string, unknown> | null,
  });

  const request = await getRequestById(id);
  if (!request) notFound();

  // Permissions Check & Auto-Transition
  let hasBranchAccess = false;
  let canApprove = false;
  const isAdmin = appUser.role === "admin" || appUser.role === "superadmin";

  if (isAdmin) {
    const actionableStatuses = ["submitted", "pending_review", "on_hold", "reviewed"];

    // Check branch assignment
    if (appUser.role === "superadmin") {
      hasBranchAccess = true;
    } else {
      const assignments = await db.query.adminBranches.findMany({
        where: eq(adminBranches.admin_id, appUser.id),
      });
      const branchIds = assignments.map((a) => a.branch_id);
      if (branchIds.includes(request.branch_id)) {
        hasBranchAccess = true;
      }
    }

    if (hasBranchAccess) {
      // Auto-transition: If View status is 'Open' (submitted), change to 'Pending' (pending_review)
      if (request.status === "submitted") {
        await updateRequestStatus(request.id, "pending_review", "Request viewed by admin - status updated to Pending");
        redirect(`/dashboard/requests/${request.id}`); // Reload to reflect change
      }

      if (actionableStatuses.includes(request.status)) {
        canApprove = true;
      }
    }
  }

  const status = statusMeta(request.status);
  const steps = computeSteps(request.status);

  const events: WorkflowEvent[] = request.activityLogs.map((log) => ({
    id: log.id,
    at: formatDateShort(log.created_at),
    title: actionLabel(log.action),
    description: log.comment || "",
    actorName: log.actor?.full_name || log.actor?.email,
    note: null,
    action: log.action,
  }));

  // Determine if this is a Review View (Admin/Superadmin && (Actionable Status OR Explicit Review Mode))
  const isReviewMode = canApprove || (isAdmin && hasBranchAccess && mode === "review");

  // Common Header & Content Structure for both views to ensure matching design
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/requests"
            className="rounded-full p-2 text-gray-400 hover:bg-white hover:text-gray-900 transition-colors hover:shadow-sm"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isReviewMode ? "Request Review" : "Request Tracking"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isReviewMode
                ? "Review and verify request details before approving"
                : "Track the complete lifecycle and history of this booking request"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Manage Request Button for Admins (Only visible in Tracking View) */}
          {!isReviewMode && isAdmin && hasBranchAccess && (
            <Link
              href={`/dashboard/requests/${id}?mode=review`}
              className="bg-gray-700 hover:bg-gray-800 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
            >
              Manage Request
            </Link>
          )}
          <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-100">
            <Bell className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Title & Status Section (Common for both) */}
      <div className="mb-8 px-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-gray-900">{request.title}</h2>
            <span className="bg-cyan-100 text-cyan-700 text-xs font-bold px-2 py-1 rounded uppercase">
              {CATEGORY_MAP[request.category]?.code || "REQ"}
            </span>
          </div>
          {/* Status Badge (Only show here for Tracking View, Review View might implement it differently or doesn't show it in header) 
                Wait, the previous Review View didn't show status badge in Title Section. 
                Tracking View mockup showed it. 
                Let's include it for Tracking View. 
            */}
          {!isReviewMode && (
            <div className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border",
              status.cls
            )}>
              {status.icon}
              {status.label}
            </div>
          </div>

          {/* Subtitle */}
          <div className="text-sm text-gray-500 mb-8">
            REQ-{String(request.ticket_number).padStart(4, "0")} - {CATEGORY_MAP[request.category]?.label}
          </div>

          {/* Main Info Block */}
          <div id="request-printable-area" className="bg-gray-50 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <h3 className="font-bold text-gray-900">Request Information</h3>
              {request.priority === "urgent" && (
                <span className="bg-orange-200 text-orange-800 text-xs font-bold px-2 py-0.5 rounded">Urgent</span>
              )}
            </div>

            {/* Primary Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              <InfoCard label="Requester" value={request.requester.full_name || request.requester.email} />
              <InfoCard label="Branch" value={request.branch?.name || "Main Branch"} />
              <InfoCard label="Budget" value={formatCurrency(formData.allocated_budget || formData.budget || formData.total_budget)} />
              <InfoCard label="Created" value={formatDateShort(request.created_at)} />
            </div>

            {/* Category Details (Address, dates, etc.) */}
            <div className="border-t border-gray-200 pt-6">
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

            {/* Footer Button inside card? No, usually outside or bottom right. Design shows "Export Details" bottom right of this panel */}
            <div className="flex justify-end mt-8">
              <ExportButton 
                targetId="request-printable-area" 
                fileName={`REQ-${String(request.ticket_number).padStart(4, "0")}-Details`}
              />
            </div>
          </div>

          {request.remarks && (
            <div className="mt-4">
              <h4 className="text-sm font-bold text-gray-900 mb-2">Additional Remarks</h4>
              <p className="text-gray-900 bg-gray-50 p-4 rounded-xl text-sm">{request.remarks}</p>
            </div>
          )}
          {request.rejection_reason && (
            <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-4">
              <h4 className="text-sm font-bold text-red-900 mb-1 flex items-center gap-2">
                <Ban className="h-4 w-4" /> Rejection Reason
              </h4>
              <p className="text-red-800 text-sm">{request.rejection_reason}</p>
            </div>
          )}
        </div>

        <div className="text-sm text-gray-500">
          REQ-{String(request.ticket_number).padStart(4, "0")} - {CATEGORY_MAP[request.category]?.label}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Request Info */}
        <div className="lg:col-span-8">
          <RequestInfoCard request={request} hideComments={true} />
        </div>

        {/* Right Column: Widgets */}
        <div className="lg:col-span-4 space-y-6">
          {/* Timeline (Only for Tracking, unless Review also needs it? Review usually focuses on decision) */}
          {!isReviewMode && <WorkflowProgress steps={steps} events={events} />}

          {/* Attachments */}
          <AttachmentHandler attachments={request.attachments} requestTicketNumber={request.ticket_number} />

          {/* Review Decision Panel (Only for Review Mode) */}
          {isReviewMode && (
            <div className="mt-8">
              <ReviewDecisionPanel requestId={request.id} currentStatus={request.status} />
            </div>
          )}

          {/* Approval Actions (Conditional - Old way, kept for backward compat if ReviewDecisionPanel isn't fully replacing yet, 
              but ReviewDecisionPanel is the new standard for Review Mode. 
              The 'canApprove' logic handled this earlier. 
              If canApprove is true, we are in Review Mode. 
              So we use ReviewDecisionPanel.
          */}

          {/* Actions for Tracking Mode (Non-Review, but Admin might see something? No, Manage Request handles that) */}

          {/* Comments Section */}
          <div className="mt-6">
            <RequestComments comments={request.comments} />
          </div>
        </div>
      </div>
    </div>
  );
}
