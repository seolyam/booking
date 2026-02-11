import { db } from "@/db";
import { requests, users, adminBranches } from "@/db/schema";
import { desc, eq, inArray, gte, lte, and } from "drizzle-orm";
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
  async (userId: string, filters?: { status?: string[]; category?: string[]; dateRange?: { from?: Date; to?: Date } }) => {
    const conditions = [eq(requests.requester_id, userId)];

    if (filters?.status && filters.status.length > 0 && !filters.status.includes("all")) {
      conditions.push(inArray(requests.status, filters.status as any[]));
    }
    if (filters?.category && filters.category.length > 0 && !filters.category.includes("all")) {
      conditions.push(inArray(requests.category, filters.category as any[]));
    }
    if (filters?.dateRange?.from) {
      conditions.push(gte(requests.created_at, filters.dateRange.from));
    }
    if (filters?.dateRange?.to) {
      conditions.push(lte(requests.created_at, filters.dateRange.to));
    }

    const myRequests = await db.query.requests.findMany({
      where: and(...conditions),
      with: {
        branch: true,
      },
      orderBy: [desc(requests.created_at)],
      limit: 50,
    });

    // Stats calculations likely should be on unfiltered data, or filtered?
    // Usually stats are global for the user, but lists are filtered.
    // However, if the user filters by date, maybe they want stats for that date?
    // I'll keep stats simple for now (based on returned requests? No, dashboard stats usually global).
    // The previous implementation calculated stats from `myRequests` (which was unfiltered except userId).
    // If calculate stats based on *filtered* requests, then stats describe the view. This is usually expected behavior for dashboards with filters.
    // So using filtered `myRequests` for stats is correct. 

    const stats = {
      totalSubmitted: myRequests.filter((r) => r.status !== "draft").length,
      pendingReview: myRequests.filter(
        (r) => r.status === "submitted" || r.status === "pending_review" || r.status === "resubmitted",
      ).length,
      approved: myRequests.filter((r) => r.status === "approved").length,
      onHold: myRequests.filter((r) => r.status === "on_hold").length,
      needsRevision: myRequests.filter((r) => r.status === "needs_revision").length,
    };

    return { myRequests, stats };
  },
  ["requester-dashboard"],
  { revalidate: 30, tags: ["dashboard", "requests"] },
);

export const getSuperadminDashboardData = unstable_cache(
  async (filters?: { status?: string[]; category?: string[]; dateRange?: { from?: Date; to?: Date } }) => {
    const conditions = [];

    if (filters?.status && filters.status.length > 0 && !filters.status.includes("all")) {
      conditions.push(inArray(requests.status, filters.status as any[]));
    }
    if (filters?.category && filters.category.length > 0 && !filters.category.includes("all")) {
      conditions.push(inArray(requests.category, filters.category as any[]));
    }
    if (filters?.dateRange?.from) {
      conditions.push(gte(requests.created_at, filters.dateRange.from));
    }
    if (filters?.dateRange?.to) {
      conditions.push(lte(requests.created_at, filters.dateRange.to));
    }

    const [allRequests, pendingUsers] = await Promise.all([
      db.query.requests.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
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
        (r) => r.status === "submitted" || r.status === "pending_review" || r.status === "resubmitted",
      ).length,
      approved: nonDraft.filter((r) => r.status === "approved").length,
      rejected: nonDraft.filter((r) => r.status === "rejected").length,
      onHold: nonDraft.filter((r) => r.status === "on_hold").length,
      needsRevision: nonDraft.filter((r) => r.status === "needs_revision").length,
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

export const getAdminDashboardData = unstable_cache(
  async (userId: string, filters?: { status?: string[]; category?: string[]; dateRange?: { from?: Date; to?: Date } }) => {
    // Get branches assigned to this admin
    const assignments = await db.query.adminBranches.findMany({
      where: eq(adminBranches.admin_id, userId),
      columns: { branch_id: true }
    });
    const branchIds = assignments.map(b => b.branch_id);

    if (branchIds.length === 0) {
      return {
        allRequests: [],
        stats: {
          totalRequests: 0,
          pendingReview: 0,
          approved: 0,
          rejected: 0,
          onHold: 0,
          closed: 0
        }
      };
    }

    const conditions = [inArray(requests.branch_id, branchIds)];

    if (filters?.status && filters.status.length > 0 && !filters.status.includes("all")) {
      conditions.push(inArray(requests.status, filters.status as any[]));
    }
    if (filters?.category && filters.category.length > 0 && !filters.category.includes("all")) {
      conditions.push(inArray(requests.category, filters.category as any[]));
    }
    if (filters?.dateRange?.from) {
      conditions.push(gte(requests.created_at, filters.dateRange.from));
    }
    if (filters?.dateRange?.to) {
      conditions.push(lte(requests.created_at, filters.dateRange.to));
    }

    const allRequests = await db.query.requests.findMany({
      where: and(...conditions),
      with: {
        branch: true,
        requester: true,
      },
      orderBy: [desc(requests.created_at)],
      limit: 100,
    });

    const nonDraft = allRequests.filter((r) => r.status !== "draft");

    const stats = {
      totalRequests: nonDraft.length,
      pendingReview: nonDraft.filter(
        (r) => r.status === "submitted" || r.status === "pending_review" || r.status === "resubmitted",
      ).length,
      approved: nonDraft.filter((r) => r.status === "approved").length,
      rejected: nonDraft.filter((r) => r.status === "rejected").length,
      onHold: nonDraft.filter((r) => r.status === "on_hold").length,
      needsRevision: nonDraft.filter((r) => r.status === "needs_revision").length,
      closed: nonDraft.filter((r) => r.status === "closed").length,
    };

    return {
      allRequests,
      stats,
    };
  },
  ["admin-dashboard"],
  { revalidate: 30, tags: ["dashboard", "requests"] },
);
