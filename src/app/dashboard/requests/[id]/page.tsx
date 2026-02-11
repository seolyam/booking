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
  MapPin,
  Building2,
  Pencil,
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
import ResubmitPanel from "./_components/ResubmitPanel";
import ExportButton from "./_components/ExportButton";
import ReopenButton from "./_components/ReopenButton";

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
    case "needs_revision":
      return {
        label: "Needs Revision",
        cls: "bg-amber-50 text-amber-700 border-amber-100",
        icon: <AlertCircle className="h-4 w-4" />,
      };
    case "resubmitted":
      return {
        label: "Resubmitted",
        cls: "bg-indigo-50 text-indigo-700 border-indigo-100",
        icon: <CheckCircle2 className="h-4 w-4" />,
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
    resubmitted: "Resubmitted",
    status_changed: "Status Updated",
    comment_added: "Comment Added",
    file_uploaded: "File Uploaded",
    approved: "Resolved",
    rejected: "Rejected",
    closed: "Closed",
    reopened: "Reopened",
    reviewed: "Reviewed",
    needs_revision: "Revision Requested",
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
  else if (status === "submitted" || status === "pending_review" || status === "resubmitted") activeIndex = 1;
  else if (status === "reviewed" || status === "on_hold" || status === "needs_revision") activeIndex = 2;
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
// Form Data Renderers
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function InfoCard({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined || value === "") return <div className="flex flex-col"><span className="text-xs text-gray-400">{label}</span><span className="text-sm font-medium text-gray-900">—</span></div>;
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-500 mb-1">{label}</span>
      <span className="text-sm font-semibold text-gray-900 break-words">{String(value)}</span>
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
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
        <div>
          <div className="text-sm font-medium text-gray-900">{data.hotel_name}</div>
          <div className="text-xs text-gray-500 mt-1">{data.hotel_address}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-gray-100 pt-6">
        <InfoCard label="Check-in" value={data.check_in_date} />
        <InfoCard label="Check-out" value={data.check_out_date} />
        <InfoCard label="Guests" value={data.number_of_guests} />
        <InfoCard label="Rooms" value={data.number_of_rooms} />
      </div>

      <div className="border-t border-gray-100 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <span className="text-xs text-gray-500 block mb-2">Name of guest(s)</span>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{data.guest_names}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500 block mb-2">Purpose of stay</span>
            <p className="text-sm text-gray-900">{data.purpose_of_stay}</p>
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
    const actionableStatuses = ["submitted", "pending_review", "on_hold", "reviewed", "resubmitted", "needs_revision"];

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
      // Auto-transition: If status is 'Open' (submitted) or 'Resubmitted', change to 'Pending' (pending_review)
      if (request.status === "submitted" || request.status === "resubmitted") {
        const msg = request.status === "resubmitted"
          ? "Resubmitted request viewed by admin - status updated to Pending"
          : "Request viewed by admin - status updated to Pending";
        await updateRequestStatus(request.id, "pending_review", msg, true);
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formData = request.form_data as any;

  // Determine if this is a Review View (Admin/Superadmin && Explicit Review Mode)
  // We strictly check for mode === "review" now, so default view is always Tracking
  const isReviewMode = isAdmin && hasBranchAccess && mode === "review";

  // Determine if the current user is the requester viewing their own request
  const isRequester = appUser.id === request.requester_id;
  const canResubmit = isRequester && request.status === "needs_revision";

  // Get the latest revision reason from activity logs
  const latestRevisionLog = request.activityLogs.find(
    (log) => log.new_status === "needs_revision"
  );
  const revisionReason = latestRevisionLog?.comment ?? null;

  // Common Header & Content Structure for both views to ensure matching design
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          <Link
            href="/dashboard/requests"
            className="rounded-full p-2 text-gray-400 hover:bg-white hover:text-gray-900 transition-colors hover:shadow-sm shrink-0"
          >
            <ArrowLeft className="h-5 w-5 md:h-6 md:w-6" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              {isReviewMode ? "Request Review" : "Request Tracking"}
            </h1>
            <p className="text-xs md:text-sm text-gray-500 mt-1 line-clamp-2">
              {isReviewMode
                ? "Review and verify request details before approving"
                : "Track the complete lifecycle and history of this booking request"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {/* Manage Form Button for Admins */}
          {!isReviewMode && isAdmin && hasBranchAccess && (
            <Link
              href={`/dashboard/requests/${id}/edit`}
              className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs md:text-sm font-bold px-3 md:px-4 py-2 rounded-lg transition-colors min-h-[44px] flex items-center gap-2"
            >
              <Pencil className="h-4 w-4" /> Manage Form
            </Link>
          )}

          {/* Manage Request or Reopen Button for Admins */}
          {!isReviewMode && isAdmin && hasBranchAccess && (
            request.status === "approved" ? (
              <ReopenButton requestId={id} />
            ) : (
              <Link
                href={`/dashboard/requests/${id}?mode=review`}
                className="bg-gray-700 hover:bg-gray-800 text-white text-xs md:text-sm font-bold px-3 md:px-4 py-2 rounded-lg transition-colors min-h-[44px] flex items-center"
              >
                Manage Request
              </Link>
            )
          )}
        </div>
      </div>

      {/* Title & Status Section (Common for both) */}
      <div className="mb-4 md:mb-8 px-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 break-words">{request.title}</h2>
            <span className="bg-cyan-100 text-cyan-700 text-xs font-bold px-2 py-1 rounded uppercase shrink-0">
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
          )}
        </div>

        {/* Subtitle */}
        <div className="text-xs md:text-sm text-gray-500 mb-4 md:mb-8">
          REQ-{String(request.ticket_number).padStart(4, "0")} - {CATEGORY_MAP[request.category]?.label}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* Left Column: Request Info */}
        <div className="lg:col-span-8">
          <RequestInfoCard request={request} hideComments={true} />
        </div>

        {/* Right Column: Widgets */}
        <div className="lg:col-span-4 space-y-6">
          {/* Timeline (Only for Tracking, unless Review also needs it? Review usually focuses on decision) */}
          {!isReviewMode && <WorkflowProgress steps={steps} events={events} />}

          {/* Resubmit Panel (Requester sees this when status is needs_revision) */}
          {canResubmit && (
            <ResubmitPanel requestId={request.id} revisionReason={revisionReason} />
          )}

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
    </div >
  );
}
