"use server";

import { db } from "@/db";
import {
  budgets,
  budgetItems,
  auditLogs,
  users,
  reviewChecklists,
  budgetProjectCounters,
  archivedBudgets,
  archivedBudgetItems,
  archivedAuditLogs,
  budgetMilestones,
  notifications,
} from "@/db/schema";
import { eq, sql, and, desc, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// --- Notification Helpers ---

async function notifyRecipients(params: {
  userIds: string[];
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  link: string;
  resourceId: string;
  resourceType: string;
}) {
  if (params.userIds.length === 0) return;

  try {
    const values = params.userIds.map((uid) => ({
      user_id: uid,
      title: params.title,
      message: params.message,
      type: params.type,
      link: params.link,
      resource_id: params.resourceId,
      resource_type: params.resourceType,
    }));

    await db.insert(notifications).values(values);
  } catch (error) {
    console.error("Failed to send notifications:", error);
  }
}

async function getUsersByRole(roles: ("reviewer" | "approver" | "superadmin")[]) {
  const result = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.role, roles));
  return result.map((r) => r.id);
}

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type AuthedUser = {
  id: string;
  email: string | null;
};

async function getUser(): Promise<AuthedUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

async function ensureAppUser(authedUserId: string) {
  const appUser = await db.query.users.findFirst({
    where: eq(users.id, authedUserId),
  });

  if (!appUser) {
    return null;
  }

  return appUser;
}

// Helper to invalidate dashboard caches after mutations
function invalidateDashboardCaches() {
  // Revalidate all main dashboard paths
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/requests");
  revalidatePath("/dashboard/budget");
}

const VARIANCE_THRESHOLD = 50000;

function getUtcYear(d: Date) {
  return d.getUTCFullYear();
}

function formatProjectCode(budgetType: "capex" | "opex", n: number) {
  const prefix = budgetType === "capex" ? "CapEx" : "OpEx";
  return `${prefix}-${n}`;
}

async function archiveFiscalYearTx(params: {
  tx: DbTx;
  fiscalYearToArchive: number;
}) {
  const { tx, fiscalYearToArchive } = params;

  // Archive only if there are any budgets for that year.
  // drizzle-orm/postgres-js returns rows directly as an array
  const countRows = (await tx.execute(sql<{ count: number }>`
    select count(*)::int as count
    from ${budgets}
    where ${budgets.fiscal_year} = ${fiscalYearToArchive}
  `)) as unknown as Array<{ count: number }>;

  const toArchiveCount = countRows[0]?.count ?? 0;
  if (toArchiveCount <= 0) return;

  // 1) Snapshot budgets into archive table.
  await tx.execute(sql`
    insert into ${archivedBudgets} (
      source_budget_id,
      user_id,
      budget_number,
      project_code,
      budget_type,
      fiscal_year,
      status,
      total_amount,
      variance_explanation,
      roi_analysis,
      start_date,
      end_date,
      created_at,
      updated_at
    )
    select
      ${budgets.id},
      ${budgets.user_id},
      ${budgets.budget_number},
      ${budgets.project_code},
      ${budgets.budget_type},
      ${budgets.fiscal_year},
      ${budgets.status},
      ${budgets.total_amount},
      ${budgets.variance_explanation},
      ${budgets.roi_analysis},
      ${budgets.start_date},
      ${budgets.end_date},
      ${budgets.created_at},
      ${budgets.updated_at}
    from ${budgets}
    where ${budgets.fiscal_year} = ${fiscalYearToArchive}
    on conflict (source_budget_id) do nothing
  `);

  // 2) Snapshot items/milestones/logs using the mapping (source_budget_id -> archived_budgets.id).
  await tx.execute(sql`
    insert into ${archivedBudgetItems} (
      archived_budget_id,
      description,
      quantity,
      unit_cost,
      total_cost,
      quarter
    )
    select
      ab.id,
      bi.description,
      bi.quantity,
      bi.unit_cost,
      bi.total_cost,
      bi.quarter
    from ${budgetItems} bi
    inner join ${budgets} b on b.id = bi.budget_id
    inner join ${archivedBudgets} ab on ab.source_budget_id = b.id
    where b.fiscal_year = ${fiscalYearToArchive}
  `);

  await tx.execute(sql`
    insert into ${archivedAuditLogs} (
      archived_budget_id,
      actor_id,
      action,
      previous_status,
      new_status,
      timestamp,
      comment
    )
    select
      ab.id,
      al.actor_id,
      al.action,
      al.previous_status,
      al.new_status,
      al.timestamp,
      al.comment
    from ${auditLogs} al
    inner join ${budgets} b on b.id = al.budget_id
    inner join ${archivedBudgets} ab on ab.source_budget_id = b.id
    where b.fiscal_year = ${fiscalYearToArchive}
  `);

  // 3) Delete from active tables (cascades to items/milestones/logs).
  await tx.delete(budgets).where(eq(budgets.fiscal_year, fiscalYearToArchive));
}

