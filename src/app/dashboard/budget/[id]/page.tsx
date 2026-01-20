import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { auditLogs, budgetItems, budgets, users } from "@/db/schema";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { CheckCircle2, XCircle } from "lucide-react";
import WorkflowProgress, {
  type WorkflowEvent,
  type WorkflowStep,
} from "../../requests/[id]/_components/WorkflowProgress";

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
      cls: "bg-blue-100 text-blue-700",
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
    { key: "final", label: "Final" },
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

type MilestoneLabel =
  | "Submitted"
  | "Reviewed"
  | "Verified"
  | "Approved"
  | "Rejected"
  | "Revision requested";

export default async function BudgetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const budget = await db.query.budgets.findFirst({
    where: eq(budgets.id, id),
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

  const budgetDisplayId = `BUD-${budget.budget_number}`;

  const projectName = items[0]?.description ?? "Budget Request";
  const projectSub =
    `${budgetDisplayId} • ${requester?.department ?? ""}`.trim();

  const milestoneLines = (() => {
    const labels = new Set<MilestoneLabel | null>(
      logs.map((l): MilestoneLabel | null => {
        if (l.action === "submit") return "Submitted";
        if (l.action === "reviewed") return "Reviewed";
        if (l.action === "verify") return "Verified";
        if (l.action === "approve") return "Approved";
        if (l.action === "reject") return "Rejected";
        if (l.action === "request_revision") return "Revision requested";
        return null;
      }),
    );

    return Array.from(labels)
      .filter((v): v is MilestoneLabel => v !== null)
      .slice(0, 5);
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/budget"
              aria-label="Back"
              className="rounded-full p-2 text-gray-700 hover:bg-black/5"
            >
              <span aria-hidden="true">←</span>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Budget Tracking
              </h1>
              <div className="text-sm text-gray-600">
                Track the complete lifecycle and history of this budget request
              </div>
            </div>
          </div>
        </div>

        <div
          className={
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold " +
            status.cls
          }
        >
          {status.icon}
          {status.label}
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="text-lg font-semibold text-gray-900 truncate">
                {projectName}
              </div>
              <span className={typePill(budget.budget_type)}>
                {budget.budget_type === "capex" ? "CapEx" : "OpEx"}
              </span>
            </div>
            <div className="mt-1 text-xs text-gray-500">{projectSub}</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-black/5 p-4 md:grid-cols-4">
          <div>
            <div className="text-xs text-gray-600">Total amount</div>
            <div className="mt-1 font-semibold text-gray-900">
              {formatPhp(budget.total_amount)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Requester</div>
            <div className="mt-1 font-semibold text-gray-900">
              {requester?.full_name || requester?.email || "Requester"}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Created</div>
            <div className="mt-1 font-semibold text-gray-900">{createdAt}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Last Updated</div>
            <div className="mt-1 font-semibold text-gray-900">{updatedAt}</div>
          </div>
        </div>

        {(budget.start_date || budget.end_date) && (
          <div className="mt-4 rounded-xl bg-blue-50 p-4">
            <div className="text-sm font-semibold text-gray-900 mb-2">
              📅 Timeline
            </div>
            <div className="grid grid-cols-2 gap-4">
              {budget.start_date && (
                <div>
                  <div className="text-xs text-gray-600">Start Date</div>
                  <div className="mt-1 font-semibold text-gray-900">
                    {formatDateShort(budget.start_date)}
                  </div>
                </div>
              )}
              {budget.end_date && (
                <div>
                  <div className="text-xs text-gray-600">End Date</div>
                  <div className="mt-1 font-semibold text-gray-900">
                    {formatDateShort(budget.end_date)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <WorkflowProgress steps={steps} events={events} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-6">
          <div className="text-base font-semibold text-gray-900">
            ₱ Cost Breakdown
          </div>

          {items.length === 0 ? (
            <div className="mt-3 text-sm text-gray-600">No line items.</div>
          ) : (
            <div className="mt-4 space-y-3">
              {items.slice(0, 5).map((it) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between gap-4 rounded-lg bg-black/5 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {it.description}
                    </div>
                    <div className="text-xs text-gray-600">
                      {`Qty: ${it.quantity} • ${it.quarter}`}
                    </div>
                  </div>
                  <div className="shrink-0 text-sm font-semibold text-gray-900">
                    {formatPhp(it.total_cost)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-6">
          <div className="text-base font-semibold text-gray-900">
            Project timeline
          </div>

          <div className="mt-4 space-y-4 rounded-lg bg-black/5 p-4">
            {budget.start_date && (
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-gray-700">Start Date</div>
                <div className="text-sm font-semibold text-gray-900">
                  {formatDateShort(budget.start_date)}
                </div>
              </div>
            )}
            {budget.end_date && (
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-gray-700">End Date</div>
                <div className="text-sm font-semibold text-gray-900">
                  {formatDateShort(budget.end_date)}
                </div>
              </div>
            )}
            {!budget.start_date && !budget.end_date && (
              <div className="text-sm text-gray-600">No timeline set.</div>
            )}

            <div className="pt-2">
              <div className="text-sm font-semibold text-gray-900">
                Milestones:
              </div>
              {milestoneLines.length === 0 ? (
                <div className="mt-2 text-sm text-gray-600">
                  No milestones yet.
                </div>
              ) : (
                <ul className="mt-2 space-y-1 text-sm text-gray-700">
                  {milestoneLines.map((m) => (
                    <li key={m} className="flex items-center gap-2">
                      <span aria-hidden="true">•</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {budget.variance_explanation ? (
            <div className="mt-4">
              <div className="text-sm font-semibold text-gray-900">
                Variance explanation
              </div>
              <div className="mt-1 text-sm text-gray-700">
                {budget.variance_explanation}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
