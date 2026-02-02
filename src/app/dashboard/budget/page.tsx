import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { budgets, budgetItems, users } from "@/db/schema";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import {
  BudgetIndexClient,
  type BudgetIndexRow,
} from "./_components/BudgetIndexClient";

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

function formatDateShort(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}-${dd}-${yy}`;
}

function statusLabel(status: string) {
  if (status === "verified_by_reviewer") return "Reviewed";
  if (status === "revision_requested") return "Revision";
  if (status === "verified") return "Verified";
  return status
    .split("_")
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/* Helper Functions */
function typePill(type: "capex" | "opex") {
  const cls =
    type === "capex"
      ? "bg-blue-100 text-blue-700"
      : "bg-purple-100 text-purple-700";
  return `inline-flex items-center justify-center rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide min-w-[60px] ${cls}`;
}

function statusToVariant(
  status: string,
): "success" | "warning" | "error" | "info" | "default" {
  if (status === "approved") return "success";
  if (status === "revision_requested") return "warning";
  if (status === "rejected") return "error";
  if (status === "draft") return "default";
  return "info";
}

function statusPill(status: string) {
  let cls = "bg-gray-100 text-gray-600";
  if (status === "approved") {
    cls = "bg-green-50 text-green-600";
  } else if (
    status === "submitted" ||
    status === "verified" ||
    status === "verified_by_reviewer"
  ) {
    cls = "bg-blue-50 text-blue-600";
  } else if (status === "revision_requested") {
    cls = "bg-orange-50 text-orange-600";
  } else if (status === "rejected") {
    cls = "bg-red-50 text-red-600";
  }

  return `inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${cls}`;
}

type StatusFilter = "all" | "approved" | "pending" | "revision";

function getStatusFilterFromSearchParam(
  value: string | undefined,
): StatusFilter {
  if (value === "approved" || value === "pending" || value === "revision") {
    return value;
  }
  return "all";
}

function buildBudgetListHref(params: { q?: string; status?: StatusFilter }) {
  const sp = new URLSearchParams();
  const q = (params.q ?? "").trim();
  const status = params.status ?? "all";
  if (q) sp.set("q", q);
  if (status !== "all") sp.set("status", status);
  const qs = sp.toString();
  return qs ? `/dashboard/budget?${qs}` : "/dashboard/budget";
}

function includesQuery(haystack: string | null | undefined, q: string) {
  if (!haystack) return false;
  return haystack.toLowerCase().includes(q);
}

function normalizeDigits(value: string) {
  return value.replace(/[^0-9]/g, "");
}

export default async function BudgetIndexPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const qRaw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const statusRaw = Array.isArray(sp.status) ? sp.status[0] : sp.status;

  const q = (qRaw ?? "").trim();
  const activeStatus = getStatusFilterFromSearchParam(statusRaw);

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

  const canCreateRequest =
    appUser.role === "requester" || appUser.role === "superadmin";

  const allBudgets = await db.query.budgets.findMany({
    where: undefined,
    orderBy: [desc(budgets.created_at)],
    limit: 200,
  });

  const budgetIds = allBudgets.map((b) => b.id);
  const itemRows =
    budgetIds.length === 0
      ? []
      : await db
          .select({
            budget_id: budgetItems.budget_id,
            description: budgetItems.description,
          })
          .from(budgetItems)
          .where(inArray(budgetItems.budget_id, budgetIds))
          .orderBy(asc(budgetItems.quarter));

  const firstItemByBudgetId = new Map<string, string>();
  for (const row of itemRows) {
    if (!firstItemByBudgetId.has(row.budget_id)) {
      firstItemByBudgetId.set(row.budget_id, row.description);
    }
  }

  const userIds = Array.from(new Set(allBudgets.map((b) => b.user_id)));
  const requesterRows =
    userIds.length === 0
      ? []
      : await db
          .select({
            id: users.id,
            email: users.email,
            full_name: users.full_name,
            department: users.department,
          })
          .from(users)
          .where(inArray(users.id, userIds));

  const requesterById = new Map(
    requesterRows.map((u) => [u.id, u.full_name || u.email]),
  );
  const departmentById = new Map(
    requesterRows.map((u) => [u.id, u.department]),
  );

  const rows: BudgetIndexRow[] = allBudgets.map((b) => {
    const projectCode = (b as { project_code?: string | null }).project_code;
    const requesterName = requesterById.get(b.user_id) ?? null;
    const department = departmentById.get(b.user_id) ?? null;

    return {
      id: b.id,
      user_id: b.user_id,
      project_code: projectCode ?? null,
      budget_number: b.budget_number,
      budget_type: b.budget_type,
      total_amount: b.total_amount,
      status: b.status,
      created_at_iso: b.created_at.toISOString(),
      projectName: firstItemByBudgetId.get(b.id) ?? "Budget Request",
      requesterName,
      department,
    };
  });

  return (
    <BudgetIndexClient
      rows={rows}
      canCreateRequest={canCreateRequest}
      initialQuery={q}
      initialStatus={activeStatus}
    />
  );
}