async function allocateProjectCodeTx(params: {
  tx: DbTx;
  fiscalYear: number;
  budgetType: "capex" | "opex";
}) {
  const { tx, fiscalYear, budgetType } = params;

  // Ensure the counter row exists.
  await tx.execute(sql`
    insert into ${budgetProjectCounters} (fiscal_year, budget_type, next_number)
    values (${fiscalYear}, ${budgetType}, 1)
    on conflict (fiscal_year, budget_type) do nothing
  `);

  // Lock the row and read the next number.
  // drizzle-orm/postgres-js returns rows directly as an array
  const counterRows = (await tx.execute(sql<{ next_number: number }>`
    select next_number
    from ${budgetProjectCounters}
    where fiscal_year = ${fiscalYear} and budget_type = ${budgetType}
    for update
  `)) as unknown as Array<{ next_number: number }>;

  const nextNumber = counterRows[0]?.next_number;
  if (!nextNumber || !Number.isFinite(nextNumber)) {
    throw new Error("Failed to allocate project code");
  }

  await tx.execute(sql`
    update ${budgetProjectCounters}
    set next_number = next_number + 1,
        updated_at = now()
    where fiscal_year = ${fiscalYear} and budget_type = ${budgetType}
  `);

  return formatProjectCode(budgetType, nextNumber);
}

// Schema for Draft Creation
const CreateBudgetSchema = z.object({
  budgetType: z.enum(["capex", "opex"]),
  fiscalYear: z.number().int().min(2025).max(2030),
  projectId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(3).max(200),
});

