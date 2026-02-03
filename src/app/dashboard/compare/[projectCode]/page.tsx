import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import {
  archivedAuditLogs,
  archivedBudgetItems,
  archivedBudgets,
  auditLogs,
  budgetItems,
  budgets,
  users,
} from "@/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase/server";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import { formatDateShort, formatPhp } from "@/lib/format";

export const dynamic = "force-dynamic";

function getUtcYear(d: Date) {
  return d.getUTCFullYear();
}

function safeNumber(amount: string) {
  const n = Number(amount);
  return Number.isFinite(n) ? n : 0;
}

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

type LineItem = {
  description: string;
  quantity: number;
  unit_cost: string;
  total_cost: string;
  quarter: string;
};

type LogEntry = {
  action: string;
  previous_status: string | null;
  new_status: string | null;
  timestamp: Date;
  comment: string | null;
};

type BudgetDetails = {
  kind: "active" | "archived";
  id: string;
  source_budget_id?: string;
  href: string;
  budget_number: number;
  project_code: string;
  budget_type: "capex" | "opex";
  fiscal_year: number;
  status: string;
  total_amount: string;
  variance_explanation: string | null;
  roi_analysis: string | null;
  start_date: Date | null;
  end_date: Date | null;
  created_at: Date;
  user: {
    full_name: string | null;
    email: string;
    department: string;
  };
  items: LineItem[];
  logs: LogEntry[];
};

async function fetchActiveBudget(params: {
  fiscalYear: number;
  projectCode: string;
}): Promise<BudgetDetails | null> {
  const { fiscalYear, projectCode } = params;

  const rows = await db
    .select({
      budget: budgets,
      user: {
        full_name: users.full_name,
        email: users.email,
        department: users.department,
      },
    })
    .from(budgets)
    .innerJoin(users, eq(users.id, budgets.user_id))
    .where(
      and(
        eq(budgets.fiscal_year, fiscalYear),
        eq(budgets.project_code, projectCode),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const b = row.budget;

  const [items, logs] = await Promise.all([
    db
      .select({
        description: budgetItems.description,
        quantity: budgetItems.quantity,
        unit_cost: budgetItems.unit_cost,
        total_cost: budgetItems.total_cost,
        quarter: budgetItems.quarter,
      })
      .from(budgetItems)
      .where(eq(budgetItems.budget_id, b.id))
      .orderBy(asc(budgetItems.quarter), asc(budgetItems.description)),
    db
      .select({
        action: auditLogs.action,
        previous_status: auditLogs.previous_status,
        new_status: auditLogs.new_status,
        timestamp: auditLogs.timestamp,
        comment: auditLogs.comment,
      })
      .from(auditLogs)
      .where(eq(auditLogs.budget_id, b.id))
      .orderBy(desc(auditLogs.timestamp))
      .limit(25),
  ]);

  return {
    kind: "active",
    id: b.id,
    href: `/dashboard/budget/${b.id}`,
    budget_number: b.budget_number,
    project_code: projectCode,
    budget_type: b.budget_type,
    fiscal_year: b.fiscal_year,
    status: b.status,
    total_amount: String(b.total_amount),
    variance_explanation: b.variance_explanation ?? null,
    roi_analysis: b.roi_analysis ?? null,
    start_date: b.start_date ?? null,
    end_date: b.end_date ?? null,
    created_at: b.created_at,
    user: {
      full_name: row.user.full_name ?? null,
      email: row.user.email,
      department: row.user.department,
    },
    items: items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unit_cost: String(i.unit_cost),
      total_cost: String(i.total_cost),
      quarter: i.quarter,
    })),
    logs: logs.map((l) => ({
      action: l.action,
      previous_status: (l.previous_status as string | null) ?? null,
      new_status: (l.new_status as string | null) ?? null,
      timestamp: l.timestamp,
      comment: l.comment ?? null,
    })),
  };
}

