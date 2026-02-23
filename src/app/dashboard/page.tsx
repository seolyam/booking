import { getAuthUser } from "@/lib/supabase/server";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import { redirect } from "next/navigation";
import {
  formatDateShort,
  formatTicketNumber,
  getSuperadminDashboardData,
  getAdminDashboardData,
} from "@/lib/dashboardData";
import { CATEGORY_MAP, STATUS_CONFIG } from "@/db/schema";
import SuperadminDashboard from "./_components/SuperadminDashboard";
import AdminDashboard from "./_components/AdminDashboard";

// Force dynamic rendering since dashboard data is user-specific
export const dynamic = "force-dynamic";

// Revalidate data every 30 seconds for freshness
export const revalidate = 30;

function getStatusVariant(status: string): "success" | "warning" | "error" | "info" | "default" {
  const config = STATUS_CONFIG[status];
  return config?.variant ?? "default";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const user = await getAuthUser();

  if (!user) {
    return null;
  }

  const appUser = await getOrCreateAppUserFromAuthUser({
    id: user.id,
    email: user.email ?? null,
    user_metadata: (user.user_metadata ?? null) as Record<
      string,
      unknown
    > | null,
  });

  // Parse filters
  let dateRange: { from?: Date; to?: Date } | undefined;
  const datePreset = typeof params.datePreset === 'string' ? params.datePreset : undefined;

  if (datePreset && datePreset !== "all") {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (datePreset === "yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yEnd = new Date(yesterday);
      yEnd.setHours(23, 59, 59, 999);
      dateRange = { from: yesterday, to: yEnd };
    } else if (datePreset === "daily") {
      const tEnd = new Date(today);
      tEnd.setHours(23, 59, 59, 999);
      dateRange = { from: today, to: tEnd };
    } else if (datePreset === "weekly") {
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      dateRange = { from: lastWeek, to: new Date() };
    } else if (datePreset === "monthly") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateRange = { from: startOfMonth, to: new Date() };
    }
  }

  const filters = {
    status: typeof params.status === 'string' ? [params.status] : Array.isArray(params.status) ? params.status : undefined,
    category: typeof params.category === 'string' ? [params.category] : Array.isArray(params.category) ? params.category : undefined,
    dateRange,
  };

  // Superadmin dashboard
  if (appUser.role === "superadmin") {
    const data = await getSuperadminDashboardData(filters);

    const rows = data.allRequests.slice(0, 10).map((r) => ({
      requestId: r.id,
      ticketNumber: formatTicketNumber(r.ticket_number),
      category: CATEGORY_MAP[r.category]?.label ?? r.category,
      requesterName: r.requester?.full_name ?? r.requester?.email ?? "Unknown",
      branchName: r.branch?.name ?? "—",
      priority: r.priority,
      statusLabel: STATUS_CONFIG[r.status]?.label ?? r.status,
      statusVariant: getStatusVariant(r.status),
      dateLabel: formatDateShort(r.created_at),
      actionHref: `/dashboard/requests/${r.id}`,
    }));

    return (
      <SuperadminDashboard
        stats={data.stats}
        rows={rows}
        pendingUserCount={data.pendingUserCount}
      />
    );
  }

  // Admin dashboard
  if (appUser.role === "admin") {
    const data = await getAdminDashboardData(appUser.id, filters);
    const rows = data.allRequests.slice(0, 10).map((r) => ({
      requestId: r.id,
      ticketNumber: formatTicketNumber(r.ticket_number),
      category: CATEGORY_MAP[r.category]?.label ?? r.category,
      categoryCode: CATEGORY_MAP[r.category]?.code ?? "REQ",
      title: r.title,
      requesterName: r.requester?.full_name ?? r.requester?.email ?? "Unknown",
      branchName: r.branch?.name ?? "—",
      priority: r.priority,
      statusLabel: STATUS_CONFIG[r.status]?.label ?? r.status,
      statusVariant: getStatusVariant(r.status),
      dateLabel: formatDateShort(r.created_at),
      actionHref: `/dashboard/requests/${r.id}`,
    }));

    return (
      <AdminDashboard
        userName={appUser.fullName || appUser.email || "Admin"}
        stats={data.stats}
        rows={rows}
      />
    );
  }

  // Default to requester -> redirect to their requests tab
  redirect("/dashboard/requests");
}