export async function createBudgetDraft(
  prevState: unknown,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) {
    return { message: "Unauthorized" };
  }

  const appUser = await ensureAppUser(user.id);
  if (!appUser) {
    return {
      message:
        "Your account is not yet provisioned in the app. Ask an admin to create your profile (role/department).",
    };
  }

  const budgetType = formData.get("budgetType") as "capex" | "opex";
  const fiscalYear = parseInt(formData.get("fiscalYear") as string);
  const startDateStr = formData.get("startDate") as string | null;
  const endDateStr = formData.get("endDate") as string | null;
  const projectIdStr = formData.get("projectId") as string | null;
  const projectId = projectIdStr && projectIdStr !== "" ? projectIdStr : null;
  const title = (formData.get("title") as string | null) ?? null;

  const validated = CreateBudgetSchema.safeParse({
    budgetType,
    fiscalYear,
    projectId,
    title: (title ?? "").toString(),
  });

  if (!validated.success) {
    return {
      message: "Invalid data",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  try {
    const now = new Date();
    const fiscalYear = validated.data.fiscalYear;
    const budgetType = validated.data.budgetType;

    const newBudget = await db.transaction(async (tx) => {
      // If we're creating a budget for the current calendar year, automatically archive last year's
      // budgets into archived_* tables so IDs reset cleanly year-over-year.
      const nowYear = getUtcYear(now);
      if (fiscalYear === nowYear) {
        await archiveFiscalYearTx({
          tx,
          fiscalYearToArchive: fiscalYear - 1,
        });
      }

      const projectCode = await allocateProjectCodeTx({
        tx,
        fiscalYear,
        budgetType,
      });

      const [created] = await tx
        .insert(budgets)
        .values({
          user_id: user.id,
          budget_type: budgetType,
          fiscal_year: fiscalYear,
          project_code: projectCode,
          status: "draft",
          total_amount: "0",
          start_date: startDateStr ? new Date(startDateStr) : null,
          end_date: endDateStr ? new Date(endDateStr) : null,
          created_at: now,
          updated_at: now,
        })
        .returning();

      await tx.insert(auditLogs).values({
        budget_id: created.id,
        actor_id: user.id,
        action: "create_draft",
        new_status: "draft",
      });

      return created;
    });

    return {
      message: "Budget draft created",
      budgetId: newBudget.id,
      projectCode: newBudget.project_code,
    };
  } catch (e) {
    console.error(e);
    return { message: "Failed to create budget" };
  }
}

export async function submitBudget(
  budgetId: string,
  varianceExplanation?: string,
) {
  const user = await getUser();
  if (!user) return { message: "Unauthorized" };

  const appUser = await ensureAppUser(user.id);
  if (!appUser) {
    return {
      message:
        "Your account is not yet provisioned in the app. Ask an admin to create your profile (role/department).",
    };
  }

  // Fetch current budget to check total amount
  const existingBudget = await db.query.budgets.findFirst({
    where: eq(budgets.id, budgetId),
    with: {
      // Assuming we might have relations defined in schema helper or just query items
    },
  });

  if (!existingBudget) return { message: "Budget not found" };

  const totalAmount = parseFloat(existingBudget.total_amount);

  if (totalAmount <= 0) {
    return { message: "Total amount must be greater than 0" };
  }

  if (totalAmount > VARIANCE_THRESHOLD && !varianceExplanation) {
    return {
      message:
        "Variance explanation required for amounts over " + VARIANCE_THRESHOLD,
    };
  }

  await db
    .update(budgets)
    .set({
      status: "submitted",
      variance_explanation: varianceExplanation,
      updated_at: new Date(),
    })
    .where(eq(budgets.id, budgetId));

  await db.insert(auditLogs).values({
    budget_id: budgetId,
    actor_id: user.id,
    action: "submit",
    previous_status: existingBudget.status,
    new_status: "submitted",
  });

  // Notify Reviewers about new submission
  const reviewerIds = await getUsersByRole(["reviewer", "superadmin"]);
  const displayId = existingBudget.project_code || existingBudget.budget_number;

  await notifyRecipients({
    userIds: reviewerIds,
    title: "New Budget Request",
    message: `A new budget request "${displayId}" has been submitted for review.`,
    type: "info",
    link: `/dashboard/reviewer/review/${budgetId}`,
    resourceId: budgetId,
    resourceType: "budget",
  });

  invalidateDashboardCaches();
  revalidatePath("/dashboard/budget");
  return { message: "Budget submitted successfully" };
}

export async function reviewBudget(
  budgetId: string,
  action: "verify" | "request_revision" | "reject",
  comment: string,
) {
  const user = await getUser();
  if (!user) return { message: "Unauthorized" };

  const appUser = await ensureAppUser(user.id);
  if (
    !appUser ||
    (appUser.role !== "reviewer" && appUser.role !== "superadmin")
  ) {
    return { message: "Forbidden" };
  }

  const existingBudget = await db.query.budgets.findFirst({
    where: eq(budgets.id, budgetId),
  });
  if (!existingBudget) return { message: "Budget not found" };

  const reviewableStatuses = [
    "submitted",
    "verified_by_reviewer",
    "revision_requested",
  ];

  if (!reviewableStatuses.includes(existingBudget.status)) {
    return { message: "Budget is not in a reviewable state" };
  }

  const now = new Date();
  const newStatus =
    action === "verify"
      ? "verified"
      : action === "request_revision"
        ? "revision_requested"
        : "rejected";

  await db
    .update(budgets)
    .set({ status: newStatus, updated_at: now })
    .where(eq(budgets.id, budgetId));

  await db.insert(auditLogs).values({
    budget_id: budgetId,
    actor_id: user.id,
    action,
    previous_status: existingBudget.status,
    new_status: newStatus,
    comment,
  });

  // Notify Requester
  try {
    let title = "";
    let message = "";
    let type: "info" | "success" | "warning" | "error" = "info";

    if (action === "verify") {
      title = "Budget Verified";
      message = `Your budget "${existingBudget.project_code || existingBudget.budget_number}" has been verified and is pending approval.`;
      type = "info";
    } else if (action === "request_revision") {
      title = `Revision Requested by ${appUser.full_name || "Reviewer"}`;
      message = `Please revise your budget "${existingBudget.project_code || existingBudget.budget_number}". Reviewer comment: ${comment}`;
      type = "warning";
    } else if (action === "reject") {
      title = "Budget Rejected by Reviewer";
      message = `Your budget "${existingBudget.project_code || existingBudget.budget_number}" was rejected. Reviewer comment: ${comment}`;
      type = "error";
    }

    if (title) {
      await db.insert(notifications).values({
        user_id: existingBudget.user_id,
        title,
        message,
        type,
        link: `/dashboard/requests/${encodeURIComponent(existingBudget.project_code || String(existingBudget.budget_number))}`,
        resource_id: budgetId,
        resource_type: "budget",
      });
    }
  } catch (e) {
    console.error("Failed to send notification", e);
  }

  // If verified, notify Approvers
  if (action === "verify") {
    const approverIds = await getUsersByRole(["approver", "superadmin"]);
    const displayId = existingBudget.project_code || existingBudget.budget_number;

    await notifyRecipients({
      userIds: approverIds,
      title: "Budget Pending Approval",
      message: `Budget request "${displayId}" has been verified and is ready for approval.`,
      type: "info",
      link: `/dashboard/approver/approvals/${budgetId}`,
      resourceId: budgetId,
      resourceType: "budget",
    });
  }

  invalidateDashboardCaches();
  revalidatePath("/dashboard/reviewer/review");
  revalidatePath("/dashboard/reviewer");
  revalidatePath("/dashboard/budget");
  revalidatePath("/dashboard/requests");
  revalidatePath("/dashboard/approver/approvals");
  revalidatePath(`/dashboard/approver/approvals/${budgetId}`);

  return { message: "Review action recorded" };
}

// Helper function to save checklist state
async function saveChecklistState(
  budgetId: string,
  reviewerId: string,
  checklistStateStr: string,
  checklistItemsStr: string,
) {
  try {
    const checklistState = JSON.parse(checklistStateStr) as Record<
      string,
      boolean
    >;
    const checklistItems = JSON.parse(checklistItemsStr) as Array<{
      key: string;
      label: string;
    }>;

    // Save each checklist item
    for (const item of checklistItems) {
      const isChecked = checklistState[item.key] || false;

      // Check if exists
      const existing = await db
        .select()
        .from(reviewChecklists)
        .where(
          and(
            eq(reviewChecklists.budget_id, budgetId),
            eq(reviewChecklists.reviewer_id, reviewerId),
            eq(reviewChecklists.item_key, item.key),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        // Update
        await db
          .update(reviewChecklists)
          .set({ is_checked: isChecked, updated_at: new Date() })
          .where(
            and(
              eq(reviewChecklists.budget_id, budgetId),
              eq(reviewChecklists.reviewer_id, reviewerId),
              eq(reviewChecklists.item_key, item.key),
            ),
          );
      } else {
        // Insert
        await db.insert(reviewChecklists).values({
          budget_id: budgetId,
          reviewer_id: reviewerId,
          item_key: item.key,
          item_label: item.label,
          is_checked: isChecked,
        });
      }
    }
  } catch (error) {
    console.error("Failed to save checklist state:", error);
    // Don't throw - checklist is supplementary
  }
}

export async function verifyBudget(formData: FormData): Promise<void> {
  const budgetId = formData.get("budgetId") as string;
  const comment = (formData.get("comment") as string | null) ?? "";
  const checklistStateStr = formData.get("checklistState") as string;
  const checklistItemsStr = formData.get("checklistItems") as string;

  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const appUser = await ensureAppUser(user.id);
  if (
    !appUser ||
    (appUser.role !== "reviewer" && appUser.role !== "superadmin")
  ) {
    throw new Error("Only reviewers can verify budgets");
  }

  // Save checklist state
  if (checklistStateStr && checklistItemsStr) {
    await saveChecklistState(
      budgetId,
      user.id,
      checklistStateStr,
      checklistItemsStr,
    );
  }

  await reviewBudget(budgetId, "verify", comment.trim());
}

export async function requestRevision(formData: FormData): Promise<void> {
  const budgetId = formData.get("budgetId") as string;
  const checklistStateStr = formData.get("checklistState") as string;
  const checklistItemsStr = formData.get("checklistItems") as string;

  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const appUser = await ensureAppUser(user.id);
  if (
    !appUser ||
    (appUser.role !== "reviewer" && appUser.role !== "superadmin")
  ) {
    throw new Error("Only reviewers can request revisions");
  }

  // Save checklist state
  if (checklistStateStr && checklistItemsStr) {
    await saveChecklistState(
      budgetId,
      user.id,
      checklistStateStr,
      checklistItemsStr,
    );
  }

  const comment = formData.get("comment") as string;
  await reviewBudget(budgetId, "request_revision", comment);
}

export async function rejectBudget(formData: FormData): Promise<void> {
  const budgetId = formData.get("budgetId") as string;
  const checklistStateStr = formData.get("checklistState") as string;
  const checklistItemsStr = formData.get("checklistItems") as string;

  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const appUser = await ensureAppUser(user.id);
  if (
    !appUser ||
    (appUser.role !== "reviewer" && appUser.role !== "superadmin")
  ) {
    throw new Error("Only reviewers can reject budgets");
  }

  // Save checklist state
  if (checklistStateStr && checklistItemsStr) {
    await saveChecklistState(
      budgetId,
      user.id,
      checklistStateStr,
      checklistItemsStr,
    );
  }

  const comment = formData.get("comment") as string;
  await reviewBudget(budgetId, "reject", comment);
}

export async function finalizeBudget(
  budgetId: string,
  decision: "approve" | "reject" | "revoke",
  comment?: string,
) {
  const user = await getUser();
  if (!user) return { message: "Unauthorized" };

  const appUser = await ensureAppUser(user.id);
  if (!appUser) {
    return {
      message:
        "Your account is not yet provisioned in the app. Ask an admin to create your profile (role/department).",
    };
  }

  if (appUser.role !== "approver" && appUser.role !== "superadmin") {
    return { message: "Forbidden" };
  }

  const existingBudget = await db.query.budgets.findFirst({
    where: eq(budgets.id, budgetId),
  });
  if (!existingBudget) return { message: "Budget not found" };

  const status = existingBudget.status;
  const canApproveReject =
    status === "verified" || status === "verified_by_reviewer";
  const canEditApproved = status === "approved";
  const canEditRejected = status === "rejected";

  if (decision === "approve") {
    if (!(canApproveReject || canEditRejected)) {
      return { message: "Budget is not in an approvable state" };
    }
  } else if (decision === "reject") {
    if (!(canApproveReject || canEditApproved)) {
      return { message: "Budget is not in a rejectable state" };
    }
  } else if (decision === "revoke") {
    if (!(canEditApproved || canEditRejected)) {
      return { message: "Budget is not in a revocable state" };
    }
  }

  const newStatus =
    decision === "approve"
      ? "approved"
      : decision === "reject"
        ? "rejected"
        : "verified";

  await db
    .update(budgets)
    .set({ status: newStatus, updated_at: new Date() })
    .where(eq(budgets.id, budgetId));

  await db.insert(auditLogs).values({
    budget_id: budgetId,
    actor_id: user.id,
    action: decision,
    previous_status: existingBudget.status,
    new_status: newStatus,
    comment: comment?.trim() ? comment.trim() : undefined,
  });

  // Notify Requester
  try {
    let title = "";
    let message = "";
    let type: "info" | "success" | "warning" | "error" = "info";

    const displayId = existingBudget.project_code || existingBudget.budget_number;

    if (decision === "approve") {
      title = "Budget Approved";
      message = `Your budget "${displayId}" has been approved!`;
      type = "success";
    } else if (decision === "reject") {
      title = "Budget Rejected";
      message = `Your budget "${displayId}" has been rejected.`;
      type = "error";
    } else if (decision === "revoke") {
      title = "Decision Revoked";
      message = `The decision on budget "${displayId}" has been revoked. It is now back to 'Verified' status.`;
      type = "info";
    }

    if (title) {
      await db.insert(notifications).values({
        user_id: existingBudget.user_id,
        title,
        message,
        type,
        link: `/dashboard/requests/${encodeURIComponent(String(displayId))}`,
        resource_id: budgetId,
        resource_type: "budget",
      });
    }
  } catch (e) {
    console.error("Failed to send notification", e);
  }

  // Notify the Reviewer who verified this budget (or last requested revision)
  if (decision === "approve" || decision === "reject") {
    const lastReviewerLog = await db.query.auditLogs.findFirst({
      where: and(
        eq(auditLogs.budget_id, budgetId),
        or(eq(auditLogs.action, "verify"), eq(auditLogs.action, "request_revision"), eq(auditLogs.action, "reject"))
      ),
      orderBy: [desc(auditLogs.timestamp)],
    });

    if (lastReviewerLog) {
      // Don't notify if the reviewer is the same person as the approver (e.g. superadmin doing both)
      if (lastReviewerLog.actor_id !== user.id) {
        const displayId = existingBudget.project_code || existingBudget.budget_number;
        const actionText = decision === "approve" ? "approved" : "rejected";

        await notifyRecipients({
          userIds: [lastReviewerLog.actor_id],
          title: `Budget Decision: ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`,
          message: `The budget request "${displayId}" you reviewed has been ${actionText} by the approver.`,
          type: decision === "approve" ? "success" : "error",
          link: `/dashboard/reviewer/${budgetId}`,
          resourceId: budgetId,
          resourceType: "budget",
        });
      }
    }
  }

  invalidateDashboardCaches();
  revalidatePath("/dashboard/approver/approvals");
  return { message: `Budget ${decision}` };
}

const EditFinalDecisionSchema = z.object({
  budgetId: z.string().uuid(),
  intent: z.enum(["approve", "reject", "revoke"]),
  reason: z.string().trim().min(1, "Explanation is required"),
  returnTo: z.string().min(1).optional(),
});

function buildRedirectUrl(
  returnTo: string | undefined,
  params: Record<string, string>,
) {
  const base = returnTo?.startsWith("/") ? returnTo : "/dashboard/budget";
  const qs = new URLSearchParams(params);
  return `${base}?${qs.toString()}`;
}

function normalizeRevokeTargetStatus(status: string | null | undefined) {
  if (status === "verified" || status === "verified_by_reviewer") return status;
  return "verified";
}

// Used by Budget Tracking (approved/rejected) to change or revoke decisions.
export async function editFinalDecision(formData: FormData) {
  const user = await getUser();
  const rawReturnTo = (formData.get("returnTo") as string | null) ?? undefined;

  if (!user) {
    redirect(buildRedirectUrl(rawReturnTo, { error: "Unauthorized" }));
  }

  const parsed = EditFinalDecisionSchema.safeParse({
    budgetId: formData.get("budgetId"),
    intent: formData.get("intent"),
    reason: formData.get("reason"),
    returnTo: rawReturnTo,
  });

  if (!parsed.success) {
    redirect(
      buildRedirectUrl(rawReturnTo, {
        error:
          parsed.error.flatten().fieldErrors.reason?.[0] ?? "Invalid request",
      }),
    );
  }

  const { budgetId, intent, reason } = parsed.data;

  const appUser = await ensureAppUser(user.id);
  if (!appUser) {
    redirect(
      buildRedirectUrl(rawReturnTo, {
        error:
          "Your account is not yet provisioned in the app. Ask an admin to create your profile (role/department).",
      }),
    );
  }

  if (appUser.role !== "approver" && appUser.role !== "superadmin") {
    redirect(buildRedirectUrl(rawReturnTo, { error: "Forbidden" }));
  }

  const existingBudget = await db.query.budgets.findFirst({
    where: eq(budgets.id, budgetId),
  });
  if (!existingBudget) {
    redirect(buildRedirectUrl(rawReturnTo, { error: "Budget not found" }));
  }

  const editableStatuses = ["approved", "rejected"];
  if (!editableStatuses.includes(existingBudget.status)) {
    redirect(
      buildRedirectUrl(rawReturnTo, {
        error: "Budget is not in an editable decision state",
      }),
    );
  }

  // Safety check: only allow edits when the latest log is the terminal decision.
  // For non-superadmin users, also require that they are the one who made it.
  const [latestLog] = await db
    .select({
      action: auditLogs.action,
      actorId: auditLogs.actor_id,
      newStatus: auditLogs.new_status,
      previousStatus: auditLogs.previous_status,
    })
    .from(auditLogs)
    .where(eq(auditLogs.budget_id, budgetId))
    .orderBy(desc(auditLogs.timestamp))
    .limit(1);

  const isLatestTerminalDecision =
    latestLog &&
    (latestLog.action === "approve" || latestLog.action === "reject") &&
    latestLog.newStatus === existingBudget.status;

  if (!isLatestTerminalDecision) {
    redirect(
      buildRedirectUrl(rawReturnTo, {
        error:
          "Cannot edit. The next approver has already processed this request.",
      }),
    );
  }

  if (appUser.role !== "superadmin" && latestLog.actorId !== user.id) {
    redirect(
      buildRedirectUrl(rawReturnTo, {
        error:
          "Cannot edit. The next approver has already processed this request.",
      }),
    );
  }

  const now = new Date();

  if (intent === "revoke") {
    const [decisionLog] = await db
      .select({ previousStatus: auditLogs.previous_status })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.budget_id, budgetId),
          inArray(auditLogs.action, ["approve", "reject"]),
        ),
      )
      .orderBy(desc(auditLogs.timestamp))
      .limit(1);

    const revertTo = normalizeRevokeTargetStatus(decisionLog?.previousStatus);

    await db
      .update(budgets)
      .set({ status: revertTo, updated_at: now })
      .where(eq(budgets.id, budgetId));

    await db.insert(auditLogs).values({
      budget_id: budgetId,
      actor_id: user.id,
      action: "revoke_decision",
      previous_status: existingBudget.status,
      new_status: revertTo,
      comment: reason,
    });

    invalidateDashboardCaches();
    revalidatePath(`/dashboard/budget/${budgetId}`);
    revalidatePath("/dashboard/approver/approvals");
    redirect(
      buildRedirectUrl(rawReturnTo, {
        success: "Decision revoked successfully",
      }),
    );
  }

  const newStatus = intent === "approve" ? "approved" : "rejected";

  if (newStatus === existingBudget.status) {
    redirect(buildRedirectUrl(rawReturnTo, { error: "No change to apply" }));
  }

  await db
    .update(budgets)
    .set({ status: newStatus, updated_at: now })
    .where(eq(budgets.id, budgetId));

  await db.insert(auditLogs).values({
    budget_id: budgetId,
    actor_id: user.id,
    action: intent,
    previous_status: existingBudget.status,
    new_status: newStatus,
    comment: reason,
  });

  invalidateDashboardCaches();
  revalidatePath(`/dashboard/budget/${budgetId}`);
  revalidatePath("/dashboard/approver/approvals");
  redirect(
    buildRedirectUrl(rawReturnTo, {
      success: "Decision updated successfully",
    }),
  );
}

