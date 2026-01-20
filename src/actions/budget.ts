"use server";

import { db } from "@/db";
import {
  budgets,
  budgetItems,
  auditLogs,
  users,
  reviewChecklists,
  budgetMilestones,
} from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

const VARIANCE_THRESHOLD = 50000;

// Schema for Draft Creation
const CreateBudgetSchema = z.object({
  budgetType: z.enum(["capex", "opex"]),
  fiscalYear: z.number().int().min(2025).max(2030),
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

  const validated = CreateBudgetSchema.safeParse({ budgetType, fiscalYear });

  if (!validated.success) {
    return {
      message: "Invalid data",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  try {
    const [newBudget] = await db
      .insert(budgets)
      .values({
        user_id: user.id,
        budget_type: validated.data.budgetType,
        fiscal_year: validated.data.fiscalYear,
        status: "draft",
        total_amount: "0",
        start_date: startDateStr ? new Date(startDateStr) : null,
        end_date: endDateStr ? new Date(endDateStr) : null,
      })
      .returning();

    await db.insert(auditLogs).values({
      budget_id: newBudget.id,
      actor_id: user.id,
      action: "create_draft",
      new_status: "draft",
    });

    return { message: "Budget draft created", budgetId: newBudget.id };
  } catch (e) {
    console.error(e);
    return { message: "Failed to create budget" };
  }
}

export async function addBudgetMilestone(
  prevState: unknown,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) return { message: "Unauthorized" };

  const budgetId = formData.get("budgetId") as string;
  const description = formData.get("description") as string;
  const targetQuarter = formData.get("targetQuarter") as string | null;

  if (!budgetId || !description) {
    return { message: "Budget ID and description are required" };
  }

  try {
    await db.insert(budgetMilestones).values({
      budget_id: budgetId,
      description,
      target_quarter: targetQuarter,
    });

    return { message: "Milestone added" };
  } catch (e) {
    console.error(e);
    return { message: "Failed to add milestone" };
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

  revalidatePath("/dashboard/reviewer/review");
  revalidatePath("/dashboard/reviewer");
  revalidatePath("/dashboard/budget");
  revalidatePath("/dashboard/requests");

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
  const checklistStateStr = formData.get("checklistState") as string;
  const checklistItemsStr = formData.get("checklistItems") as string;

  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const appUser = await ensureAppUser(user.id);
  if (!appUser || appUser.role !== "reviewer") {
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

  await reviewBudget(budgetId, "verify", "");
}

export async function requestRevision(formData: FormData): Promise<void> {
  const budgetId = formData.get("budgetId") as string;
  const checklistStateStr = formData.get("checklistState") as string;
  const checklistItemsStr = formData.get("checklistItems") as string;

  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const appUser = await ensureAppUser(user.id);
  if (!appUser || appUser.role !== "reviewer") {
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
  if (!appUser || appUser.role !== "reviewer") {
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
  decision: "approve" | "reject",
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

  const approvableStatuses = ["verified", "verified_by_reviewer"];
  if (!approvableStatuses.includes(existingBudget.status)) {
    return { message: "Budget is not in an approvable state" };
  }

  const newStatus = decision === "approve" ? "approved" : "rejected";

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

  revalidatePath("/dashboard/budget");
  return { message: `Budget ${decision}` };
}

// Add Item Action
const AddItemSchema = z.object({
  budgetId: z.string().uuid(),
  description: z.string().min(1),
  quantity: z.number().int().positive(),
  unitCost: z.number().positive().max(9_999_999_999_999.99),
  quarter: z.string(), // e.g. Q1
});

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
export async function deleteBudgetMilestone(formData: FormData) {
  const user = await getUser();
  if (!user) {
    return { message: "Unauthorized" };
  }

  const milestoneId = formData.get("milestoneId") as string;

  if (!milestoneId) {
    return { message: "Missing milestone ID" };
  }

  try {
    // Verify milestone exists
    const milestone = await db.query.budgetMilestones.findFirst({
      where: eq(budgetMilestones.id, milestoneId),
    });

    if (!milestone) {
      return { message: "Milestone not found" };
    }

    // Verify budget belongs to user
    const budget = await db.query.budgets.findFirst({
      where: eq(budgets.id, milestone.budget_id),
    });

    if (!budget || budget.user_id !== user.id) {
      return { message: "Unauthorized" };
    }

    // Only allow deletion on revision_requested budgets
    if (budget.status !== "revision_requested") {
      return { message: "Cannot delete milestones for this budget status" };
    }

    await db
      .delete(budgetMilestones)
      .where(eq(budgetMilestones.id, milestoneId));

    revalidatePath(`/dashboard/budget/edit/${milestone.budget_id}`);
    return { message: "Milestone deleted successfully" };
  } catch (error) {
    console.error("deleteBudgetMilestone error:", error);
    return { message: "Failed to delete milestone" };
  }
}

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

    // Update status to submitted
    await db
      .update(budgets)
      .set({ status: "submitted" })
      .where(eq(budgets.id, budgetId));

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