async function fetchArchivedBudgetSafe(params: {
  fiscalYear: number;
  projectCode: string;
}): Promise<BudgetDetails | null> {
  const { fiscalYear, projectCode } = params;

  try {
    const rows = await db
      .select({
        budget: archivedBudgets,
        user: {
          full_name: users.full_name,
          email: users.email,
          department: users.department,
        },
      })
      .from(archivedBudgets)
      .innerJoin(users, eq(users.id, archivedBudgets.user_id))
      .where(
        and(
          eq(archivedBudgets.fiscal_year, fiscalYear),
          eq(archivedBudgets.project_code, projectCode),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const b = row.budget;

    const [items, logs] = await Promise.all([
      db
        .select({
          description: archivedBudgetItems.description,
          quantity: archivedBudgetItems.quantity,
          unit_cost: archivedBudgetItems.unit_cost,
          total_cost: archivedBudgetItems.total_cost,
          quarter: archivedBudgetItems.quarter,
        })
        .from(archivedBudgetItems)
        .where(eq(archivedBudgetItems.archived_budget_id, b.id))
        .orderBy(
          asc(archivedBudgetItems.quarter),
          asc(archivedBudgetItems.description),
        ),
      db
        .select({
          action: archivedAuditLogs.action,
          previous_status: archivedAuditLogs.previous_status,
          new_status: archivedAuditLogs.new_status,
          timestamp: archivedAuditLogs.timestamp,
          comment: archivedAuditLogs.comment,
        })
        .from(archivedAuditLogs)
        .where(eq(archivedAuditLogs.archived_budget_id, b.id))
        .orderBy(desc(archivedAuditLogs.timestamp))
        .limit(25),
    ]);

    return {
      kind: "archived",
      id: b.id,
      source_budget_id: b.source_budget_id,
      href: `/dashboard/archive/budget/${b.id}`,
      budget_number: b.budget_number,
      project_code: projectCode,
      budget_type: b.budget_type,
      fiscal_year: b.fiscal_year,
      status: b.status,
      total_amount: String(b.total_amount),
      variance_explanation: b.variance_explanation ?? null,
      roi_analysis: b.roi_analysis ?? null,
      start_date: b.start_date ?? null,
      end_date: b.end_date ?? null,
      created_at: b.created_at,
      user: {
        full_name: row.user.full_name ?? null,
        email: row.user.email,
        department: row.user.department,
      },
      items: items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unit_cost: String(i.unit_cost),
        total_cost: String(i.total_cost),
        quarter: i.quarter,
      })),
      logs: logs.map((l) => ({
        action: l.action,
        previous_status: (l.previous_status as string | null) ?? null,
        new_status: (l.new_status as string | null) ?? null,
        timestamp: l.timestamp,
        comment: l.comment ?? null,
      })),
    };
  } catch (err) {
    const msg = String(
      (err as { message?: unknown })?.message ?? err,
    ).toLowerCase();
    if (msg.includes('relation "archived_budgets" does not exist')) return null;
    throw err;
  }
}

