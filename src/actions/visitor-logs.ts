"use server";

import { db } from "@/db";
import { visitorLogs } from "@/db/schema";
import { getAuthUser } from "@/lib/supabase/server";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import { eq, desc, and, gte, lte, ilike, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ============================================================================
// Helpers
// ============================================================================

async function requireAdmin() {
  const authUser = await getAuthUser();
  if (!authUser) throw new Error("Not authenticated");
  const appUser = await getOrCreateAppUserFromAuthUser({
    id: authUser.id,
    email: authUser.email ?? null,
    user_metadata: authUser.user_metadata ?? null,
  });
  if (appUser.role !== "admin" && appUser.role !== "superadmin") {
    throw new Error("Insufficient permissions");
  }
  return appUser;
}

// ============================================================================
// Queries
// ============================================================================

export type VisitorLogFilters = {
  search?: string;
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
  status?: "ACTIVE" | "COMPLETED" | "AUTO_CLOSED" | "";
};

export async function getVisitorLogs(filters?: VisitorLogFilters) {
  await requireAdmin();

  const conditions = [];

  // Text search: name or company
  if (filters?.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      or(ilike(visitorLogs.name, term), ilike(visitorLogs.company, term)),
    );
  }

  // Date range
  if (filters?.dateFrom) {
    conditions.push(gte(visitorLogs.time_in, new Date(filters.dateFrom)));
  }
  if (filters?.dateTo) {
    // Include the entire "to" day
    const toDate = new Date(filters.dateTo);
    toDate.setHours(23, 59, 59, 999);
    conditions.push(lte(visitorLogs.time_in, toDate));
  }

  // Status filter
  if (filters?.status) {
    conditions.push(eq(visitorLogs.status, filters.status));
  }

  const rows = await db
    .select()
    .from(visitorLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(visitorLogs.time_in));

  return rows;
}

// ============================================================================
// Mutations
// ============================================================================

export async function clockOutVisitor(
  visitorId: string,
): Promise<{ success: true } | { error: string }> {
  await requireAdmin();

  const existing = await db.query.visitorLogs.findFirst({
    where: eq(visitorLogs.id, visitorId),
  });

  if (!existing) {
    return { error: "Visitor log not found" };
  }

  if (existing.time_out) {
    return { error: "Visitor has already been clocked out" };
  }

  await db
    .update(visitorLogs)
    .set({ time_out: new Date(), status: "COMPLETED" })
    .where(eq(visitorLogs.id, visitorId));

  revalidatePath("/dashboard/admin/visitor-logs");

  return { success: true };
}

export async function deleteVisitorLog(
  visitorId: string,
): Promise<{ success: true } | { error: string }> {
  await requireAdmin();

  const existing = await db.query.visitorLogs.findFirst({
    where: eq(visitorLogs.id, visitorId),
  });

  if (!existing) {
    return { error: "Visitor log not found" };
  }

  await db.delete(visitorLogs).where(eq(visitorLogs.id, visitorId));

  revalidatePath("/dashboard/admin/visitor-logs");

  return { success: true };
}
