import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { budgets, budgetItems } from "@/db/schema";
import { desc, eq, inArray, and, ne } from "drizzle-orm";
import {
  RequestsListClient,
  type RequestsListRow,
} from "./_components/RequestsListClient";

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

function typePill(type: "capex" | "opex") {
  const cls =
    type === "capex"
      ? "bg-blue-100 text-blue-700"
      : "bg-purple-100 text-purple-700";
  return `inline-flex items-center justify-center rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide min-w-[60px] ${cls}`;
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
  } else if (status === "draft") {
    cls = "bg-gray-100 text-gray-600";
  }

  return `inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${cls}`;
}

function statusToVariant(
  status: string,
): "success" | "warning" | "error" | "info" | "default" {
  if (status === "approved" || status === "verified") return "success";
  if (status === "revision_requested") return "warning";
  if (status === "rejected") return "error";
  if (status === "draft") return "default";
  return "info";
}

type StatusFilter = "all" | "approved" | "pending" | "revision" | "draft";

function getStatusFilterFromSearchParam(
  value: string | undefined,
): StatusFilter {
  if (
    value === "approved" ||
    value === "pending" ||
    value === "revision" ||
    value === "draft"
  ) {
    return value;
  }
  return "all";
}

function buildRequestsHref(params: { q?: string; status?: StatusFilter }) {
  const sp = new URLSearchParams();
  const q = (params.q ?? "").trim();
  const status = params.status ?? "all";
  if (q) sp.set("q", q);
  if (status !== "all") sp.set("status", status);
  const qs = sp.toString();
  return qs ? `/dashboard/requests?${qs}` : "/dashboard/requests";
}

function includesQuery(haystack: string | null | undefined, q: string) {
  if (!haystack) return false;
  return haystack.toLowerCase().includes(q);
}

function normalizeDigits(value: string) {
  return value.replace(/[^0-9]/g, "");
}

export default async function RequestsPage({
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

  const myBudgets = await db.query.budgets.findMany({
    where: eq(budgets.user_id, user.id),
    orderBy: [desc(budgets.created_at)],
    limit: 200,
  });

  const ids = myBudgets.map((b) => b.id);
  const items =
    ids.length === 0
      ? []
      : await db
          .select({
            budget_id: budgetItems.budget_id,
            description: budgetItems.description,
          })
          .from(budgetItems)
          .where(inArray(budgetItems.budget_id, ids));

  const firstItem = new Map<string, string>();
  for (const it of items) {
    if (!firstItem.has(it.budget_id))
      firstItem.set(it.budget_id, it.description);
  }

  const rows: RequestsListRow[] = myBudgets.map((b) => ({
    id: b.id,
    project_code: b.project_code,
    budget_number: b.budget_number,
    budget_type: b.budget_type,
    total_amount: b.total_amount,
    status: b.status,
    created_at_iso: new Date(b.created_at).toISOString(),
    projectName: firstItem.get(b.id) ?? "Budget Request",
  }));

  return (
    <RequestsListClient
      rows={rows}
      initialQuery={q}
      initialStatus={activeStatus}
    />
  );
}