// Add Item Action
const AddItemSchema = z.object({
  budgetId: z.string().uuid(),
  description: z.string().min(1),
  quantity: z.number().int().positive(),
  unitCost: z.number().positive().max(9_999_999_999_999.99),
  quarter: z.string(), // e.g. Q1
});

// Add Milestone Action
const AddMilestoneSchema = z.object({
  budgetId: z.string().uuid(),
  description: z.string().min(1),
  targetQuarter: z.string().optional(),
});

export async function addBudgetMilestone(
  prevState: unknown,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) return { message: "Unauthorized" };

  const appUser = await ensureAppUser(user.id);
  if (!appUser) {
    return {
      message:
        "Your account is not yet provisioned in the app. Ask an admin to create your profile (role/department).",
    };
  }

  const budgetId = formData.get("budgetId") as string;
  const description = formData.get("description") as string;
  // Use 'targetQuarter' if you plan to capture it, but for now we just capture description
  // As per UI mockup, it's just a text field "Milestone", so we treat it as description-only or description + inferred quarter.
  // The schema supports targetQuarter, so we can pass it if we want.
  const targetQuarter = (formData.get("targetQuarter") as string) || undefined;

  const validated = AddMilestoneSchema.safeParse({
    budgetId,
    description,
    targetQuarter,
  });

  if (!validated.success) {
    return { message: "Invalid Milestone Data" };
  }

  const existingBudget = await db.query.budgets.findFirst({
    where: eq(budgets.id, budgetId),
  });

  if (!existingBudget) {
    return { message: "Budget not found" };
  }

  if (existingBudget.user_id !== user.id) {
    return { message: "Unauthorized" };
  }

  try {
    // Assuming budgetMilestones is imported from schema (I saw it is exported in schema.ts)
    // I need to make sure it's imported in this file. It is NOT currently imported in the lines I saw.
    // Wait, I saw lines 1-14 of `src/actions/budget.ts` and `budgetMilestones` was NOT in the import list.
    // I need/must add it to the import list first!
    await db.insert(budgetMilestones).values({
      budget_id: budgetId,
      description: validated.data.description,
      target_quarter: validated.data.targetQuarter,
    });
  } catch (e) {
    console.error(e);
    return { message: "Failed to add milestone" };
  }

  revalidatePath(`/dashboard/budget/create`);
  return { message: "Milestone added" };
}

