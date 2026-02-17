import { getAllRequests } from "@/actions/request";
import { CATEGORY_MAP, STATUS_CONFIG } from "@/db/schema";
import { RequestsListClient, type RequestsListRow } from "../../requests/_components/RequestsListClient";
import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminAllRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  const appUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true },
  });

  // This page is for admins and superadmins
  if (appUser?.role !== "admin" && appUser?.role !== "superadmin") {
    redirect("/dashboard");
  }

  // Handle Date Filters
  let dateRange: { from?: Date; to?: Date } | undefined;

  if (params.from || params.to) {
    dateRange = {
      from: params.from ? new Date(params.from as string) : undefined,
      to: params.to ? new Date(params.to as string) : undefined
    };
  } else {
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
  }

  const requests = await getAllRequests({
    status: params.status,
    category: params.category,
    search: typeof params.search === 'string' ? params.search : undefined,
    dateRange,
  });

  const rows: RequestsListRow[] = requests.map((req) => {
    const category = CATEGORY_MAP[req.category];
    const statusCfg = STATUS_CONFIG[req.status];
    return {
      id: req.id,
      ticketNumber: String(req.ticket_number).padStart(4, "0"),
      category: category?.label ?? req.category,
      categoryKey: req.category,
      priority: req.priority,
      status: req.status,
      statusLabel: statusCfg?.label ?? req.status,
      branchName: req.branch_name ?? "N/A",
      requesterName: req.requester_name ?? req.requester_email ?? "Unknown",
      created_at_iso: req.created_at.toISOString(),
    };
  });

  return (
    <div className="space-y-6">
      <RequestsListClient
        rows={rows}
        showRequester={true}
        canCreate={appUser?.role === "superadmin"}
        initialQuery={typeof params.search === 'string' ? params.search : undefined}
      />
    </div>
  );
}
