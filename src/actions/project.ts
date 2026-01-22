"use server";

import { db } from "@/db";
import { projects, budgetCategories, users, budgets } from "@/db/schema";
import { eq, and, or, desc, sql } from "drizzle-orm";
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

// Helper to invalidate project-related caches
function invalidateProjectCaches() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/budget");
  revalidatePath("/dashboard/budget/create");
}

// ============================================================================
// Project Actions
// ============================================================================

/**
 * Generate the next project code
 */
export async function generateProjectCode(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("generate_project_code");

  if (error) {
    console.error("Error generating project code:", error);
    // Fallback: generate code in JS
    const currentYear = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-3);
    return `PROJ-${currentYear}-${timestamp}`;
  }

  return data as string;
}

/**
 * Create a new project
 */
export async function createProject(formData: FormData) {
  const user = await getUser();
  if (!user) {
    return { success: false, message: "Unauthorized" };
  }

  const appUser = await ensureAppUser(user.id);
  if (!appUser) {
    return {
      success: false,
      message: "Your account is not yet provisioned in the app.",
    };
  }

  const name = formData.get("name") as string;
  const projectCode = formData.get("projectCode") as string;
  const description = (formData.get("description") as string) || null;

  if (!name || !projectCode) {
    return { success: false, message: "Project name and code are required" };
  }

  try {
    // Check if project code already exists
    const existingProject = await db.query.projects.findFirst({
      where: eq(projects.project_code, projectCode),
    });

    if (existingProject) {
      return { success: false, message: "Project code already exists" };
    }

    const [newProject] = await db
      .insert(projects)
      .values({
        name,
        project_code: projectCode,
        department: appUser.department,
        description,
        created_by: user.id,
      })
      .returning();

    invalidateProjectCaches();

    return {
      success: true,
      message: "Project created successfully",
      project: newProject,
    };
  } catch (e) {
    console.error("Error creating project:", e);
    return { success: false, message: "Failed to create project" };
  }
}

/**
 * Get all active projects for the current user's department
 */
export async function getActiveProjects() {
  const user = await getUser();
  if (!user) {
    return { success: false, message: "Unauthorized", projects: [] };
  }

  const appUser = await ensureAppUser(user.id);
  if (!appUser) {
    return { success: false, message: "User not found", projects: [] };
  }

  try {
    // Superadmin, approver, reviewer can see all projects
    // Regular users see only their department's projects
    const isPrivilegedRole = ["superadmin", "approver", "reviewer"].includes(
      appUser.role,
    );

    const projectsList = await db.query.projects.findMany({
      where: isPrivilegedRole
        ? eq(projects.is_active, true)
        : and(
            eq(projects.is_active, true),
            eq(projects.department, appUser.department),
          ),
      orderBy: [desc(projects.created_at)],
    });

    return { success: true, projects: projectsList };
  } catch (e) {
    console.error("Error fetching projects:", e);
    return {
      success: false,
      message: "Failed to fetch projects",
      projects: [],
    };
  }
}

/**
 * Get a single project by ID with its budgets
 */
export async function getProjectById(projectId: string) {
  const user = await getUser();
  if (!user) {
    return { success: false, message: "Unauthorized", project: null };
  }

  try {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
      with: {
        budgets: {
          orderBy: [desc(budgets.created_at)],
        },
      },
    });

    if (!project) {
      return { success: false, message: "Project not found", project: null };
    }

    return { success: true, project };
  } catch (e) {
    console.error("Error fetching project:", e);
    return {
      success: false,
      message: "Failed to fetch project",
      project: null,
    };
  }
}

// ============================================================================
// Budget Category Actions
// ============================================================================

/**
 * Get budget categories filtered by budget type
 */
export async function getBudgetCategories(budgetType: "capex" | "opex") {
  try {
    const typeFilter = budgetType.toUpperCase() as "CAPEX" | "OPEX";

    const categories = await db.query.budgetCategories.findMany({
      where: and(
        eq(budgetCategories.is_active, true),
        or(
          eq(budgetCategories.allowed_type, typeFilter),
          eq(budgetCategories.allowed_type, "BOTH"),
        ),
      ),
      orderBy: [budgetCategories.name],
    });

    return { success: true, categories };
  } catch (e) {
    console.error("Error fetching categories:", e);
    return {
      success: false,
      message: "Failed to fetch categories",
      categories: [],
    };
  }
}

/**
 * Get the preview of the next budget ID for a given type
 */
export async function getNextBudgetIdPreview(budgetType: "capex" | "opex") {
  const supabase = await createSupabaseServerClient();

  try {
    const { data, error } = await supabase.rpc("get_next_budget_id_preview", {
      p_budget_type: budgetType,
    });

    if (error) {
      console.error("Error getting next budget ID preview:", error);
      // Fallback: count existing budgets of this type
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(budgets)
        .where(eq(budgets.budget_type, budgetType));

      const nextNum = (count[0]?.count || 0) + 1;
      const prefix = budgetType === "capex" ? "CAP" : "OPX";
      return {
        success: true,
        previewId: `${prefix}-${String(nextNum).padStart(4, "0")}`,
      };
    }

    return { success: true, previewId: data as string };
  } catch (e) {
    console.error("Error getting next budget ID preview:", e);
    return { success: false, previewId: null };
  }
}

/**
 * Update a project
 */
export async function updateProject(projectId: string, formData: FormData) {
  const user = await getUser();
  if (!user) {
    return { success: false, message: "Unauthorized" };
  }

  const appUser = await ensureAppUser(user.id);
  if (!appUser) {
    return { success: false, message: "User not found" };
  }

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;

  try {
    const existingProject = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!existingProject) {
      return { success: false, message: "Project not found" };
    }

    // Only creator or superadmin can update
    if (
      existingProject.created_by !== user.id &&
      appUser.role !== "superadmin"
    ) {
      return {
        success: false,
        message: "Not authorized to update this project",
      };
    }

    await db
      .update(projects)
      .set({
        name,
        description,
        updated_at: new Date(),
      })
      .where(eq(projects.id, projectId));

    invalidateProjectCaches();

    return { success: true, message: "Project updated successfully" };
  } catch (e) {
    console.error("Error updating project:", e);
    return { success: false, message: "Failed to update project" };
  }
}

/**
 * Archive a project (soft delete)
 */
export async function archiveProject(projectId: string) {
  const user = await getUser();
  if (!user) {
    return { success: false, message: "Unauthorized" };
  }

  const appUser = await ensureAppUser(user.id);
  if (!appUser) {
    return { success: false, message: "User not found" };
  }

  try {
    const existingProject = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!existingProject) {
      return { success: false, message: "Project not found" };
    }

    // Only creator or superadmin can archive
    if (
      existingProject.created_by !== user.id &&
      appUser.role !== "superadmin"
    ) {
      return {
        success: false,
        message: "Not authorized to archive this project",
      };
    }

    await db
      .update(projects)
      .set({
        is_active: false,
        updated_at: new Date(),
      })
      .where(eq(projects.id, projectId));

    invalidateProjectCaches();

    return { success: true, message: "Project archived successfully" };
  } catch (e) {
    console.error("Error archiving project:", e);
    return { success: false, message: "Failed to archive project" };
  }
}
