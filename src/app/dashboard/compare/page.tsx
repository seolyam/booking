import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { budgetItems, users, archivedBudgetItems } from "@/db/schema";
import { inArray, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase/server";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import { formatDateShort, formatPhp } from "@/lib/dashboardData";
import { MatchedProjectsCompare } from "./matched-projects-compare";

export const dynamic = "force-dynamic";

function getUtcYear(d: Date) {
  return d.getUTCFullYear();
}

function typePill(type: "capex" | "opex") {
  const base =
    "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium";
  if (type === "capex") return `${base} bg-purple-100 text-purple-700`;
  return `${base} bg-emerald-100 text-emerald-700`;
}

function safeNumber(amount: string) {
  const n = Number(amount);
  return Number.isFinite(n) ? n : 0;
}

type ActiveBudgetRow = {
  id: string;
  project_code: string | null;
  budget_number: number;
  budget_type: "capex" | "opex";
  fiscal_year: number;
  status: string;
  total_amount: string;
  created_at: Date;
  user_id: string;
};

type ArchivedBudgetRow = {
  id: string;
  source_budget_id: string;
  project_code: string | null;
  budget_number: number;
  budget_type: "capex" | "opex";
  fiscal_year: number;
  status: string;
  total_amount: string;
  created_at: Date;
  user_id: string;
};

function errorMessage(err: unknown) {
  return String((err as { message?: unknown })?.message ?? err);
}

function coerceNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function coerceDate(value: unknown) {
  if (value instanceof Date) return value;
  return new Date(String(value));
}

async function selectActiveBudgetsByYear(params: {
  fiscalYear: number;
  limit: number;
}): Promise<ActiveBudgetRow[]> {
  const { fiscalYear, limit } = params;

  try {
    // drizzle-orm/postgres-js returns rows directly as an array
    const rows = (await db.execute(sql`
      select
        id,
        project_code,
        budget_number,
        budget_type,
        fiscal_year,
        status,
        total_amount,
        created_at,
        user_id
      from budgets
      where fiscal_year = ${fiscalYear}
      order by created_at desc
      limit ${limit}
    `)) as unknown as Array<Record<string, unknown>>;

    return rows.map((r) => ({
      id: String(r.id),
      project_code: (r.project_code as string | null) ?? null,
      budget_number: coerceNumber(r.budget_number),
      budget_type: r.budget_type as "capex" | "opex",
      fiscal_year: coerceNumber(r.fiscal_year),
      status: String(r.status),
      total_amount: String(r.total_amount),
      created_at: coerceDate(r.created_at),
      user_id: String(r.user_id),
    }));
  } catch (err) {
    const msg = errorMessage(err);

    // Backward-compatible fallback if the DB hasn't applied the project_code migration yet.
    if (msg.toLowerCase().includes('column "project_code" does not exist')) {
      const rows = (await db.execute(sql`
        select
          id,
          budget_number,
          budget_type,
          fiscal_year,
          status,
          total_amount,
          created_at,
          user_id
        from budgets
        where fiscal_year = ${fiscalYear}
        order by created_at desc
        limit ${limit}
      `)) as unknown as Array<Record<string, unknown>>;

      return rows.map((r) => ({
        id: String(r.id),
        project_code: null,
        budget_number: coerceNumber(r.budget_number),
        budget_type: r.budget_type as "capex" | "opex",
        fiscal_year: coerceNumber(r.fiscal_year),
        status: String(r.status),
        total_amount: String(r.total_amount),
        created_at: coerceDate(r.created_at),
        user_id: String(r.user_id),
      }));
    }

    throw err;
  }
}

async function selectArchivedBudgetsByYearSafe(params: {
  fiscalYear: number;
  limit: number;
}): Promise<ArchivedBudgetRow[]> {
  const { fiscalYear, limit } = params;

  try {
    // drizzle-orm/postgres-js returns rows directly as an array
    const rows = (await db.execute(sql`
      select
        id,
        source_budget_id,
        project_code,
        budget_number,
        budget_type,
        fiscal_year,
        status,
        total_amount,
        created_at,
        user_id
      from archived_budgets
      where fiscal_year = ${fiscalYear}
      order by created_at desc
      limit ${limit}
    `)) as unknown as Array<Record<string, unknown>>;

    return rows.map((r) => ({
      id: String(r.id),
      source_budget_id: String(r.source_budget_id),
      project_code: (r.project_code as string | null) ?? null,
      budget_number: coerceNumber(r.budget_number),
      budget_type: r.budget_type as "capex" | "opex",
      fiscal_year: coerceNumber(r.fiscal_year),
      status: String(r.status),
      total_amount: String(r.total_amount),
      created_at: coerceDate(r.created_at),
      user_id: String(r.user_id),
    }));
  } catch (err) {
    const msg = errorMessage(err).toLowerCase();

    // If archive tables aren't deployed yet, just treat as "no archive".
    if (msg.includes('relation "archived_budgets" does not exist')) {
      return [];
    }

    if (msg.includes('column "project_code" does not exist')) {
      // Older archive table schema (or partial migration). We can still compare without project_code.
      const rows = (await db.execute(sql`
        select
          id,
          source_budget_id,
          budget_number,
          budget_type,
          fiscal_year,
          status,
          total_amount,
          created_at,
          user_id
        from archived_budgets
        where fiscal_year = ${fiscalYear}
        order by created_at desc
        limit ${limit}
      `)) as unknown as Array<Record<string, unknown>>;

      return rows.map((r) => ({
        id: String(r.id),
        source_budget_id: String(r.source_budget_id),
        project_code: null,
        budget_number: coerceNumber(r.budget_number),
        budget_type: r.budget_type as "capex" | "opex",
        fiscal_year: coerceNumber(r.fiscal_year),
        status: String(r.status),
        total_amount: String(r.total_amount),
        created_at: coerceDate(r.created_at),
        user_id: String(r.user_id),
      }));
    }

    return [];
  }
}

type ProjectRow = {
  key: string;
  displayId: string;
  projectCode: string | null;
  projectName: string;
  department: string;
  amount: string;
  status: string;
  date: string;
  href?: string;
};

type MatchedProjectRow = {
  projectCode: string;
  last: ProjectRow | null;
  current: ProjectRow | null;
};

function buildSummaryFromMatched(
  rows: MatchedProjectRow[],
  side: "last" | "current",
) {
  const present = rows.filter((r) => r[side] !== null);
  const count = present.length;
  const total = present.reduce(
    (sum, r) => sum + safeNumber((r[side] as ProjectRow).amount),
    0,
  );
  const avg = count > 0 ? total / count : 0;
  return { count, total, avg };
}

function parseProjectCode(code: string) {
  const m = /^(CapEx|OpEx)-(\d+)$/i.exec(code.trim());
  if (!m) return null;
  return { prefix: m[1].toLowerCase(), n: Number(m[2]) };
}

function matchByProjectCode(params: {
  currentRows: ProjectRow[];
  lastRows: ProjectRow[];
}): MatchedProjectRow[] {
  const { currentRows, lastRows } = params;

  const currentByCode = new Map<string, ProjectRow>();
  for (const r of currentRows) {
    if (!r.projectCode) continue;
    if (!currentByCode.has(r.projectCode)) currentByCode.set(r.projectCode, r);
  }

  const lastByCode = new Map<string, ProjectRow>();
  for (const r of lastRows) {
    if (!r.projectCode) continue;
    if (!lastByCode.has(r.projectCode)) lastByCode.set(r.projectCode, r);
  }

  const codes = Array.from(
    new Set([...currentByCode.keys(), ...lastByCode.keys()]),
  );
  const matched = codes.map((projectCode) => ({
    projectCode,
    current: currentByCode.get(projectCode) ?? null,
    last: lastByCode.get(projectCode) ?? null,
  }));

  matched.sort((a, b) => {
    const pa = parseProjectCode(a.projectCode);
    const pb = parseProjectCode(b.projectCode);

    if (pa && pb && pa.prefix === pb.prefix) return pa.n - pb.n;
    if (pa && pb) return pa.prefix.localeCompare(pb.prefix) || pa.n - pb.n;
    if (pa) return -1;
    if (pb) return 1;
    return a.projectCode.localeCompare(b.projectCode);
  });

  return matched;
}

function CompareSection({
  title,
  type,
  currentYear,
  lastYear,
  useArchiveForLastYear,
  matchedRows,
  currentSummary,
  lastSummary,
}: {
  title: string;
  type: "capex" | "opex";
  currentYear: number;
  lastYear: number;
  useArchiveForLastYear: boolean;
  matchedRows: MatchedProjectRow[];
  currentSummary: ReturnType<typeof buildSummaryFromMatched>;
  lastSummary: ReturnType<typeof buildSummaryFromMatched>;
}) {
  const deltaTotal = currentSummary.total - lastSummary.total;
  const deltaCount = currentSummary.count - lastSummary.count;

  return (
    <section className="rounded-xl border border-black/10 bg-white">
      <div className="flex items-start justify-between gap-4 p-6 border-b border-black/10">
        <div>
          <div className="flex items-center gap-2">
            <span className={typePill(type)}>{title}</span>
            <span className="text-xs text-gray-500">
              {lastYear} → {currentYear}
            </span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mt-2">
            Match-by-project-code comparison
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Compares {title} projects by matching the same project code across
            years (e.g., {title === "CapEx" ? "CapEx-1" : "OpEx-1"} last year vs
            {title === "CapEx" ? "CapEx-1" : "OpEx-1"} this year). Past-year
            data is read-only
            {useArchiveForLastYear ? " (from archived storage)." : "."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6">
        <div className="rounded-lg border border-black/10 bg-gray-50 p-4">
          <div className="text-xs text-gray-600">{lastYear} total</div>
          <div className="text-xl font-semibold text-gray-900">
            {formatPhp(String(lastSummary.total))}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {lastSummary.count} projects
          </div>
        </div>
        <div className="rounded-lg border border-black/10 bg-gray-50 p-4">
          <div className="text-xs text-gray-600">{currentYear} total</div>
          <div className="text-xl font-semibold text-gray-900">
            {formatPhp(String(currentSummary.total))}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {currentSummary.count} projects
          </div>
        </div>
        <div className="rounded-lg border border-black/10 bg-gray-50 p-4">
          <div className="text-xs text-gray-600">Δ total</div>
          <div
            className={`text-xl font-semibold ${
              deltaTotal >= 0 ? "text-green-700" : "text-red-700"
            }`}
          >
            {deltaTotal >= 0 ? "+" : ""}
            {formatPhp(String(deltaTotal))}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Δ projects: {deltaCount >= 0 ? "+" : ""}
            {deltaCount}
          </div>
        </div>
        <div className="rounded-lg border border-black/10 bg-gray-50 p-4">
          <div className="text-xs text-gray-600">Avg / project</div>
          <div className="text-xl font-semibold text-gray-900">
            {formatPhp(String(currentSummary.avg))}
          </div>
          <div className="text-xs text-gray-500 mt-1">Current year average</div>
        </div>
      </div>

      <MatchedProjectsCompare
        matchedRows={matchedRows}
        lastYear={lastYear}
        currentYear={currentYear}
        title={title}
      />
    </section>
  );
}

export default async function CompareProjectsPage() {
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

  // Keep this feature scoped to reviewer/approver/superadmin.
  if (
    appUser.role !== "reviewer" &&
    appUser.role !== "approver" &&
    appUser.role !== "superadmin"
  ) {
    redirect("/dashboard");
  }

  const now = new Date();
  const currentYear = getUtcYear(now);
  const lastYear = currentYear - 1;

  // Current-year projects (active table)
  const currentBudgets = await selectActiveBudgetsByYear({
    fiscalYear: currentYear,
    limit: 500,
  });

  const currentIds = currentBudgets.map((b) => b.id);
  const currentItems =
    currentIds.length === 0
      ? []
      : await db
          .select({
            budget_id: budgetItems.budget_id,
            description: budgetItems.description,
          })
          .from(budgetItems)
          .where(inArray(budgetItems.budget_id, currentIds));

  const currentFirstItemById = new Map<string, string>();
  for (const it of currentItems) {
    if (!currentFirstItemById.has(it.budget_id)) {
      currentFirstItemById.set(it.budget_id, it.description);
    }
  }

  const currentUserIds = Array.from(
    new Set(currentBudgets.map((b) => b.user_id)),
  );
  const currentUsers =
    currentUserIds.length === 0
      ? []
      : await db
          .select({
            id: users.id,
            department: users.department,
            full_name: users.full_name,
            email: users.email,
          })
          .from(users)
          .where(inArray(users.id, currentUserIds));

  const currentDeptByUserId = new Map(
    currentUsers.map((u) => [u.id, u.department]),
  );

  const currentRows: ProjectRow[] = currentBudgets.map((b) => {
    const displayId = b.project_code ?? `BUD-${b.budget_number}`;
    const href = b.project_code
      ? `/dashboard/budget/${encodeURIComponent(b.project_code)}`
      : `/dashboard/budget/BUD-${String(b.budget_number).padStart(3, "0")}`;

    return {
      key: b.id,
      displayId,
      projectCode: b.project_code,
      projectName: currentFirstItemById.get(b.id) ?? "Budget Request",
      department: currentDeptByUserId.get(b.user_id) ?? "",
      amount: b.total_amount,
      status: b.status,
      date: formatDateShort(b.created_at),
      href,
    };
  });

  // Last-year projects (prefer archive; fall back to active if not archived yet)
  const archivedLastYear = await selectArchivedBudgetsByYearSafe({
    fiscalYear: lastYear,
    limit: 1000,
  });

  const useArchiveForLastYear = archivedLastYear.length > 0;

  let lastYearRows: ProjectRow[] = [];
  let lastYearActiveBudgets: Array<{
    id: string;
    budget_type: "capex" | "opex";
  }> = [];

  if (useArchiveForLastYear) {
    const archivedIds = archivedLastYear.map((b) => b.id);
    const archivedItems =
      archivedIds.length === 0
        ? []
        : await db
            .select({
              archived_budget_id: archivedBudgetItems.archived_budget_id,
              description: archivedBudgetItems.description,
            })
            .from(archivedBudgetItems)
            .where(
              inArray(archivedBudgetItems.archived_budget_id, archivedIds),
            );

    const firstItemByArchivedId = new Map<string, string>();
    for (const it of archivedItems) {
      if (!firstItemByArchivedId.has(it.archived_budget_id)) {
        firstItemByArchivedId.set(it.archived_budget_id, it.description);
      }
    }

    const lastUserIds = Array.from(
      new Set(archivedLastYear.map((b) => b.user_id)),
    );
    const lastUsers =
      lastUserIds.length === 0
        ? []
        : await db
            .select({ id: users.id, department: users.department })
            .from(users)
            .where(inArray(users.id, lastUserIds));

    const deptByUserId = new Map(lastUsers.map((u) => [u.id, u.department]));

    lastYearRows = archivedLastYear.map((b) => ({
      key: b.id,
      displayId: b.project_code ?? `BUD-${b.budget_number}`,
      projectCode: b.project_code,
      projectName: firstItemByArchivedId.get(b.id) ?? "Budget Request",
      department: deptByUserId.get(b.user_id) ?? "",
      amount: b.total_amount,
      status: b.status,
      date: formatDateShort(b.created_at),
      href: `/dashboard/archive/budget/${b.id}`,
    }));
  } else {
    const lastYearBudgets = await selectActiveBudgetsByYear({
      fiscalYear: lastYear,
      limit: 500,
    });

    lastYearActiveBudgets = lastYearBudgets.map((b) => ({
      id: b.id,
      budget_type: b.budget_type,
    }));

    const lastIds = lastYearBudgets.map((b) => b.id);
    const lastItems =
      lastIds.length === 0
        ? []
        : await db
            .select({
              budget_id: budgetItems.budget_id,
              description: budgetItems.description,
            })
            .from(budgetItems)
            .where(inArray(budgetItems.budget_id, lastIds));

    const firstItemById = new Map<string, string>();
    for (const it of lastItems) {
      if (!firstItemById.has(it.budget_id)) {
        firstItemById.set(it.budget_id, it.description);
      }
    }

    const lastUserIds = Array.from(
      new Set(lastYearBudgets.map((b) => b.user_id)),
    );
    const lastUsers =
      lastUserIds.length === 0
        ? []
        : await db
            .select({ id: users.id, department: users.department })
            .from(users)
            .where(inArray(users.id, lastUserIds));

    const deptByUserId = new Map(lastUsers.map((u) => [u.id, u.department]));

    lastYearRows = lastYearBudgets.map((b) => {
      const displayId = b.project_code ?? `BUD-${b.budget_number}`;
      const href = b.project_code
        ? `/dashboard/budget/${encodeURIComponent(b.project_code)}`
        : `/dashboard/budget/BUD-${String(b.budget_number).padStart(3, "0")}`;

      return {
        key: b.id,
        displayId,
        projectCode: b.project_code,
        projectName: firstItemById.get(b.id) ?? "Budget Request",
        department: deptByUserId.get(b.user_id) ?? "",
        amount: b.total_amount,
        status: b.status,
        date: formatDateShort(b.created_at),
        href,
      };
    });
  }

  // Prefer actual DB type when we can: use currentBudgets / archivedLastYear objects.
  const currentCapexKeys = new Set(
    currentBudgets.filter((b) => b.budget_type === "capex").map((b) => b.id),
  );
  const currentOpexKeys = new Set(
    currentBudgets.filter((b) => b.budget_type === "opex").map((b) => b.id),
  );

  const currentCapex = currentRows.filter((r) => currentCapexKeys.has(r.key));
  const currentOpex = currentRows.filter((r) => currentOpexKeys.has(r.key));

  let lastCapex: ProjectRow[];
  let lastOpex: ProjectRow[];

  if (useArchiveForLastYear) {
    const lastCapexArchivedKeys = new Set(
      archivedLastYear
        .filter((b) => b.budget_type === "capex")
        .map((b) => b.id),
    );
    const lastOpexArchivedKeys = new Set(
      archivedLastYear.filter((b) => b.budget_type === "opex").map((b) => b.id),
    );

    lastCapex = lastYearRows.filter((r) => lastCapexArchivedKeys.has(r.key));
    lastOpex = lastYearRows.filter((r) => lastOpexArchivedKeys.has(r.key));
  } else {
    const lastCapexActiveKeys = new Set(
      lastYearActiveBudgets
        .filter((b) => b.budget_type === "capex")
        .map((b) => b.id),
    );
    const lastOpexActiveKeys = new Set(
      lastYearActiveBudgets
        .filter((b) => b.budget_type === "opex")
        .map((b) => b.id),
    );

    lastCapex = lastYearRows.filter((r) => lastCapexActiveKeys.has(r.key));
    lastOpex = lastYearRows.filter((r) => lastOpexActiveKeys.has(r.key));
  }

  const matchedCapex = matchByProjectCode({
    currentRows: currentCapex,
    lastRows: lastCapex,
  });
  const matchedOpex = matchByProjectCode({
    currentRows: currentOpex,
    lastRows: lastOpex,
  });

  const capexCurrentSummary = buildSummaryFromMatched(matchedCapex, "current");
  const capexLastSummary = buildSummaryFromMatched(matchedCapex, "last");
  const opexCurrentSummary = buildSummaryFromMatched(matchedOpex, "current");
  const opexLastSummary = buildSummaryFromMatched(matchedOpex, "last");

  return (
    <div className="-m-8 p-6 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compare Projects</h1>
          <div className="text-sm text-gray-600 mt-1">
            CapEx ↔ CapEx and OpEx ↔ OpEx, matched by project code (e.g., OpEx-1
            vs OpEx-1).
          </div>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
        >
          Back
        </Link>
      </div>

      <CompareSection
        title="CapEx"
        type="capex"
        currentYear={currentYear}
        lastYear={lastYear}
        useArchiveForLastYear={useArchiveForLastYear}
        matchedRows={matchedCapex}
        currentSummary={capexCurrentSummary}
        lastSummary={capexLastSummary}
      />

      <CompareSection
        title="OpEx"
        type="opex"
        currentYear={currentYear}
        lastYear={lastYear}
        useArchiveForLastYear={useArchiveForLastYear}
        matchedRows={matchedOpex}
        currentSummary={opexCurrentSummary}
        lastSummary={opexLastSummary}
      />
    </div>
  );
}
