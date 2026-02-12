"use server";

import { db } from "@/db";
import { visitorLogs } from "@/db/schema";
import { getAuthUser } from "@/lib/supabase/server";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z, ZodError } from "zod";

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
// Schemas
// ============================================================================

const logVisitorSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  company: z.string().max(255).optional().nullable(),
  contact_number: z.string().max(50).optional().nullable(),
  purpose_of_visit: z.string().min(1, "Purpose of visit is required").max(1000),
});

// ============================================================================
// Queries
// ============================================================================

export async function getVisitorLogs(filters?: {
  dateRange?: { from?: Date; to?: Date };
}) {
  await requireAdmin();

  const conditions = [];

  if (filters?.dateRange?.from) {
    conditions.push(gte(visitorLogs.time_in, filters.dateRange.from));
  }
  if (filters?.dateRange?.to) {
    conditions.push(lte(visitorLogs.time_in, filters.dateRange.to));
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

export async function logVisitor(formData: {
  name: string;
  company?: string | null;
  contact_number?: string | null;
  purpose_of_visit: string;
}): Promise<{ id: string } | { error: string }> {
  await requireAdmin();

  try {
    const parsed = logVisitorSchema.parse(formData);

    const [inserted] = await db
      .insert(visitorLogs)
      .values({
        name: parsed.name,
        company: parsed.company ?? null,
        contact_number: parsed.contact_number ?? null,
        purpose_of_visit: parsed.purpose_of_visit,
      })
      .returning({ id: visitorLogs.id });

    if (!inserted) throw new Error("Failed to log visitor");

    revalidatePath("/dashboard/admin/visitor-logs");

    return { id: inserted.id };
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors = error.issues.map((err) => {
        const path = err.path.join(".");
        return `${path}: ${err.message}`;
      });
      return { error: `Validation failed: ${fieldErrors.join(", ")}` };
    }
    throw error;
  }
}

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
    .set({ time_out: new Date() })
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
