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
  Bell,
  Download,
  MapPin,
  Calendar,
  Users,
  Building2,
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
        cls: "bg-gray-50 text-gray-700 border-gray-100",
        icon: <Archive className="h-4 w-4" />,
      };
    case "on_hold":
      return {
        label: "On Hold",
        cls: "bg-orange-50 text-orange-700 border-orange-100",
        icon: <AlertCircle className="h-4 w-4" />,
      };
    case "pending_review":
      return {
        label: "Pending Review",
        cls: "bg-blue-50 text-blue-700 border-blue-100",
        icon: <Clock className="h-4 w-4" />,
      };
    case "submitted":
      return {
        label: "Submitted",
        cls: "bg-yellow-50 text-yellow-700 border-yellow-100",
        icon: <CheckCircle2 className="h-4 w-4" />,
      };
    default: // draft
      return {
        label: "Draft",
        cls: "bg-gray-50 text-gray-600 border-gray-100",
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
    approved: "Approved",
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
    { key: "submitted", label: "Submitted" },
    { key: "pending_review", label: "Reviewed" },
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
    <div className="max-w-[1600px] mx-auto p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
           <Link
            href="/dashboard/requests"
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Request Tracking</h1>
            <p className="text-sm text-gray-500 mt-1">
              Track the complete lifecycle and history of this booking request
            </p>
          </div>
        </div>
        <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-100">
           <Bell className="h-6 w-6" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Request Details */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm ring-1 ring-gray-100">
             {/* Title Row */}
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-3">
                   <h2 className="text-2xl font-bold text-gray-900">{request.title}</h2>
                   <span className="bg-cyan-100 text-cyan-700 text-xs font-bold px-2 py-1 rounded uppercase">
                      {CATEGORY_MAP[request.category]?.code || "REQ"}
                   </span>
                </div>
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
             <div className="bg-gray-50 rounded-2xl p-6 mb-8">
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
                    <button className="flex items-center gap-2 bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
                       <Download className="h-4 w-4" /> Export Details
                    </button>
                 </div>
             </div>

             {request.remarks && (
               <div className="mt-4">
                 <h4 className="text-sm font-bold text-gray-900 mb-2">Additional Remarks</h4>
                 <p className="text-gray-700 bg-gray-50 p-4 rounded-xl text-sm">{request.remarks}</p>
               </div>
             )}
             {request.rejection_reason && (
                <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-4">
                 <h4 className="text-sm font-bold text-red-900 mb-1 flex items-center gap-2">
                    <Ban className="h-4 w-4"/> Rejection Reason
                 </h4>
                 <p className="text-red-800 text-sm">{request.rejection_reason}</p>
               </div>
             )}
        </div>

        {/* Right Column: Widgets */}
        <div className="space-y-6">
           {/* Timeline */}
           <WorkflowProgress steps={steps} events={events} />

           {/* Attachments */}
           <div className="bg-white rounded-xl shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-sm font-semibold text-gray-900">Attachments ({request.attachments.length})</h3>
                 <button className="flex items-center gap-1.5 bg-gray-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors">
                    <Download className="h-3.5 w-3.5" /> Download all
                 </button>
              </div>

              {request.attachments.length === 0 ? (
                 <div className="text-sm text-gray-500 italic py-4">No attachments found.</div>
              ) : (
                 <ul className="space-y-3">
                   {request.attachments.map((file) => (
                     <li key={file.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors group">
                        <div className="flex items-center gap-3 overflow-hidden">
                           <div className="flex-shrink-0 w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                              <FileText className="h-4 w-4" />
                           </div>
                           <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate max-w-[150px]">{file.file_name}</p>
                              <p className="text-[10px] text-gray-400">{(file.file_size / 1024).toFixed(1)} KB • Uploaded {formatDateShort(file.created_at)}</p>
                           </div>
                        </div>
                        <a
                          href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/attachments/${file.file_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-900 p-1"
                        >
                           <Download className="h-4 w-4" />
                        </a>
                     </li>
                   ))}
                 </ul>
              )}
           </div>

           {/* Comments */}
           <div className="bg-white rounded-xl shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] border border-gray-100 p-6">
               <h3 className="text-sm font-semibold text-gray-900 mb-4">Comments</h3>
               <div className="space-y-4">
                  {request.comments.length === 0 ? (
                    <div className="text-sm text-gray-500 italic">No comments yet.</div>
                  ) : (
                    request.comments.slice(0, 3).map((comment) => (
                      <div key={comment.id} className="border border-gray-100 rounded-xl p-4">
                         <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-semibold text-gray-900">{comment.user?.full_name || comment.user?.email}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                               {comment.user?.role === 'admin' ? 'Admin' : 'User'}
                            </span>
                         </div>
                         <p className="text-sm text-gray-600 italic">"{comment.content}"</p>
                      </div>
                    ))
                  )}
               </div>
           </div>

           {/* Admin Actions (Conditional) */}
           {canApprove && (
              <div className="bg-blue-50 rounded-xl border border-blue-100 p-6">
                  <h3 className="font-bold text-blue-900 mb-3">Admin Actions</h3>
                  <ApprovalActions requestId={request.id} />
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
