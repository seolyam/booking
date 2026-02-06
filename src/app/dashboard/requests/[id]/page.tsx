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
  MessageSquare,
  Ban,
  Archive,
} from "lucide-react";
import { getRequestById } from "@/actions/request";
import {
  CATEGORY_MAP,
} from "@/db/schema";
import WorkflowProgress, {
  type WorkflowEvent,
  type WorkflowStep,
} from "./_components/WorkflowProgress";
import { cn } from "@/lib/utils";
import ApprovalActions from "./_components/ApprovalActions";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import { db } from "@/db";
import { adminBranches } from "@/db/schema";
import { eq } from "drizzle-orm";

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

function formatDateTime(input: Date | string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(input));
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
        label: "Approved",
        cls: "bg-green-100 text-green-700 border-green-200",
        icon: <CheckCircle2 className="h-4 w-4" />,
      };
    case "rejected":
      return {
        label: "Rejected",
        cls: "bg-red-100 text-red-700 border-red-200",
        icon: <XCircle className="h-4 w-4" />,
      };
    case "closed":
      return {
        label: "Closed",
        cls: "bg-gray-100 text-gray-700 border-gray-200",
        icon: <Archive className="h-4 w-4" />,
      };
    case "on_hold":
      return {
        label: "On Hold",
        cls: "bg-orange-100 text-orange-700 border-orange-200",
        icon: <AlertCircle className="h-4 w-4" />,
      };
    case "pending_review":
      return {
        label: "Pending Review",
        cls: "bg-blue-100 text-blue-700 border-blue-200",
        icon: <Clock className="h-4 w-4" />,
      };
    case "submitted":
      return {
        label: "Submitted",
        cls: "bg-yellow-100 text-yellow-700 border-yellow-200",
        icon: <CheckCircle2 className="h-4 w-4" />,
      };
    default: // draft
      return {
        label: "Draft",
        cls: "bg-gray-100 text-gray-600 border-gray-200",
        icon: <FileText className="h-4 w-4" />,
      };
  }
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    created: "Request Created",
    submitted: "Submitted",
    status_changed: "Status Updated",
    comment_added: "Comment Added",
    file_uploaded: "File Uploaded",
    approved: "Approved",
    rejected: "Rejected",
    closed: "Closed",
    reopened: "Reopened",
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
    { key: "draft", label: "Draft" },
    { key: "submitted", label: "Submitted" },
    { key: "pending_review", label: "Review" },
    { key: "approved", label: "Approved" },
  ];

  let activeIndex = 0;
  if (status === "draft") activeIndex = 0;
  else if (status === "submitted") activeIndex = 1;
  else if (status === "pending_review" || status === "on_hold") activeIndex = 2;
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
function DataField({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 break-words">{String(value)}</span>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FlightDetails({ data }: { data: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <DataField label="Passenger Name" value={data.passenger_name} />
      <DataField label="Number of Passengers" value={data.number_of_passengers} />
      <DataField label="Departure From" value={data.departure_from} />
      <DataField label="Destination" value={data.destination} />
      <DataField label="Dates" value={`${data.departure_date} to ${data.return_date || "?"}`} />
      <DataField label="Travel Class" value={data.travel_class} />
      <DataField label="Allocated Budget" value={formatCurrency(data.allocated_budget)} />
      <div className="md:col-span-2">
        <DataField label="Purpose of Travel" value={data.purpose_of_travel} />
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HotelDetails({ data }: { data: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <DataField label="Hotel Name" value={data.hotel_name} />
      <DataField label="Address" value={data.hotel_address} />
      <DataField label="Check-in" value={data.check_in_date} />
      <DataField label="Check-out" value={data.check_out_date} />
      <DataField label="Rooms" value={data.number_of_rooms} />
      <DataField label="Guests" value={data.number_of_guests} />
      <DataField label="Allocated Budget" value={formatCurrency(data.allocated_budget)} />
      <div className="md:col-span-2">
        <DataField label="Guest Names" value={data.guest_names} />
      </div>
      <div className="md:col-span-2">
        <DataField label="Purpose of Stay" value={data.purpose_of_stay} />
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MealsDetails({ data }: { data: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <DataField label="Event/Occasion" value={data.event_name} />
      <DataField label="Venue" value={data.venue} />
      <DataField label="Date & Time" value={`${data.meal_date} ${data.meal_time || ""}`} />
      <DataField label="Pax" value={data.number_of_pax} />
      <DataField label="Meal Type" value={data.meal_type} />
      <DataField label="Allocated Budget" value={formatCurrency(data.allocated_budget)} />
      <div className="md:col-span-2">
        <DataField label="Special Requests" value={data.special_requests} />
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RoomDetails({ data }: { data: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <DataField label="Room/Space" value={data.room_name} />
      <DataField label="Date" value={data.reservation_date} />
      <DataField label="Time" value={`${data.start_time} - ${data.end_time}`} />
      <DataField label="Attendees" value={data.number_of_attendees} />
      <div className="md:col-span-2">
        <DataField label="Purpose" value={data.purpose} />
      </div>
      <div className="md:col-span-2">
        <DataField label="Equipment Needed" value={data.equipment_needed} />
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DefaultDetails({ data }: { data: any }) {
  // Generic renderer for other categories
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Object.entries(data).map(([key, value]) => (
        <DataField
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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const appUser = await getOrCreateAppUserFromAuthUser({
    id: user.id,
    email: user.email ?? null,
    user_metadata: (user.user_metadata ?? null) as Record<string, unknown> | null,
  });

  const request = await getRequestById(id);
  if (!request) notFound();

  // Determine if user can approve/reject
  let canApprove = false;
  if ((appUser.role === "admin" || appUser.role === "superadmin")) {
    const actionableStatuses = ["submitted", "pending_review", "on_hold"];
    if (actionableStatuses.includes(request.status)) {
        if (appUser.role === "superadmin") {
            canApprove = true;
        } else {
            // Check branch assignment
            const assignments = await db.query.adminBranches.findMany({
                where: eq(adminBranches.admin_id, appUser.id),
            });
            const branchIds = assignments.map((a) => a.branch_id);
            if (branchIds.includes(request.branch_id)) {
                canApprove = true;
            }
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/requests"
          className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Request Tracking</h1>
          <div className="text-sm text-gray-500">
            Monitor the status and details of your request
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="rounded-3xl bg-white p-6 md:p-8 shadow-sm ring-1 ring-black/5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Request Details (66%) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header: Title + ID + Status */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold text-gray-900 break-words">
                    {request.title}
                  </h2>
                  <span className="inline-flex items-center rounded-md bg-cyan-100 px-2 py-0.5 text-xs font-bold text-cyan-800 uppercase">
                    {CATEGORY_MAP[request.category]?.code || "REQ"}
                  </span>
                </div>
                <div className="text-sm font-mono text-gray-500">
                  REQ-{String(request.ticket_number).padStart(4, "0")}
                </div>
              </div>

              <div
                className={cn(
                  "self-start inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-wide border",
                  status.cls,
                )}
              >
                {status.icon}
                {status.label}
              </div>
            </div>

            {/* Section Header: Info + Priority */}
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-gray-900">
                Request Information
              </h3>
              <span
                className={cn(
                  "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium uppercase",
                  request.priority === "urgent"
                    ? "bg-red-100 text-red-800"
                    : request.priority === "high"
                    ? "bg-orange-100 text-orange-800"
                    : request.priority === "medium"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800",
                )}
              >
                {request.priority} Priority
              </span>
            </div>

            {/* Data Grid */}
            <div className="bg-gray-50 rounded-2xl p-6">
              {/* Common Fields Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 border-b border-gray-200 pb-6">
                <DataField label="Allocated Budget" value={formatCurrency(formData.allocated_budget || formData.budget || formData.total_budget)} />
                <DataField label="Requester" value={request.requester.full_name || request.requester.email} />
                <DataField label="Created Date" value={formatDateShort(request.created_at)} />
              </div>

              {/* Category Specific Fields */}
              {request.category === "flight_booking" ? (
                <FlightDetails data={formData} />
              ) : request.category === "hotel_accommodation" ? (
                <HotelDetails data={formData} />
              ) : request.category === "meals" ? (
                <MealsDetails data={formData} />
              ) : request.category === "room_reservation" ? (
                <RoomDetails data={formData} />
              ) : (
                <DefaultDetails data={formData} />
              )}
            </div>

            {request.remarks && (
              <div className="mt-4">
                <h4 className="text-sm font-bold text-gray-900 mb-2">Additional Remarks</h4>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-xl">{request.remarks}</p>
              </div>
            )}
            {request.rejection_reason && (
               <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-4">
                <h4 className="text-sm font-bold text-red-900 mb-1 flex items-center gap-2">
                   <Ban className="h-4 w-4"/> Rejection Reason
                </h4>
                <p className="text-red-800">{request.rejection_reason}</p>
              </div>
            )}

            {/* Footer Action */}
            <div>
              <button className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                Export Details
              </button>
            </div>

             {/* Comments Section (Moved to Left Column bottom as per typical 'details' flow, or keep split?
                 Instruction didn't specify comments placement, but 'Request Details' usually implies the main data.
                 I'll put comments below details for better flow in 66% width) */}
            <div className="pt-8 border-t border-gray-100">
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
                        <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 rounded-tl-none">
                          {comment.content}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Widgets (33%) */}
          <div className="space-y-6">
            {/* Widget 1: Activity Timeline */}
            <div className="rounded-xl border border-gray-200 p-5 shadow-sm">
              <WorkflowProgress steps={steps} events={events} />
            </div>

            {/* Widget 2: Attachments */}
            <div className="rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  Attachments
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                    {request.attachments.length}
                  </span>
                </h3>
                <button className="text-xs font-semibold text-gray-500 hover:text-gray-900 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                  Download All
                </button>
              </div>

              {request.attachments.length === 0 ? (
                <div className="text-sm text-gray-500 italic">No attachments.</div>
              ) : (
                <ul className="space-y-3">
                  {request.attachments.map((file) => (
                    <li
                      key={file.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 p-3 bg-white hover:border-gray-300 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-xs text-gray-900">
                            {file.file_name}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {(file.file_size / 1024).toFixed(0)} KB
                          </div>
                        </div>
                      </div>
                      <a
                        href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/attachments/${file.file_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-gray-900"
                      >
                        <ArrowLeft className="h-4 w-4 rotate-135" /> {/* Use rotate for external link look or just eye */}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Admin Actions Widget (Moved to right col for better visibility) */}
            {canApprove && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
                    <h3 className="font-bold text-blue-900 mb-3">Actions</h3>
                    <ApprovalActions requestId={request.id} />
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
