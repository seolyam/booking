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
import { eq, desc, and, count, inArray, gte, lte, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z, ZodError } from "zod";
import {
  sendNewRequestNotification,
  sendStatusChangeNotification,
  sendRatingRequestEmail,
} from "@/lib/email";

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

async function getAdminEmails(): Promise<string[]> {
  const admins = await db
    .select({ email: users.email })
    .from(users)
    .where(
      and(
        or(eq(users.role, "admin"), eq(users.role, "superadmin")),
        eq(users.approval_status, "approved"),
      ),
    );
  return admins.map((a) => a.email);
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

  const [totalResult, openResult, pendingResult, resolvedResult, cancelledResult] =
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
            ? and(baseWhere, eq(requests.status, "open"))
            : eq(requests.status, "open")
        ),
      db
        .select({ count: count() })
        .from(requests)
        .where(
          baseWhere
            ? and(baseWhere, eq(requests.status, "pending"))
            : eq(requests.status, "pending")
        ),
      db
        .select({ count: count() })
        .from(requests)
        .where(
          baseWhere
            ? and(baseWhere, eq(requests.status, "resolved"))
            : eq(requests.status, "resolved")
        ),
      db
        .select({ count: count() })
        .from(requests)
        .where(
          baseWhere
            ? and(baseWhere, eq(requests.status, "cancelled"))
            : eq(requests.status, "cancelled")
        ),
    ]);

  return {
    total: totalResult[0]?.count ?? 0,
    open: openResult[0]?.count ?? 0,
    pending: pendingResult[0]?.count ?? 0,
    resolved: resolvedResult[0]?.count ?? 0,
    cancelled: cancelledResult[0]?.count ?? 0,
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
  status?: string | string[];
  category?: string | string[];
  search?: string;
  dateRange?: { from?: Date; to?: Date };
}) {
  const appUser = await requireAppUser();

  const conditions = [];

  // Filter by user role
  if (appUser.role === "requester") {
    conditions.push(eq(requests.requester_id, appUser.id));
  } else {
    // For admins/superadmins: show requests they created OR resolved
    conditions.push(
      or(
        eq(requests.requester_id, appUser.id),
        eq(requests.closed_by, appUser.id)
      )
    );
  }

  if (filters?.status && filters.status !== "all") {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    // Filter out "all" if present in array
    const cleanStatuses = statuses.filter(s => s !== "all");
    if (cleanStatuses.length > 0) {
      conditions.push(inArray(requests.status, cleanStatuses as Request["status"][]));
    }
  }

  if (filters?.category && filters.category !== "all") {
    const categories = Array.isArray(filters.category) ? filters.category : [filters.category];
    const cleanCategories = categories.filter(c => c !== "all");
    if (cleanCategories.length > 0) {
      conditions.push(inArray(requests.category, cleanCategories as Request["category"][]));
    }
  }

  if (filters?.dateRange) {
    if (filters.dateRange.from) {
      conditions.push(gte(requests.created_at, filters.dateRange.from));
    }
    if (filters.dateRange.to) {
      conditions.push(lte(requests.created_at, filters.dateRange.to));
    }
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
  const result = await db
    .select({ id: branches.id, name: branches.name, code: branches.code })
    .from(branches)
    .where(eq(branches.is_active, true));

  // Sort: Prime/MAIN first, Ignite/IGP last, others in specified order if possible.
  // The user asked for "Prime Electric at the top" and "Ignite Power at the bottom".
  // The previous list was: Prime Electric, Negros Power, MORE Power, Bohol Light, Ignite Power.

  const sortOrder = ["MAIN", "NGP", "MOR", "BHL", "IGP"];

  return result.sort((a, b) => {
    const indexA = sortOrder.indexOf(a.code);
    const indexB = sortOrder.indexOf(b.code);

    // If not in the list, push to end, but before explicitly last items if any (none here since all are in list)
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });
}

// ============================================================================
// Mutations
// ============================================================================

const optionalPositiveInt = z.preprocess(
  (val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    return Number(val);
  },
  z.number({ invalid_type_error: "Must be a number" }).int().positive("Must be greater than 0").optional()
);

const optionalNumber = z.preprocess(
  (val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    return Number(val);
  },
  z.number({ invalid_type_error: "Must be a number" }).min(0).optional()
);

const CATEGORY_SCHEMAS: Record<string, z.ZodSchema> = {
  flight_booking: z.object({
    number_of_passengers: optionalPositiveInt,
    allocated_budget: optionalNumber,
  }).passthrough(),
  hotel_accommodation: z.object({
    number_of_rooms: optionalPositiveInt,
    number_of_guests: optionalPositiveInt,
    allocated_budget: optionalNumber,
  }).passthrough(),
  meals: z.object({
    number_of_pax: optionalPositiveInt,
    allocated_budget: optionalNumber,
  }).passthrough(),
  room_reservation: z.object({
    number_of_attendees: optionalPositiveInt,
  }).passthrough(),
  equipments_assets: z.object({
    quantity: optionalPositiveInt,
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
  status: z.enum(["open"]).default("open"),
});

export async function createRequest(formData: {
  title: string;
  category: string;
  priority: string;
  branch_id: string;
  form_data: Record<string, unknown>;
  status?: "open";
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
        status: parsed.status ?? "open",
      })
      .returning({ id: requests.id, ticket_number: requests.ticket_number });

    if (!inserted) throw new Error("Failed to create request");

    // Log activity
    await db.insert(activityLogs).values({
      request_id: inserted.id,
      actor_id: appUser.id,
      action: "created",
      new_status: parsed.status ?? "open",
    });

    // Notify all admins via email (fire-and-forget)
    const categoryMeta = CATEGORY_MAP[parsed.category];
    getAdminEmails().then((adminEmails) => {
      sendNewRequestNotification({
        adminEmails,
        requesterName: appUser.fullName ?? appUser.email,
        requestTitle: parsed.title,
        category: categoryMeta?.label ?? parsed.category,
        requestId: inserted.id,
      }).catch(() => { });
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
  comment?: string,
  skipRevalidation = false
) {
  const appUser = await requireAppUser();

  const existing = await db.query.requests.findFirst({
    where: eq(requests.id, requestId),
  });
  if (!existing) throw new Error("Request not found");

  // Only admins/superadmins can resolve/cancel; requesters can reopen their own
  if (appUser.role === "requester") {
    if (!["open"].includes(newStatus)) {
      throw new Error("Insufficient permissions");
    }
    if (existing.requester_id !== appUser.id) {
      throw new Error("Not your request");
    }
  }

  // Transition validation
  const VALID_TRANSITIONS: Record<string, string[]> = {
    open: ["pending", "cancelled"],
    pending: ["open", "resolved", "cancelled"],
    resolved: ["pending"],  // reopen
    cancelled: [],           // terminal
  };

  const allowedNextStatuses = VALID_TRANSITIONS[existing.status];
  if (allowedNextStatuses && !allowedNextStatuses.includes(newStatus)) {
    throw new Error(
      `Invalid transition from "${existing.status}" to "${newStatus}"`
    );
  }

  const previousStatus = existing.status;

  await db
    .update(requests)
    .set({
      status: newStatus as Request["status"],
      updated_at: new Date(),
      ...(newStatus === "cancelled" && comment
        ? { rejection_reason: comment }
        : {}),
      ...(newStatus === "resolved"
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
    const statusLabel = newStatus;
    await db.insert(notifications).values({
      user_id: existing.requester_id,
      title: `Request ${statusLabel}`,
      message: `Your ${categoryMeta?.label ?? existing.category} request "${existing.title}" has been ${statusLabel}.`,
      type: newStatus === "resolved" ? "success" : newStatus === "cancelled" ? "error" : "info",
      link: `/dashboard/requests/${requestId}`,
      resource_id: requestId,
      resource_type: "request",
    });

    // Email notification to requester (fire-and-forget)
    db.select({ email: users.email, full_name: users.full_name })
      .from(users)
      .where(eq(users.id, existing.requester_id))
      .limit(1)
      .then((rows) => {
        const requester = rows[0];
        if (!requester) return;
        sendStatusChangeNotification({
          requesterEmail: requester.email,
          requesterName: requester.full_name ?? requester.email,
          requestTitle: existing.title,
          newStatus,
          comment,
          requestId,
        }).catch(() => { });

        // Send rating request email when resolved
        if (newStatus === "resolved") {
          sendRatingRequestEmail({
            requesterEmail: requester.email,
            requesterName: requester.full_name ?? requester.email,
            requestTitle: existing.title,
            requestId,
          }).catch(() => { });
        }
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

  if (!skipRevalidation) {
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/requests");
    revalidatePath(`/dashboard/requests/${requestId}`);
  }

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

export async function updateRequest(
  requestId: string,
  formData: {
    title: string;
    category: string;
    priority: string;
    branch_id: string;
    form_data: Record<string, unknown>;
  }
) {
  const appUser = await requireAppUser();

  const existing = await db.query.requests.findFirst({
    where: eq(requests.id, requestId),
  });
  if (!existing) throw new Error("Request not found");

  const isAdmin = appUser.role === "admin" || appUser.role === "superadmin";
  const isRequester = appUser.role === "requester" && existing.requester_id === appUser.id;

  if (!isAdmin && !isRequester) {
    throw new Error("Insufficient permissions");
  }

  // Requesters can only edit open requests
  if (isRequester && !["open"].includes(existing.status)) {
    throw new Error("Cannot edit request in current status");
  }

  try {
    const parsed = createRequestSchema.omit({ status: true }).parse(formData);

    const categorySchema = CATEGORY_SCHEMAS[parsed.category];
    let processedFormData = parsed.form_data;

    if (categorySchema) {
      processedFormData = categorySchema.parse(parsed.form_data) as Record<string, unknown>;
    }

    await db
      .update(requests)
      .set({
        title: parsed.title,
        priority: parsed.priority as Request["priority"],
        branch_id: parsed.branch_id,
        category: parsed.category as Request["category"],
        form_data: processedFormData,
        updated_at: new Date(),
      })
      .where(eq(requests.id, requestId));

    await db.insert(activityLogs).values({
      request_id: requestId,
      actor_id: appUser.id,
      action: "status_changed_to_updated", // Custom action key? Or just 'updated'
      comment: "Request details updated",
      // We don't have 'updated' action mapped in actionLabel helper yet, but it falls back to text replacement.
    });

    revalidatePath(`/dashboard/requests/${requestId}`);
    revalidatePath("/dashboard/requests");

    return { success: true };
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
