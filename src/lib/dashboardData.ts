import { db } from "@/db";
import { budgets, budgetItems, users } from "@/db/schema";
import { desc, eq, inArray, and, gte, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

// Helper to format PHP currency
export function formatPhp(amount: string) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "₱0";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);
}

// Helper to format short date
export function formatDateShort(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${month}-${day}-${yy}`;
}

// Cached dashboard data fetchers with short TTL for freshness
export const getRequesterDashboardData = unstable_cache(
  async (userId: string) => {
    // Run queries in parallel
    const [myBudgets, items] = await Promise.all([
      db.query.budgets.findMany({
        where: eq(budgets.user_id, userId),
        orderBy: [desc(budgets.created_at)],
        limit: 50,
      }),
      db
        .select({
          budget_id: budgetItems.budget_id,
          description: budgetItems.description,
        })
        .from(budgetItems)
        .innerJoin(budgets, eq(budgetItems.budget_id, budgets.id))
        .where(eq(budgets.user_id, userId))
        .limit(200),
    ]);

    return { myBudgets, items };
  },
  ["requester-dashboard"],
  { revalidate: 30, tags: ["dashboard", "budgets"] },
);

export const getReviewerDashboardData = unstable_cache(
  async () => {
    const reviewStatuses = [
      "submitted",
      "verified_by_reviewer",
      "revision_requested",
    ] as const;

    // Run queries in parallel
    const [reviewerBudgets, reviewerBudgetsWithDept] = await Promise.all([
      db.query.budgets.findMany({
        where: inArray(budgets.status, [...reviewStatuses]),
        orderBy: [desc(budgets.created_at)],
        limit: 50,
      }),
      db
        .select({
          id: budgets.id,
          budget_number: budgets.budget_number,
          budget_type: budgets.budget_type,
          total_amount: budgets.total_amount,
          status: budgets.status,
          created_at: budgets.created_at,
          department: users.department,
        })
        .from(budgets)
        .leftJoin(users, eq(budgets.user_id, users.id))
        .where(inArray(budgets.status, [...reviewStatuses]))
        .orderBy(desc(budgets.created_at))
        .limit(4),
    ]);

    // Get items for reviewer budgets
    const budgetIds = reviewerBudgets.map((b) => b.id);
    const items =
      budgetIds.length === 0
        ? []
        : await db
            .select({
              budget_id: budgetItems.budget_id,
              description: budgetItems.description,
            })
            .from(budgetItems)
            .where(inArray(budgetItems.budget_id, budgetIds));

    return { reviewerBudgets, reviewerBudgetsWithDept, items };
  },
  ["reviewer-dashboard"],
  { revalidate: 30, tags: ["dashboard", "budgets"] },
);

export const getApproverDashboardData = unstable_cache(
  async () => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Run all count queries in parallel
    const [
      totalApprovedResult,
      awaitingApprovalResult,
      approvedThisMonthResult,
      rejectedResult,
      recentProposals,
    ] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(budgets)
        .where(eq(budgets.status, "approved")),
      db
        .select({ count: sql<number>`count(*)` })
        .from(budgets)
        .where(inArray(budgets.status, ["verified", "verified_by_reviewer"])),
      db
        .select({ count: sql<number>`count(*)` })
        .from(budgets)
        .where(
          and(
            eq(budgets.status, "approved"),
            gte(budgets.updated_at, startOfMonth),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(budgets)
        .where(eq(budgets.status, "rejected")),
      db
        .select({
          id: budgets.id,
          budget_number: budgets.budget_number,
          budget_type: budgets.budget_type,
          total_amount: budgets.total_amount,
          status: budgets.status,
          created_at: budgets.created_at,
          department: users.department,
        })
        .from(budgets)
        .leftJoin(users, eq(budgets.user_id, users.id))
        .where(
          inArray(budgets.status, [
            "approved",
            "verified",
            "verified_by_reviewer",
            "rejected",
          ]),
        )
        .orderBy(desc(budgets.created_at))
        .limit(4),
    ]);

    // Get items for recent proposals
    const budgetIds = recentProposals.map((b) => b.id);
    const items =
      budgetIds.length === 0
        ? []
        : await db
            .select({
              budget_id: budgetItems.budget_id,
              description: budgetItems.description,
            })
            .from(budgetItems)
            .where(inArray(budgetItems.budget_id, budgetIds));

    return {
      totalApproved: Number(totalApprovedResult[0]?.count ?? 0),
      awaitingApproval: Number(awaitingApprovalResult[0]?.count ?? 0),
      approvedThisMonth: Number(approvedThisMonthResult[0]?.count ?? 0),
      rejected: Number(rejectedResult[0]?.count ?? 0),
      recentProposals,
      items,
    };
  },
  ["approver-dashboard"],
  { revalidate: 30, tags: ["dashboard", "budgets"] },
);

export const getSuperadminDashboardData = unstable_cache(
  async () => {
    // Fetch all data in parallel
    const [requesterData, reviewerData, approverData, pendingUsers] =
      await Promise.all([
        // All budgets for superadmin view
        db.query.budgets.findMany({
          orderBy: [desc(budgets.created_at)],
          limit: 50,
        }),
        getReviewerDashboardData(),
        getApproverDashboardData(),
        db.query.users.findMany({
          where: eq(users.approval_status, "pending"),
        }),
      ]);

    // Get items for requester budgets
    const budgetIds = requesterData.map((b) => b.id);
    const requesterItems =
      budgetIds.length === 0
        ? []
        : await db
            .select({
              budget_id: budgetItems.budget_id,
              description: budgetItems.description,
            })
            .from(budgetItems)
            .where(inArray(budgetItems.budget_id, budgetIds));

    return {
      allBudgets: requesterData,
      requesterItems,
      reviewerData,
      approverData,
      pendingUserCount: pendingUsers.length,
    };
  },
  ["superadmin-dashboard"],
  { revalidate: 30, tags: ["dashboard", "budgets", "users"] },
);