function ItemsTable({ items }: { items: LineItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-black/10 bg-gray-50 p-6 text-center text-sm text-gray-600">
        No line items.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-600">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Description</th>
            <th className="px-3 py-2 text-right font-semibold">Qty</th>
            <th className="px-3 py-2 text-right font-semibold">Unit</th>
            <th className="px-3 py-2 text-right font-semibold">Total</th>
            <th className="px-3 py-2 text-left font-semibold">Quarter</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i, idx) => (
            <tr
              key={`${i.description}-${idx}`}
              className="border-t border-black/5"
            >
              <td className="px-3 py-2 text-gray-900">{i.description}</td>
              <td className="px-3 py-2 text-right text-gray-900">
                {i.quantity}
              </td>
              <td className="px-3 py-2 text-right text-gray-900">
                {formatPhp(i.unit_cost)}
              </td>
              <td className="px-3 py-2 text-right font-medium text-gray-900">
                {formatPhp(i.total_cost)}
              </td>
              <td className="px-3 py-2 text-gray-700">{i.quarter}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NotesCard({ title, value }: { title: string; value: string | null }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-5">
      <div className="text-xs font-semibold text-gray-600">{title}</div>
      <div className="mt-2 text-sm text-gray-900 whitespace-pre-wrap break-words overflow-hidden">
        {value && value.trim().length > 0 ? value : "—"}
      </div>
    </div>
  );
}

function BudgetHeaderCard({
  label,
  year,
  budget,
}: {
  label: string;
  year: number;
  budget: BudgetDetails | null;
}) {
  if (!budget) {
    return (
      <div className="rounded-xl border border-black/10 bg-white p-5">
        <div className="text-xs font-semibold text-gray-600">
          {year} ({label})
        </div>
        <div className="mt-4 rounded-lg border border-dashed border-black/10 bg-gray-50 p-6 text-center">
          <div className="text-sm font-medium text-gray-700">Not found</div>
          <div className="text-xs text-gray-500 mt-1">
            No record for this year.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-black/10 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-gray-600">
            {year} ({label})
          </div>
            <div className="text-sm font-semibold text-gray-900 mt-1">
              {formatPhp(budget.total_amount)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Budget #{budget.budget_number} • {budget.user.department}
            </div>
        </div>
        <div className="text-right">
          <div className="mb-2">
            <span className={statusPill(budget.status)}>
              {budget.status.replace(/_/g, " ")}
            </span>
          </div>
          <Link
            href={budget.href}
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Open budget
          </Link>
        </div>
      </div>

        <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-gray-600">
          <div>
            <span className="font-semibold text-gray-700">Requester:</span>{" "}
            <span className="break-words">
              {budget.user.full_name ?? "—"} ({budget.user.email})
            </span>
          </div>
        <div>
          <span className="font-semibold text-gray-700">Created:</span>{" "}
          {formatDateShort(budget.created_at)}
        </div>
        <div>
          <span className="font-semibold text-gray-700">Schedule:</span>{" "}
          {budget.start_date ? formatDateShort(budget.start_date) : "—"} →{" "}
          {budget.end_date ? formatDateShort(budget.end_date) : "—"}
        </div>
      </div>
    </div>
  );
}

export default async function DetailedProjectComparisonPage({
  params,
}: {
  params: Promise<{ projectCode: string }>;
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

  const { projectCode: rawProjectCode } = await params;
  const projectCode = decodeURIComponent(rawProjectCode);

  if (!projectCode || !/^(CapEx|OpEx)-\d+$/i.test(projectCode)) {
    notFound();
  }

  const now = new Date();
  const currentYear = getUtcYear(now);
  const lastYear = currentYear - 1;

  const [currentBudget, archivedLastBudget, activeLastBudget] =
    await Promise.all([
      fetchActiveBudget({ fiscalYear: currentYear, projectCode }),
      fetchArchivedBudgetSafe({ fiscalYear: lastYear, projectCode }),
      fetchActiveBudget({ fiscalYear: lastYear, projectCode }),
    ]);

  const lastBudget = archivedLastBudget ?? activeLastBudget;

  if (!currentBudget && !lastBudget) {
    notFound();
  }

  const lastAmount = lastBudget ? safeNumber(lastBudget.total_amount) : 0;
  const currentAmount = currentBudget
    ? safeNumber(currentBudget.total_amount)
    : 0;
  const delta = currentAmount - lastAmount;
  const pct = lastAmount > 0 ? (delta / lastAmount) * 100 : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">
            <Link href="/dashboard/compare" className="hover:text-gray-700">
              Compare
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900 font-medium">{projectCode}</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mt-1">
            Detailed comparison
          </h1>
        </div>

        <div className="text-right">
          <div className="text-xs text-gray-600">Δ amount</div>
          <div
            className={
              "text-lg font-semibold " +
              (delta >= 0 ? "text-green-700" : "text-red-700")
            }
          >
            {delta >= 0 ? "+" : ""}
            {formatPhp(String(delta))}
          </div>
          <div className="text-xs text-gray-500">
            {pct === null ? "—" : `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`} vs
            last year
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BudgetHeaderCard
          label="Last Year"
          year={lastYear}
          budget={lastBudget}
        />
        <BudgetHeaderCard
          label="This Year"
          year={currentYear}
          budget={currentBudget}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <NotesCard
          title="Variance explanation"
          value={currentBudget?.variance_explanation ?? null}
        />
        <NotesCard
          title="ROI analysis"
          value={currentBudget?.roi_analysis ?? null}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-900">
              {lastYear} items
            </div>
            <div className="text-xs text-gray-500">
              {lastBudget?.items.length ?? 0} items
            </div>
          </div>
          <ItemsTable items={lastBudget?.items ?? []} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-900">
              {currentYear} items
            </div>
            <div className="text-xs text-gray-500">
              {currentBudget?.items.length ?? 0} items
            </div>
          </div>
          <ItemsTable items={currentBudget?.items ?? []} />
        </div>
      </div>
    </div>
  );
}
