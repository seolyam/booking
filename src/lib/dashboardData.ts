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

// Serialize filters into a stable string for use as a cache key segment
function serializeFilters(filters?: {
  status?: string[];
  category?: string[];
  dateRange?: { from?: Date; to?: Date };
}): string {
  if (!filters) return "none";
  const parts: string[] = [];
  if (filters.status?.length) parts.push(`s:${filters.status.sort().join(",")}`);
  if (filters.category?.length) parts.push(`c:${filters.category.sort().join(",")}`);
  if (filters.dateRange?.from) parts.push(`df:${filters.dateRange.from.toISOString()}`);
  if (filters.dateRange?.to) parts.push(`dt:${filters.dateRange.to.toISOString()}`);
  return parts.length ? parts.join("|") : "none";
}

type DashboardFilters = {
  status?: string[];
  category?: string[];
  dateRange?: { from?: Date; to?: Date };
};

export async function getRequesterDashboardData(
  userId: string,
  filters?: DashboardFilters,
) {
  const filterKey = serializeFilters(filters);

  return unstable_cache(
    async () => {
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
    ["requester-dashboard", userId, filterKey],
    { revalidate: 30, tags: ["dashboard", "requests"] },
  )();
}

export async function getSuperadminDashboardData(
  filters?: DashboardFilters,
) {
  const filterKey = serializeFilters(filters);

  return unstable_cache(
    async () => {
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
    ["superadmin-dashboard", filterKey],
    { revalidate: 30, tags: ["dashboard", "requests", "users"] },
  )();
}

export async function getAdminDashboardData(
  userId: string,
  filters?: DashboardFilters,
) {
  const filterKey = serializeFilters(filters);

  return unstable_cache(
    async () => {
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
    ["admin-dashboard", userId, filterKey],
    { revalidate: 30, tags: ["dashboard", "requests"] },
  )();
}
