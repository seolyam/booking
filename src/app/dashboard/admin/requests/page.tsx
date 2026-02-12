
import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CATEGORY_MAP, STATUS_CONFIG } from "@/db/schema";
import { RequestsListClient, type RequestsListRow } from "../../requests/_components/RequestsListClient";

export const dynamic = "force-dynamic";

export default async function AdminAllRequestsPage() {
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

  const allRequests = await db.query.requests.findMany({
    with: {
      requester: { columns: { full_name: true, email: true } },
      branch: { columns: { name: true } },
    },
    orderBy: (requests, { desc }) => [desc(requests.created_at)],
    limit: 200,
  });

  const rows: RequestsListRow[] = allRequests.map((req) => {
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
      branchName: req.branch?.name ?? "N/A",
      requesterName: req.requester?.full_name ?? req.requester?.email ?? "Unknown",
      created_at_iso: req.created_at.toISOString(),
    };
  });

  return (
    <div className="space-y-6">
      <RequestsListClient rows={rows} showRequester={true} />
    </div>
  );
}
