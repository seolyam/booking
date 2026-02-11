"use server";

import { db } from "@/db";
import {
  requests,
  users,
  attachments,
  comments,
  activityLogs,
  notifications,
  branches,
  CATEGORY_MAP,
  type Request,
} from "@/db/schema";
import { getAuthUser } from "@/lib/supabase/server";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import { eq, desc, and, count, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z, ZodError } from "zod";

// ============================================================================
// Helpers
// ============================================================================

async function requireAppUser() {
  const authUser = await getAuthUser();
  if (!authUser) throw new Error("Not authenticated");
  return getOrCreateAppUserFromAuthUser({
    id: authUser.id,
    email: authUser.email ?? null,
    user_metadata: authUser.user_metadata ?? null,
  });
}

// ============================================================================
// Queries
// ============================================================================

export async function getDashboardStats() {
  const appUser = await requireAppUser();

  const baseWhere =
    appUser.role === "requester"
      ? eq(requests.requester_id, appUser.id)
      : undefined;

  const [totalResult, pendingResult, approvedResult, rejectedResult] =
    await Promise.all([
      db
        .select({ count: count() })
        .from(requests)
        .where(baseWhere),
      db
        .select({ count: count() })
        .from(requests)
        .where(
          baseWhere
            ? and(baseWhere, inArray(requests.status, ["submitted", "pending_review", "on_hold"]))
            : inArray(requests.status, ["submitted", "pending_review", "on_hold"])
        ),
      db
        .select({ count: count() })
        .from(requests)
        .where(
          baseWhere
            ? and(baseWhere, eq(requests.status, "approved"))
            : eq(requests.status, "approved")
        ),
      db
        .select({ count: count() })
        .from(requests)
        .where(
          baseWhere
            ? and(baseWhere, eq(requests.status, "rejected"))
            : eq(requests.status, "rejected")
        ),
    ]);

  return {
    total: totalResult[0]?.count ?? 0,
    pending: pendingResult[0]?.count ?? 0,
    approved: approvedResult[0]?.count ?? 0,
    rejected: rejectedResult[0]?.count ?? 0,
  };
}

export async function getRecentRequests(limit = 5) {
  const appUser = await requireAppUser();

  const rows = await db
    .select({
      id: requests.id,
      ticket_number: requests.ticket_number,
      title: requests.title,
      category: requests.category,
      status: requests.status,
      priority: requests.priority,
      created_at: requests.created_at,
    })
    .from(requests)
    .where(
      appUser.role === "requester"
        ? eq(requests.requester_id, appUser.id)
        : undefined
    )
    .orderBy(desc(requests.created_at))
    .limit(limit);

  return rows;
}

