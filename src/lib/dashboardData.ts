import { db } from "@/db";
import { requests, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";

// Helper to format date short
export function formatDateShort(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${month}-${day}-${yy}`;
}

// Format ticket number for display
export function formatTicketNumber(ticketNumber: number): string {
  return `REQ-${String(ticketNumber).padStart(4, "0")}`;
}

export const getRequesterDashboardData = unstable_cache(
  async (userId: string) => {
    const myRequests = await db.query.requests.findMany({
      where: eq(requests.requester_id, userId),
      with: {
        branch: true,
      },
      orderBy: [desc(requests.created_at)],
      limit: 50,
    });

    const stats = {
      totalSubmitted: myRequests.filter((r) => r.status !== "draft").length,
      pendingReview: myRequests.filter(
        (r) => r.status === "submitted" || r.status === "pending_review",
      ).length,
      approved: myRequests.filter((r) => r.status === "approved").length,
      onHold: myRequests.filter((r) => r.status === "on_hold").length,
    };

    return { myRequests, stats };
  },
  ["requester-dashboard"],
  { revalidate: 30, tags: ["dashboard", "requests"] },
);

export const getSuperadminDashboardData = unstable_cache(
  async () => {
    const [allRequests, pendingUsers] = await Promise.all([
      db.query.requests.findMany({
        with: {
          branch: true,
          requester: true,
        },
        orderBy: [desc(requests.created_at)],
        limit: 100,
      }),
      db.query.users.findMany({
        where: eq(users.approval_status, "pending"),
      }),
    ]);

    const nonDraft = allRequests.filter((r) => r.status !== "draft");

    const stats = {
      totalRequests: nonDraft.length,
      pendingReview: nonDraft.filter(
        (r) => r.status === "submitted" || r.status === "pending_review",
      ).length,
      approved: nonDraft.filter((r) => r.status === "approved").length,
      rejected: nonDraft.filter((r) => r.status === "rejected").length,
      onHold: nonDraft.filter((r) => r.status === "on_hold").length,
      closed: nonDraft.filter((r) => r.status === "closed").length,
    };

    return {
      allRequests,
      stats,
      pendingUserCount: pendingUsers.length,
    };
  },
  ["superadmin-dashboard"],
  { revalidate: 30, tags: ["dashboard", "requests", "users"] },
);