export async function addBudgetItem(prevState: unknown, formData: FormData) {
  const user = await getUser();
  if (!user) return { message: "Unauthorized" };

  const appUser = await ensureAppUser(user.id);
  if (!appUser) {
    return {
      message:
        "Your account is not yet provisioned in the app. Ask an admin to create your profile (role/department).",
    };
  }

  const budgetId = formData.get("budgetId") as string;
  const description = formData.get("description") as string;
  const quantity = parseInt(formData.get("quantity") as string);
  const unitCost = parseFloat(formData.get("unitCost") as string);
  const quarter = formData.get("quarter") as string;

  const validated = AddItemSchema.safeParse({
    budgetId,
    description,
    quantity,
    unitCost,
    quarter,
  });

  if (!validated.success) {
    return { message: "Invalid Item Data" };
  }

  const roundToCents = (n: number) => Math.round(n * 100) / 100;

  const unitCostRounded = roundToCents(unitCost);
  const totalCostRounded = roundToCents(quantity * unitCostRounded);

  if (!Number.isFinite(unitCostRounded) || unitCostRounded <= 0) {
    return { message: "Unit cost must be a valid number greater than 0" };
  }

  if (!Number.isFinite(totalCostRounded) || totalCostRounded <= 0) {
    return { message: "Total cost must be a valid number greater than 0" };
  }

  if (totalCostRounded > 9_999_999_999_999.99) {
    return {
      message:
        "Total cost is too large. Please reduce quantity or unit cost (max 9,999,999,999,999.99).",
    };
  }

  const existingBudget = await db.query.budgets.findFirst({
    where: eq(budgets.id, budgetId),
  });

  if (!existingBudget) {
    return { message: "Budget not found" };
  }

  if (existingBudget.user_id !== user.id) {
    return { message: "Unauthorized" };
  }

  try {
    await db.insert(budgetItems).values({
      budget_id: budgetId,
      description,
      quantity,
      unit_cost: unitCostRounded.toFixed(2),
      total_cost: totalCostRounded.toFixed(2),
      quarter,
    });
  } catch (e) {
    console.error(e);
    return {
      message:
        "Failed to add item. If you entered a very large amount, please reduce it and try again.",
    };
  }

  const [{ value: newTotal }] = await db
    .select({
      value: sql<string>`COALESCE(SUM(${budgetItems.total_cost}), 0)`,
    })
    .from(budgetItems)
    .where(eq(budgetItems.budget_id, budgetId));

  await db
    .update(budgets)
    .set({ total_amount: newTotal, updated_at: new Date() })
    .where(eq(budgets.id, budgetId));

  revalidatePath(`/dashboard/budget/create`);
  revalidatePath(`/dashboard`);
  revalidatePath(`/dashboard/requests`);
  return { message: "Item added" };
}

