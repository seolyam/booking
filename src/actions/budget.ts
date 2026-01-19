"use server";

import { db } from "@/db";
import { budgets, budgetItems, auditLogs, users, reviewChecklists } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
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
  formData: FormData
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

// Helper to calculate total from items (if passed) or just update status

export async function submitBudget(
  budgetId: string,
  varianceExplanation?: string
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
  comment: string
) {
  const user = await getUser();
  // Validations for role should go here (reviewer only)
  if (!user) return { message: "Unauthorized" };

  const appUser = await ensureAppUser(user.id);
  if (!appUser) {
    return {
      message:
        "Your account is not yet provisioned in the app. Ask an admin to create your profile (role/department).",
    };
  }

  const existingBudget = await db.query.budgets.findFirst({
    where: eq(budgets.id, budgetId),
  });
  if (!existingBudget) return { message: "Budget not found" };

  const newStatus = action === "verify" ? "verified" : action === "request_revision" ? "revision_requested" : "rejected";

  await db
    .update(budgets)
    .set({ status: newStatus, updated_at: new Date() })
    .where(eq(budgets.id, budgetId));

  await db.insert(auditLogs).values({
    budget_id: budgetId,
    actor_id: user.id, // Should be reviewer ID
    action: action,
    previous_status: existingBudget.status,
    new_status: newStatus,
    comment: comment,
  });

  revalidatePath("/dashboard/budget");
  revalidatePath("/dashboard/reviewer");
}

export async function verifyBudget(formData: FormData): Promise<void> {
  const budgetId = formData.get("budgetId") as string;
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const appUser = await ensureAppUser(user.id);
  if (!appUser || appUser.role !== "reviewer") {
    throw new Error("Only reviewers can verify budgets");
  }

  await reviewBudget(budgetId, "verify", "");
}

export async function requestRevision(formData: FormData): Promise<void> {
  const budgetId = formData.get("budgetId") as string;
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const appUser = await ensureAppUser(user.id);
  if (!appUser || appUser.role !== "reviewer") {
    throw new Error("Only reviewers can request revisions");
  }

  const comment = formData.get("comment") as string;
  await reviewBudget(budgetId, "request_revision", comment);
}

export async function rejectBudget(formData: FormData): Promise<void> {
  const budgetId = formData.get("budgetId") as string;
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const appUser = await ensureAppUser(user.id);
  if (!appUser || appUser.role !== "reviewer") {
    throw new Error("Only reviewers can reject budgets");
  }

  const comment = formData.get("comment") as string;
  await reviewBudget(budgetId, "reject", comment);
}

export async function finalizeBudget(
  budgetId: string,
  decision: "approve" | "reject"
) {
  const user = await getUser();
  // Validations for role should go here (approver only)
  if (!user) return { message: "Unauthorized" };

  const appUser = await ensureAppUser(user.id);
  if (!appUser) {
    return {
      message:
        "Your account is not yet provisioned in the app. Ask an admin to create your profile (role/department).",
    };
  }

  const existingBudget = await db.query.budgets.findFirst({
    where: eq(budgets.id, budgetId),
  });
  if (!existingBudget) return { message: "Budget not found" };

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
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const appUser = await ensureAppUser(user.id);
  if (!appUser || (appUser.role !== "reviewer" && appUser.role !== "superadmin")) {
    throw new Error("Forbidden");
  }

  const budgetId = formData.get("budgetId") as string;
  const itemKey = formData.get("itemKey") as string;
  const itemLabel = formData.get("itemLabel") as string;
  const isChecked = formData.get("isChecked") === "true";

  if (!budgetId || !itemKey || !itemLabel) {
    throw new Error("Missing required fields");
  }

  // Check if checklist item exists
  const existing = await db
    .select()
    .from(reviewChecklists)
    .where(
      sql`${reviewChecklists.budget_id} = ${budgetId} 
          AND ${reviewChecklists.reviewer_id} = ${user.id} 
          AND ${reviewChecklists.item_key} = ${itemKey}`
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing
    await db
      .update(reviewChecklists)
      .set({ is_checked: isChecked, updated_at: new Date() })
      .where(
        sql`${reviewChecklists.budget_id} = ${budgetId} 
            AND ${reviewChecklists.reviewer_id} = ${user.id} 
            AND ${reviewChecklists.item_key} = ${itemKey}`
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
}

// Get review checklist for a budget
export async function getReviewChecklist(budgetId: string) {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const appUser = await ensureAppUser(user.id);
  if (!appUser || (appUser.role !== "reviewer" && appUser.role !== "superadmin")) {
    throw new Error("Forbidden");
  }

  const items = await db
    .select()
    .from(reviewChecklists)
    .where(
      sql`${reviewChecklists.budget_id} = ${budgetId} 
          AND ${reviewChecklists.reviewer_id} = ${user.id}`
    );

  return items;
}
