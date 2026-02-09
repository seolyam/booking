import { getAuthUser } from "@/lib/supabase/server";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import {
  formatDateShort,
  formatTicketNumber,
  getRequesterDashboardData,
  getSuperadminDashboardData,
  getAdminDashboardData,
} from "@/lib/dashboardData";
import { CATEGORY_MAP, STATUS_CONFIG } from "@/db/schema";
import SuperadminDashboard from "./_components/SuperadminDashboard";
import RequesterDashboard from "./_components/RequesterDashboard";
import AdminDashboard from "./_components/AdminDashboard";

// Force dynamic rendering since dashboard data is user-specific
export const dynamic = "force-dynamic";

// Revalidate data every 30 seconds for freshness
export const revalidate = 30;

function getStatusVariant(status: string): "success" | "warning" | "error" | "info" | "default" {
  const config = STATUS_CONFIG[status];
  return config?.variant ?? "default";
}

export default async function DashboardPage() {
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

  // Superadmin dashboard
  if (appUser.role === "superadmin") {
    const data = await getSuperadminDashboardData();

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
    const data = await getAdminDashboardData(appUser.id);
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
      <AdminDashboard
        stats={data.stats}
        rows={rows}
      />
    );
  }

  // Default to requester (or regular admin if we haven't built special dashboard yet)
  const data = await getRequesterDashboardData(appUser.id);

  const rows = data.myRequests.slice(0, 10).map((r) => {
    const cat = CATEGORY_MAP[r.category];
    return {
      requestId: r.id,
      ticketNumber: formatTicketNumber(r.ticket_number),
      category: cat?.label ?? r.category,
      categoryCode: cat?.code ?? r.category,
      title: r.title,
      branchName: r.branch?.name ?? "—",
      priority: r.priority,
      statusLabel: STATUS_CONFIG[r.status]?.label ?? r.status,
      statusVariant: getStatusVariant(r.status),
      dateLabel: formatDateShort(r.created_at),
      actionHref: `/dashboard/requests/${r.id}`,
    };
  });

  return (
    <RequesterDashboard
      stats={data.stats}
      rows={rows}
    />
  );
}
