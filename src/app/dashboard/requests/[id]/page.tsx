import { getAuthUser } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { auditLogs, budgetItems, budgets, users } from "@/db/schema";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { CheckCircle2, XCircle, ArrowLeft, Bell, Wallet, Calendar } from "lucide-react";
import WorkflowProgress, {
  type WorkflowEvent,
  type WorkflowStep,
} from "./_components/WorkflowProgress";

// Force dynamic rendering - requires auth and DB access
export const dynamic = "force-dynamic";

function formatPhp(amount: string) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "₱0";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDateShort(input: Date) {
  const mm = String(input.getMonth() + 1).padStart(2, "0");
  const dd = String(input.getDate()).padStart(2, "0");
  const yyyy = String(input.getFullYear());
  return `${mm}-${dd}-${yyyy}`;
}

function formatDateShortYY(input: Date) {
  const mm = String(input.getMonth() + 1).padStart(2, "0");
  const dd = String(input.getDate()).padStart(2, "0");
  const yy = String(input.getFullYear()).slice(-2);
  return `${mm}-${dd}-${yy}`;
}

function typePill(type: "capex" | "opex") {
  const base =
    "inline-flex items-center rounded-md px-3 py-1 text-xs font-medium";
  return type === "capex"
    ? `${base} bg-blue-100 text-blue-700`
    : `${base} bg-purple-100 text-purple-700`;
}

function statusMeta(status: string): {
  label: string;
  cls: string;
  icon: React.ReactNode;
} {
  if (status === "approved") {
    return {
      label: "Approved",
      cls: "bg-green-100 text-green-700",
      icon: <CheckCircle2 className="h-4 w-4" />,
    };
  }
  if (status === "rejected") {
    return {
      label: "Rejected",
      cls: "bg-red-100 text-red-700",
      icon: <XCircle className="h-4 w-4" />,
    };
  }
  if (status === "revision_requested") {
    return {
      label: "Needs Revision",
      cls: "bg-orange-100 text-orange-700",
      icon: <XCircle className="h-4 w-4" />,
    };
  }
  if (status === "verified") {
    return {
      label: "Verified",
      cls: "bg-green-100 text-green-700",
      icon: <CheckCircle2 className="h-4 w-4" />,
    };
  }
  if (status === "verified_by_reviewer") {
    return {
      label: "Reviewed",
      cls: "bg-yellow-100 text-yellow-800",
      icon: <CheckCircle2 className="h-4 w-4" />,
    };
  }
  if (status === "submitted") {
    return {
      label: "Submitted",
      cls: "bg-yellow-100 text-yellow-700",
      icon: <CheckCircle2 className="h-4 w-4" />,
    };
  }
  return {
    label: "Created",
    cls: "bg-gray-100 text-gray-700",
    icon: <CheckCircle2 className="h-4 w-4" />,
  };
}

