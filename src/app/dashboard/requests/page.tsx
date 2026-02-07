import { getRequests } from "@/actions/request";
import { CATEGORY_MAP, STATUS_CONFIG } from "@/db/schema";
import { getAuthUser } from "@/lib/supabase/server";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import { RequestsListClient, type RequestsListRow, type StatusFilter } from "./_components/RequestsListClient";

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; search?: string }>;
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

  const requests = await getRequests({
    status: params.status,
    category: params.category,
    search: params.search,
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
      initialQuery={params.search}
      initialStatus={params.status as StatusFilter}
      showRequester={showRequester}
    />
  );
}