export async function getRequests(filters?: {
  status?: string;
  category?: string;
  search?: string;
}) {
  const appUser = await requireAppUser();

  const conditions = [];

  // Always filter to show only the user's own requests
  conditions.push(eq(requests.requester_id, appUser.id));

  if (filters?.status && filters.status !== "all") {
    conditions.push(
      eq(requests.status, filters.status as Request["status"])
    );
  }
  if (filters?.category && filters.category !== "all") {
    conditions.push(
      eq(requests.category, filters.category as Request["category"])
    );
  }

  const rows = await db
    .select({
      id: requests.id,
      ticket_number: requests.ticket_number,
      title: requests.title,
      category: requests.category,
      status: requests.status,
      priority: requests.priority,
      created_at: requests.created_at,
      updated_at: requests.updated_at,
      requester_id: requests.requester_id,
      branch_name: branches.name,
      requester_name: users.full_name,
      requester_email: users.email,
    })
    .from(requests)
    .leftJoin(branches, eq(requests.branch_id, branches.id))
    .leftJoin(users, eq(requests.requester_id, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(requests.created_at));

  return rows;
}

export async function getRequestById(id: string) {
  const appUser = await requireAppUser();

  const row = await db.query.requests.findFirst({
    where: eq(requests.id, id),
    with: {
      requester: true,
      branch: true,
      attachments: {
        orderBy: (a, { desc }) => [desc(a.created_at)],
      },
      comments: {
        with: { user: true },
        orderBy: (c, { desc }) => [desc(c.created_at)],
      },
      activityLogs: {
        with: { actor: true },
        orderBy: (a, { desc }) => [desc(a.created_at)],
      },
    },
  });

  if (!row) return null;

  // Requesters can only view their own
  if (appUser.role === "requester" && row.requester_id !== appUser.id) {
    return null;
  }

  return row;
}

export async function getBranches() {
  return db
    .select({ id: branches.id, name: branches.name, code: branches.code })
    .from(branches)
    .where(eq(branches.is_active, true))
    .orderBy(branches.name);
}

// ============================================================================
// Mutations
// ============================================================================

const numeric = z.coerce.number();
const positiveInt = numeric.int().positive();
const optionalNumber = z.preprocess(
  (val) => (val === "" ? undefined : val),
  z.coerce.number().min(0).optional()
);

const CATEGORY_SCHEMAS: Record<string, z.ZodSchema> = {
  flight_booking: z.object({
    number_of_passengers: positiveInt,
    allocated_budget: optionalNumber,
  }).passthrough(),
  hotel_accommodation: z.object({
    number_of_rooms: positiveInt,
    number_of_guests: positiveInt,
    allocated_budget: optionalNumber,
  }).passthrough(),
  meals: z.object({
    number_of_pax: positiveInt,
    allocated_budget: optionalNumber,
  }).passthrough(),
  room_reservation: z.object({
    number_of_attendees: positiveInt,
  }).passthrough(),
  equipments_assets: z.object({
    quantity: positiveInt,
    unit_cost: optionalNumber,
    total_budget: optionalNumber,
  }).passthrough(),
};

const createRequestSchema = z.object({
  title: z.string().min(1, "Project title is required"),
  category: z.string().min(1, "Category is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  branch_id: z.string().uuid("Branch is required"),
  form_data: z.record(z.string(), z.unknown()),
  status: z.enum(["draft", "submitted"]).default("draft"),
});

export async function createRequest(formData: {
  title: string;
  category: string;
  priority: string;
  branch_id: string;
  form_data: Record<string, unknown>;
  status?: "draft" | "submitted";
}) {
  const appUser = await requireAppUser();

  try {
    const parsed = createRequestSchema.parse(formData);

    // Additional validation/coercion for form_data based on category
    const categorySchema = CATEGORY_SCHEMAS[parsed.category];
    let processedFormData = parsed.form_data;

    if (categorySchema) {
      // This will coerce strings to numbers where defined, and pass through other fields
      processedFormData = categorySchema.parse(parsed.form_data) as Record<string, unknown>;
    }

    const [inserted] = await db
      .insert(requests)
      .values({
        title: parsed.title,
        category: parsed.category as Request["category"],
        priority: parsed.priority as Request["priority"],
        branch_id: parsed.branch_id,
        requester_id: appUser.id,
        form_data: processedFormData,
        status: parsed.status ?? "draft",
      })
      .returning({ id: requests.id, ticket_number: requests.ticket_number });

    if (!inserted) throw new Error("Failed to create request");

    // Log activity
    await db.insert(activityLogs).values({
      request_id: inserted.id,
      actor_id: appUser.id,
      action: parsed.status === "submitted" ? "submitted" : "created",
      new_status: parsed.status ?? "draft",
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/requests");

    return { id: inserted.id, ticket_number: inserted.ticket_number };
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors = error.issues.map((err) => {
        const path = err.path.join(".");
        return `${path}: ${err.message}`;
      });
      throw new Error(`Validation failed: ${fieldErrors.join(", ")}`);
    }
    throw error;
  }
}

export async function updateRequestStatus(
  requestId: string,
  newStatus: string,
  comment?: string
) {
  const appUser = await requireAppUser();

  const existing = await db.query.requests.findFirst({
    where: eq(requests.id, requestId),
  });
  if (!existing) throw new Error("Request not found");

  // Only admins/superadmins can approve/reject; requesters can submit/cancel
  if (appUser.role === "requester") {
    if (!["submitted", "draft"].includes(newStatus)) {
      throw new Error("Insufficient permissions");
    }
    if (existing.requester_id !== appUser.id) {
      throw new Error("Not your request");
    }
  }

  const previousStatus = existing.status;

  await db
    .update(requests)
    .set({
      status: newStatus as Request["status"],
      updated_at: new Date(),
      ...(newStatus === "rejected" && comment
        ? { rejection_reason: comment }
        : {}),
      ...(newStatus === "closed"
        ? { closed_at: new Date(), closed_by: appUser.id }
        : {}),
    })
    .where(eq(requests.id, requestId));

  // Log activity
  await db.insert(activityLogs).values({
    request_id: requestId,
    actor_id: appUser.id,
    action: `status_changed_to_${newStatus}`,
    previous_status: previousStatus,
    new_status: newStatus,
    comment: comment ?? null,
  });

  // Notify requester if admin changed status
  if (appUser.id !== existing.requester_id) {
    const categoryMeta = CATEGORY_MAP[existing.category];
    await db.insert(notifications).values({
      user_id: existing.requester_id,
      title: `Request ${newStatus}`,
      message: `Your ${categoryMeta?.label ?? existing.category} request "${existing.title}" has been ${newStatus}.`,
      type: newStatus === "approved" ? "success" : newStatus === "rejected" ? "error" : "info",
      link: `/dashboard/requests/${requestId}`,
      resource_id: requestId,
      resource_type: "request",
    });
  }

  // Also add to comments table if a comment was provided, so it appears in the discussion thread
  if (comment && comment.trim()) {
    await db.insert(comments).values({
      request_id: requestId,
      user_id: appUser.id,
      content: comment.trim(),
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/requests");
  revalidatePath(`/dashboard/requests/${requestId}`);

  return { success: true };
}

export async function addComment(requestId: string, content: string) {
  const appUser = await requireAppUser();

  if (!content.trim()) throw new Error("Comment cannot be empty");

  const existing = await db.query.requests.findFirst({
    where: eq(requests.id, requestId),
  });
  if (!existing) throw new Error("Request not found");

  // Requesters can only comment on their own requests
  if (appUser.role === "requester" && existing.requester_id !== appUser.id) {
    throw new Error("Not your request");
  }

  await db.insert(comments).values({
    request_id: requestId,
    user_id: appUser.id,
    content: content.trim(),
  });

  // Log activity
  await db.insert(activityLogs).values({
    request_id: requestId,
    actor_id: appUser.id,
    action: "comment_added",
    comment: content.trim(),
  });

  // Notify the other party
  const notifyUserId =
    appUser.id === existing.requester_id ? null : existing.requester_id;
  if (notifyUserId) {
    await db.insert(notifications).values({
      user_id: notifyUserId,
      title: "New comment",
      message: `${appUser.fullName ?? "Someone"} commented on "${existing.title}".`,
      type: "info",
      link: `/dashboard/requests/${requestId}`,
      resource_id: requestId,
      resource_type: "request",
    });
  }

  revalidatePath(`/dashboard/requests/${requestId}`);

  return { success: true };
}

export async function saveAttachments(
  requestId: string,
  files: {
    fileName: string;
    filePath: string;
    fileSize: number;
    fileType: string;
  }[]
) {
  const appUser = await requireAppUser();

  if (files.length === 0) return { success: true };

  const values = files.map((f) => ({
    request_id: requestId,
    file_name: f.fileName,
    file_path: f.filePath,
    file_size: f.fileSize,
    file_type: f.fileType,
    uploaded_by: appUser.id,
  }));

  await db.insert(attachments).values(values);

  revalidatePath(`/dashboard/requests/${requestId}`);
  return { success: true };
}
