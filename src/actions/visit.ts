"use server";

import { db } from "@/db";
import { visitorLogs } from "@/db/schema";
import { eq, and, lte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ============================================================================
// Validation Schemas
// ============================================================================

const CheckInSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  contact_number: z.string().optional(),
  purpose_of_visit: z.string().min(1, "Purpose of visit is required"),
  expected_duration: z.number().int().positive("Duration is required"),
});

const ExtendSchema = z.object({
  visitId: z.string().uuid(),
  additionalMinutes: z.number().int().positive(),
});

// ============================================================================
// Duration options (minutes)
// ============================================================================

// Duration/extend options are now shared for client/server (import in client/server files as needed)

// ============================================================================
// Types
// ============================================================================

export type VisitState =
  | { type: "NEW" }
  | { type: "EXPIRED"; visitId: string }
  | {
      type: "ACTIVE";
      visit: {
        id: string;
        name: string;
        company: string | null;
        purpose_of_visit: string;
        time_in: Date;
        expected_end_time: Date | null;
        expected_duration: number | null;
        status: "ACTIVE" | "COMPLETED" | "AUTO_CLOSED";
      };
    };

// ============================================================================
// Smart QR Scan Logic
// ============================================================================

/**
 * Determines the state of a visit based on a stored visitId.
 * Called from the client to decide what UI to show.
 */
export async function resolveVisitState(
  visitId: string | null,
): Promise<VisitState> {
  if (!visitId) {
    return { type: "NEW" };
  }

  const visit = await db.query.visitorLogs.findFirst({
    where: eq(visitorLogs.id, visitId),
  });

  if (!visit) {
    return { type: "NEW" };
  }

  // Already completed or auto-closed
  if (visit.status !== "ACTIVE") {
    return { type: "NEW" };
  }

  const now = new Date();

  // Scenario A: Visit has expired
  if (visit.expected_end_time && now > visit.expected_end_time) {
    // Auto-close the expired visit
    await db
      .update(visitorLogs)
      .set({
        status: "AUTO_CLOSED",
        time_out: visit.expected_end_time,
        auto_closed: true,
      })
      .where(eq(visitorLogs.id, visitId));

    revalidatePath("/dashboard/admin/visitor-logs");

    return { type: "EXPIRED", visitId };
  }

  // Scenario B: Visit is still active
  return {
    type: "ACTIVE",
    visit: {
      id: visit.id,
      name: visit.name,
      company: visit.company,
      purpose_of_visit: visit.purpose_of_visit,
      time_in: visit.time_in,
      expected_end_time: visit.expected_end_time,
      expected_duration: visit.expected_duration,
      status: visit.status,
    },
  };
}

// ============================================================================
// Check In (New Visit)
// ============================================================================

export async function checkInVisitor(formData: {
  name: string;
  company?: string;
  contact_number?: string;
  purpose_of_visit: string;
  expected_duration: number;
}): Promise<{ visitId: string } | { error: string }> {
  const parsed = CheckInSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, company, contact_number, purpose_of_visit, expected_duration } =
    parsed.data;

  const now = new Date();
  const expectedEndTime = new Date(now.getTime() + expected_duration * 60_000);

  const [inserted] = await db
    .insert(visitorLogs)
    .values({
      name,
      company: company || null,
      contact_number: contact_number || null,
      purpose_of_visit,
      expected_duration,
      expected_end_time: expectedEndTime,
      status: "ACTIVE",
      auto_closed: false,
      time_in: now,
    })
    .returning({ id: visitorLogs.id });

  revalidatePath("/dashboard/admin/visitor-logs");

  return { visitId: inserted.id };
}

// ============================================================================
// Log Out (Early)
// ============================================================================

export async function logOutVisitor(
  visitId: string,
): Promise<{ success: true } | { error: string }> {
  if (!visitId) return { error: "No visit ID provided" };

  const visit = await db.query.visitorLogs.findFirst({
    where: eq(visitorLogs.id, visitId),
  });

  if (!visit) return { error: "Visit not found" };
  if (visit.status !== "ACTIVE") return { error: "Visit is not active" };

  await db
    .update(visitorLogs)
    .set({
      status: "COMPLETED",
      time_out: new Date(),
    })
    .where(eq(visitorLogs.id, visitId));

  revalidatePath("/dashboard/admin/visitor-logs");

  return { success: true };
}

// ============================================================================
// Extend Visit
// ============================================================================

export async function extendVisit(data: {
  visitId: string;
  additionalMinutes: number;
}): Promise<{ newEndTime: string } | { error: string }> {
  const parsed = ExtendSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { visitId, additionalMinutes } = parsed.data;

  const visit = await db.query.visitorLogs.findFirst({
    where: eq(visitorLogs.id, visitId),
  });

  if (!visit) return { error: "Visit not found" };
  if (visit.status !== "ACTIVE") return { error: "Visit is not active" };

  const currentEnd = visit.expected_end_time ?? new Date();
  const now = new Date();
  // Extend from whichever is later: now or the current expected end
  const base = currentEnd > now ? currentEnd : now;
  const newEndTime = new Date(base.getTime() + additionalMinutes * 60_000);

  const newDuration = (visit.expected_duration ?? 0) + additionalMinutes;

  await db
    .update(visitorLogs)
    .set({
      expected_end_time: newEndTime,
      expected_duration: newDuration,
    })
    .where(eq(visitorLogs.id, visitId));

  revalidatePath("/dashboard/admin/visitor-logs");

  return { newEndTime: newEndTime.toISOString() };
}

// ============================================================================
// Bulk Auto-Close (used by cron route)
// ============================================================================

export async function autoCloseExpiredVisits(): Promise<{
  closedCount: number;
}> {
  const now = new Date();

  const result = await db
    .update(visitorLogs)
    .set({
      status: "AUTO_CLOSED",
      time_out: sql`${visitorLogs.expected_end_time}`,
      auto_closed: true,
    })
    .where(
      and(
        eq(visitorLogs.status, "ACTIVE"),
        lte(visitorLogs.expected_end_time, now),
      ),
    )
    .returning({ id: visitorLogs.id });

  if (result.length > 0) {
    revalidatePath("/dashboard/admin/visitor-logs");
  }

  return { closedCount: result.length };
}