// Update review checklist item
export async function updateReviewChecklist(formData: FormData) {
  try {
    const user = await getUser();
    if (!user) {
      console.error("updateReviewChecklist: No user found in session");
      throw new Error("Unauthorized");
    }

    const appUser = await ensureAppUser(user.id);
    if (
      !appUser ||
      (appUser.role !== "reviewer" && appUser.role !== "superadmin")
    ) {
      console.error(
        "updateReviewChecklist: User not authorized",
        appUser?.role,
      );
      throw new Error("Forbidden");
    }

    const budgetId = formData.get("budgetId") as string;
    const itemKey = formData.get("itemKey") as string;
    const itemLabel = formData.get("itemLabel") as string;
    const isChecked = formData.get("isChecked") === "true";

    if (!budgetId || !itemKey || !itemLabel) {
      console.error("updateReviewChecklist: Missing required fields", {
        budgetId,
        itemKey,
        itemLabel,
      });
      throw new Error("Missing required fields");
    }

    // Check if checklist item exists
    const existing = await db
      .select()
      .from(reviewChecklists)
      .where(
        and(
          eq(reviewChecklists.budget_id, budgetId),
          eq(reviewChecklists.reviewer_id, user.id),
          eq(reviewChecklists.item_key, itemKey),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      await db
        .update(reviewChecklists)
        .set({ is_checked: isChecked, updated_at: new Date() })
        .where(
          and(
            eq(reviewChecklists.budget_id, budgetId),
            eq(reviewChecklists.reviewer_id, user.id),
            eq(reviewChecklists.item_key, itemKey),
          ),
        );
    } else {
      // Insert new
      await db.insert(reviewChecklists).values({
        budget_id: budgetId,
        reviewer_id: user.id,
        item_key: itemKey,
        item_label: itemLabel,
        is_checked: isChecked,
      });
    }

    revalidatePath(`/dashboard/reviewer/${budgetId}`);
    return { success: true };
  } catch (error) {
    console.error("updateReviewChecklist error:", error);
    throw error;
  }
}

// Get review checklist for a budget
export async function getReviewChecklist(budgetId: string) {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const appUser = await ensureAppUser(user.id);
  if (
    !appUser ||
    (appUser.role !== "reviewer" && appUser.role !== "superadmin")
  ) {
    throw new Error("Forbidden");
  }

  const items = await db
    .select()
    .from(reviewChecklists)
    .where(
      sql`${reviewChecklists.budget_id} = ${budgetId} 
          AND ${reviewChecklists.reviewer_id} = ${user.id}`,
    );

  return items;
}

// Update an existing budget item
export async function updateBudgetItem(formData: FormData) {
  const user = await getUser();
  if (!user) {
    return { message: "Unauthorized" };
  }

  const itemId = formData.get("itemId") as string;
  const description = formData.get("description") as string;
  const quantity = parseInt(formData.get("quantity") as string);
  const unitCost = formData.get("unitCost") as string;

  if (!itemId || !description || !quantity || !unitCost) {
    return { message: "Missing required fields" };
  }

  try {
    // Verify item exists
    const item = await db.query.budgetItems.findFirst({
      where: eq(budgetItems.id, itemId),
    });

    if (!item) {
      return { message: "Item not found" };
    }

    // Verify budget belongs to user
    const budget = await db.query.budgets.findFirst({
      where: eq(budgets.id, item.budget_id),
    });

    if (!budget || budget.user_id !== user.id) {
      return { message: "Unauthorized" };
    }

    // Only allow updates on revision_requested budgets
    if (budget.status !== "revision_requested") {
      return { message: "Cannot update items for this budget status" };
    }

    const totalCost = quantity * parseFloat(unitCost);

    await db
      .update(budgetItems)
      .set({
        description,
        quantity,
        unit_cost: unitCost,
        total_cost: totalCost.toString(),
      })
      .where(eq(budgetItems.id, itemId));

    // Recalculate budget total
    await recalculateBudgetTotal(item.budget_id);

    revalidatePath(`/dashboard/budget/edit/${item.budget_id}`);
    return { message: "Item updated successfully" };
  } catch (error) {
    console.error("updateBudgetItem error:", error);
    return { message: "Failed to update item" };
  }
}

// Delete a budget item
export async function deleteBudgetItem(formData: FormData) {
  const user = await getUser();
  if (!user) {
    return { message: "Unauthorized" };
  }

  const itemId = formData.get("itemId") as string;

  if (!itemId) {
    return { message: "Missing item ID" };
  }

  try {
    // Verify item exists
    const item = await db.query.budgetItems.findFirst({
      where: eq(budgetItems.id, itemId),
    });

    if (!item) {
      return { message: "Item not found" };
    }

    // Verify budget belongs to user
    const budget = await db.query.budgets.findFirst({
      where: eq(budgets.id, item.budget_id),
    });

    if (!budget || budget.user_id !== user.id) {
      return { message: "Unauthorized" };
    }

    // Only allow deletion on revision_requested budgets
    if (budget.status !== "revision_requested") {
      return { message: "Cannot delete items for this budget status" };
    }

    await db.delete(budgetItems).where(eq(budgetItems.id, itemId));

    // Recalculate budget total
    await recalculateBudgetTotal(item.budget_id);

    revalidatePath(`/dashboard/budget/edit/${item.budget_id}`);
    return { message: "Item deleted successfully" };
  } catch (error) {
    console.error("deleteBudgetItem error:", error);
    return { message: "Failed to delete item" };
  }
}

// Delete a budget milestone
// Resubmit a budget after revision
export async function resubmitBudget(
  budgetId: string,
  varianceExplanation?: string,
) {
  const user = await getUser();
  if (!user) {
    return { message: "Unauthorized" };
  }

  try {
    const budget = await db.query.budgets.findFirst({
      where: eq(budgets.id, budgetId),
    });

    if (!budget) {
      return { message: "Budget not found" };
    }

    if (budget.user_id !== user.id) {
      return { message: "Unauthorized to resubmit this budget" };
    }

    if (budget.status !== "revision_requested") {
      return { message: "Budget is not in revision status" };
    }

    // Update status to submitted and update variance explanation if provided
    const updateData: {
      status: "submitted";
      variance_explanation?: string;
      updated_at: Date;
    } = {
      status: "submitted",
      updated_at: new Date(),
    };

    // Update variance explanation if a new one is provided
    if (varianceExplanation && varianceExplanation.trim()) {
      updateData.variance_explanation = varianceExplanation.trim();
    }

    await db.update(budgets).set(updateData).where(eq(budgets.id, budgetId));

    // Log the resubmission
    await db.insert(auditLogs).values({
      budget_id: budgetId,
      actor_id: user.id,
      action: "resubmit",
      new_status: "submitted",
      comment: varianceExplanation || "Budget resubmitted after revision",
    });

    revalidatePath("/dashboard/requests");
    return { message: "Budget resubmitted successfully" };
  } catch (error) {
    console.error("resubmitBudget error:", error);
    return { message: "Failed to resubmit budget" };
  }
}

// Helper function to recalculate budget total
async function recalculateBudgetTotal(budgetId: string) {
  const items = await db.query.budgetItems.findMany({
    where: eq(budgetItems.budget_id, budgetId),
  });

  const total = items.reduce(
    (sum, item) => sum + parseFloat(item.total_cost),
    0,
  );

  await db
    .update(budgets)
    .set({ total_amount: total.toString() })
    .where(eq(budgets.id, budgetId));
}
