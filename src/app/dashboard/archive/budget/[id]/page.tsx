import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import {
  archivedBudgets,
  archivedBudgetItems,
  archivedBudgetMilestones,
  archivedAuditLogs,
  users,
} from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase/server";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import { formatDateShort, formatPhp } from "@/lib/dashboardData";

export const dynamic = "force-dynamic";

function statusPill(status: string) {
  const base =
    "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium";
  if (status === "approved") return `${base} bg-green-100 text-green-700`;
  if (status === "rejected") return `${base} bg-red-100 text-red-700`;
  if (status === "revision_requested")
    return `${base} bg-orange-100 text-orange-700`;
  if (
    status === "submitted" ||
    status === "verified" ||
    status === "verified_by_reviewer"
  )
    return `${base} bg-blue-100 text-blue-700`;
  return `${base} bg-gray-100 text-gray-700`;
}

function typePill(type: "capex" | "opex") {
  const base =
    "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium";
  if (type === "capex") return `${base} bg-purple-100 text-purple-700`;
  return `${base} bg-emerald-100 text-emerald-700`;
}

export default async function ArchivedBudgetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const appUser = await getOrCreateAppUserFromAuthUser({
    id: user.id,
    email: user.email ?? null,
    user_metadata: (user.user_metadata ?? null) as Record<
      string,
      unknown
    > | null,
  });

  if (
    appUser.role !== "reviewer" &&
    appUser.role !== "approver" &&
    appUser.role !== "superadmin"
  ) {
    redirect("/dashboard");
  }

  const { id } = await params;

  const [budget] = await db
    .select()
    .from(archivedBudgets)
    .where(eq(archivedBudgets.id, id))
    .limit(1);

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

  const items = await db
    .select()
    .from(archivedBudgetItems)
    .where(eq(archivedBudgetItems.archived_budget_id, budget.id))
    .orderBy(desc(archivedBudgetItems.total_cost));

  const milestones = await db
    .select()
    .from(archivedBudgetMilestones)
    .where(eq(archivedBudgetMilestones.archived_budget_id, budget.id))
    .orderBy(asc(archivedBudgetMilestones.created_at));

  const logs = await db
    .select()
    .from(archivedAuditLogs)
    .where(eq(archivedAuditLogs.archived_budget_id, budget.id))
    .orderBy(asc(archivedAuditLogs.timestamp));

  const displayId = budget.project_code ?? `BUD-${budget.budget_number}`;

  return (
    <div className="-m-8 p-6 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-gray-500">Archived project</div>
          <h1 className="text-3xl font-bold text-gray-900 mt-1">{displayId}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className={typePill(budget.budget_type)}>
              {budget.budget_type === "capex" ? "CapEx" : "OpEx"}
            </span>
            <span className={statusPill(budget.status)}>
              {budget.status.replace(/_/g, " ")}
            </span>
            <span className="text-xs text-gray-500">
              FY {budget.fiscal_year}
            </span>
          </div>
        </div>

        <Link
          href="/dashboard/compare"
          className="inline-flex items-center rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
        >
          Back to Compare
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-black/10 bg-white p-5">
          <div className="text-xs text-gray-600">Total amount</div>
          <div className="text-2xl font-semibold text-gray-900 mt-1">
            {formatPhp(budget.total_amount)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Created {formatDateShort(budget.created_at)}
          </div>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-5">
          <div className="text-xs text-gray-600">Requester</div>
          <div className="text-sm font-semibold text-gray-900 mt-1">
            {requester?.full_name || requester?.email || budget.user_id}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {requester?.department ?? "—"}
          </div>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-5">
          <div className="text-xs text-gray-600">Archived at</div>
          <div className="text-sm font-semibold text-gray-900 mt-1">
            {formatDateShort(budget.archived_at)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Source ID: {budget.source_budget_id}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-black/10 bg-white">
          <div className="p-5 border-b border-black/10">
            <div className="text-base font-semibold text-gray-900">Items</div>
            <div className="text-sm text-gray-600">Cost breakdown snapshot</div>
          </div>
          <div className="p-5">
            {items.length === 0 ? (
              <div className="text-sm text-gray-500">No items recorded.</div>
            ) : (
              <div className="space-y-3">
                {items.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-start justify-between gap-4 border border-black/10 rounded-lg p-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {it.description}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Qty {it.quantity} • Unit {formatPhp(it.unit_cost)} •{" "}
                        {it.quarter}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {formatPhp(it.total_cost)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-black/10 bg-white">
            <div className="p-5 border-b border-black/10">
              <div className="text-base font-semibold text-gray-900">
                Milestones
              </div>
              <div className="text-sm text-gray-600">
                Planned milestones snapshot
              </div>
            </div>
            <div className="p-5">
              {milestones.length === 0 ? (
                <div className="text-sm text-gray-500">
                  No milestones recorded.
                </div>
              ) : (
                <ol className="space-y-2">
                  {milestones.map((m) => (
                    <li key={m.id} className="text-sm text-gray-900">
                      {m.description}
                      <div className="text-xs text-gray-500">
                        {m.target_quarter ?? "—"} •{" "}
                        {formatDateShort(m.created_at)}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-black/10 bg-white">
            <div className="p-5 border-b border-black/10">
              <div className="text-base font-semibold text-gray-900">
                Audit log
              </div>
              <div className="text-sm text-gray-600">
                Workflow history snapshot
              </div>
            </div>
            <div className="p-5">
              {logs.length === 0 ? (
                <div className="text-sm text-gray-500">
                  No audit events recorded.
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((l) => (
                    <div
                      key={l.id}
                      className="border border-black/10 rounded-lg p-3"
                    >
                      <div className="text-xs text-gray-500">
                        {formatDateShort(l.timestamp)} • {l.action}
                      </div>
                      <div className="text-sm text-gray-900 mt-1">
                        {l.previous_status ? `${l.previous_status} → ` : ""}
                        {l.new_status ?? ""}
                      </div>
                      {l.comment ? (
                        <div className="text-sm text-gray-700 mt-1">
                          {l.comment}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