function actionLabel(action: string) {
  if (action === "create_draft") return "Created";
  if (action === "submit") return "Submitted";
  if (action === "reviewed") return "Reviewed";
  if (action === "verify") return "Verified";
  if (action === "request_revision") return "Revision requested";
  if (action === "approve") return "Approved";
  if (action === "reject") return "Rejected";
  return action
    .split("_")
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function auditDescription(action: string) {
  if (action === "create_draft") return "Budget Created";
  if (action === "submit") return "Budget Submitted for Review";
  if (action === "reviewed") return "Budget opened for review";
  if (action === "request_revision") return "Proposal Returned for Revisions";
  if (action === "verify") return "Budget verified and forwarded to approver";
  if (action === "approve")
    return "Budget approved - Added to approved budget list";
  if (action === "reject") return "Budget rejected";
  return "";
}

function computeSteps(status: string): WorkflowStep[] {
  const steps: Array<{ key: string; label: string }> = [
    { key: "created", label: "Created" },
    { key: "submitted", label: "Submitted" },
    { key: "reviewed", label: "Reviewed" },
    { key: "verified", label: "Verified" },
    { key: "approved", label: "Approved" },
  ];

  // Map status to progression index; rejected/revision stop at review
  const activeIndex = (() => {
    if (status === "draft") return 0;
    if (status === "submitted") return 1;
    if (
      status === "revision_requested" ||
      status === "verified_by_reviewer" ||
      status === "rejected"
    )
      return 2;
    if (status === "verified") return 3;
    if (status === "approved") return 4;
    return 0;
  })();

  // Adjust labels ONLY when currently at terminal review outcomes
  // Once workflow moves past (e.g., to verified/approved), revert to "Reviewed"
  if (status === "revision_requested" && activeIndex === 2) {
    steps[2] = { ...steps[2], label: "Revision" };
  } else if (status === "rejected" && activeIndex === 2) {
    steps[2] = { ...steps[2], label: "Rejected" };
  }

  return steps.map((s, idx) => {
    if (idx < activeIndex) return { ...s, state: "done" as const };
    if (idx === activeIndex) {
      return {
        ...s,
        state: "current" as const,
        statusType: status as string, // Pass status for color determination
      };
    }
    return { ...s, state: "todo" as const };
  });
}

export default async function RequestViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const decodedId = decodeURIComponent(id);
  const looksLikeProjectCode = /^(CapEx|OpEx)-\d+$/i.test(decodedId);
  const looksLikeBudLabel = decodedId.startsWith("BUD-");
  const numericId =
    !looksLikeProjectCode && !looksLikeBudLabel ? Number(decodedId) : NaN;

  const user = await getAuthUser();

  if (!user) redirect("/login");

  // Requester view: only allow viewing your own requests.
  const budget = looksLikeProjectCode
    ? await db.query.budgets.findFirst({
      where: sql`${budgets.project_code} = ${decodedId} and ${budgets.user_id} = ${user.id}`,
    })
    : looksLikeBudLabel
      ? await db.query.budgets.findFirst({
        where: sql`${budgets.budget_number} = ${parseInt(decodedId.slice(4), 10)} and ${budgets.user_id} = ${user.id}`,
      })
      : Number.isFinite(numericId)
        ? await db.query.budgets.findFirst({
          where: sql`${budgets.budget_number} = ${numericId} and ${budgets.user_id} = ${user.id}`,
        })
        : await db.query.budgets.findFirst({
          where: sql`${budgets.id} = ${decodedId} and ${budgets.user_id} = ${user.id}`,
        });

  if (!budget) notFound();

  const [requester] = await db
    .select({
      full_name: users.full_name,
      email: users.email,
      department: users.department,
    })
    .from(users)
    .where(eq(users.id, budget.user_id))
    .limit(1);

  const items = await db.query.budgetItems.findMany({
    where: eq(budgetItems.budget_id, budget.id),
    orderBy: [desc(budgetItems.total_cost)],
  });

  const logs = await db.query.auditLogs.findMany({
    where: eq(auditLogs.budget_id, budget.id),
    orderBy: [asc(auditLogs.timestamp)],
  });

  const actorIds = Array.from(new Set(logs.map((l) => l.actor_id)));
  const actorRows =
    actorIds.length === 0
      ? []
      : await db
        .select({
          id: users.id,
          email: users.email,
          full_name: users.full_name,
        })
        .from(users)
        .where(inArray(users.id, actorIds));

  const actorNameById = new Map(
    actorRows.map((a) => [a.id, a.full_name || a.email]),
  );

  const projectName = items[0]?.description ?? "Budget Request";
  const displayId = budget.project_code ?? `BUD-${budget.budget_number}`;
  const displayTitle = projectName;
  const projectSub = `${displayId} • ${requester?.department ?? ""}`.trim();

  const status = statusMeta(budget.status);
  const steps = computeSteps(budget.status);

  const events: WorkflowEvent[] = logs.map((l) => ({
    id: l.id,
    at: formatDateShortYY(l.timestamp),
    title: actionLabel(l.action),
    description: auditDescription(l.action),
    actorName: actorNameById.get(l.actor_id) ?? null,
    note: l.comment,
    action: l.action, // Include action for color determination
  }));

  const createdAt = formatDateShort(budget.created_at);
  const updatedAt = formatDateShort(budget.updated_at);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
        <div>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/requests"
              className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Budget Tracking
              </h1>
              <div className="text-sm text-gray-500">
                Track the complete lifecycle and history of this budget request
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Notification bell removed */}
        </div>
      </div>

        <div className="rounded-3xl bg-white p-6 md:p-8 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">
                {displayTitle}
              </h2>
              <span className={typePill(budget.budget_type) + " uppercase"}>
                {budget.budget_type === "capex" ? "CAPEX" : "OPEX"}
              </span>
            </div>
            <div className="mt-1 text-sm text-gray-500 break-words">
              {projectSub}
            </div>
          </div>

          <div
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-wide ${status.cls}`}
          >
            {status.icon}
            {status.label}
          </div>
        </div>

        <div className="mt-8 grid min-w-0 grid-cols-1 gap-4 rounded-2xl bg-gray-50 p-4 sm:grid-cols-2 md:grid-cols-4 md:gap-8 md:p-6">
          <div className="min-w-0 text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Total Amount
            </div>
            <div className="mt-2 text-xl font-bold text-gray-900">
              {formatPhp(budget.total_amount)}
            </div>
          </div>
          <div className="min-w-0 text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Requester
            </div>
            <div className="mt-2 w-full max-w-full overflow-hidden text-base md:text-lg font-bold text-gray-900 break-words">
              {requester?.email || "Requester"}
            </div>
          </div>
          <div className="min-w-0 text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Created
            </div>
            <div className="mt-2 text-lg font-bold text-gray-900">
              {createdAt}
            </div>
          </div>
          <div className="min-w-0 text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Last Updated
            </div>
            <div className="mt-2 text-lg font-bold text-gray-900">
              {updatedAt}
            </div>
          </div>
        </div>

        <div className="mt-10 border-b border-gray-100 pb-10">
          <WorkflowProgress steps={steps} events={events} />
        </div>

        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div>
            <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-900">
              <Wallet className="h-5 w-5 text-gray-400" /> Cost Breakdown
            </h3>

            {items.length === 0 ? (
              <div className="text-sm text-gray-500">No line items.</div>
            ) : (
              <div className="space-y-4">
                {items.slice(0, 5).map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between rounded-xl bg-gray-50 p-4"
                  >
                    <div>
                      <div className="font-bold text-gray-900">
                        {it.description}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {it.quarter ? `${it.quarter} | ` : ""} Qty:{" "}
                        {it.quantity}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-gray-900">
                      {formatPhp(it.total_cost)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-900">
              <Calendar className="h-5 w-5 text-gray-400" /> Project timeline
            </h3>
            <div className="space-y-6 rounded-xl bg-gray-50 p-6">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Start Date
                </div>
                <div className="font-bold text-gray-900">
                  {budget.start_date
                    ? formatDateShort(budget.start_date)
                    : "-"}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  End Date
                </div>
                <div className="font-bold text-gray-900">
                  {budget.end_date ? formatDateShort(budget.end_date) : "-"}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                  Variance Explanation
                </div>
                {budget.variance_explanation ? (
                  <div className="text-sm font-medium text-gray-900 break-words whitespace-pre-wrap">
                    {budget.variance_explanation}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    No variance explanation provided
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
