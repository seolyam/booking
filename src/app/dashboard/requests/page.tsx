import { getRequests } from "@/actions/request";
import { CATEGORY_MAP, STATUS_CONFIG } from "@/db/schema";
import { getAuthUser } from "@/lib/supabase/server";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import { RequestsListClient, type RequestsListRow } from "./_components/RequestsListClient";

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const authUser = await getAuthUser();
  const appUser = authUser
    ? await getOrCreateAppUserFromAuthUser({
      id: authUser.id,
      email: authUser.email ?? null,
      user_metadata: authUser.user_metadata ?? null,
    })
    : null;

  const showRequester = appUser?.role !== "requester";

  // Handle Date Presets
  let dateRange: { from?: Date; to?: Date } | undefined;
  const datePreset = typeof params.datePreset === 'string' ? params.datePreset : undefined;

  if (datePreset && datePreset !== "all") {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (datePreset === "yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const endYesterday = new Date(today); // Today 00:00 is end of yesterday loosely if considering < today, or use detailed 23:59
      // Simply: [yesterday 00:00, today 00:00]
      dateRange = { from: yesterday, to: today }; // to is exclusive logic usually? But logic is lte. so set to 23:59:59
      const yEnd = new Date(yesterday);
      yEnd.setHours(23, 59, 59, 999);
      dateRange = { from: yesterday, to: yEnd };
    } else if (datePreset === "daily") { // Today
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

  const requests = await getRequests({
    status: params.status,
    category: params.category,
    search: typeof params.search === 'string' ? params.search : undefined,
    dateRange,
  });

  const rows: RequestsListRow[] = requests.map((req) => {
    const cat = CATEGORY_MAP[req.category];
    const statusCfg = STATUS_CONFIG[req.status];
    return {
      id: req.id,
      ticketNumber: String(req.ticket_number).padStart(4, "0"),
      category: cat?.label ?? req.category,
      categoryKey: req.category,
      priority: req.priority,
      status: req.status,
      statusLabel: statusCfg?.label ?? req.status,
      branchName: req.branch_name ?? "—",
      requesterName: req.requester_name ?? req.requester_email ?? "Unknown",
      created_at_iso: req.created_at.toISOString(),
    };
  });

  return (
    <RequestsListClient
      rows={rows}
      initialQuery={typeof params.search === 'string' ? params.search : undefined}
      showRequester={showRequester}
    />
  );
}
