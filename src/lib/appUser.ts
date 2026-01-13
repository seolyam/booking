import { db } from "@/db";
import { departmentEnum, users } from "@/db/schema";
import { eq } from "drizzle-orm";

const FALLBACK_DEPARTMENT = "Finance" as const;

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function getDepartmentFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): string {
  // The DB enum is strict; only accept exact matches. Otherwise fall back.
  const department = asNonEmptyString(metadata?.department);
  if (!department) return FALLBACK_DEPARTMENT;
  return departmentEnum.enumValues.includes(department as never)
    ? department
    : FALLBACK_DEPARTMENT;
}

function getRoleFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): "requester" | "reviewer" | "approver" | "superadmin" {
  const role = asNonEmptyString(metadata?.role);
  if (
    role === "requester" ||
    role === "reviewer" ||
    role === "approver" ||
    role === "superadmin"
  ) {
    return role;
  }
  return "requester";
}

export type AppUser = {
  id: string;
  email: string;
  role: "requester" | "reviewer" | "approver" | "superadmin";
  department: string;
};

export async function getOrCreateAppUserFromAuthUser(authUser: {
  id: string;
  email: string | null;
  user_metadata?: Record<string, unknown> | null;
}): Promise<AppUser> {
  const existing = await db.query.users.findFirst({
    where: eq(users.id, authUser.id),
  });

  if (existing) {
    return {
      id: existing.id,
      email: existing.email,
      role: existing.role,
      department: existing.department,
    };
  }

  const email = authUser.email ?? "";
  if (!email) {
    // Shouldn’t happen for email/password auth, but avoid inserting invalid records.
    throw new Error("Authenticated user has no email");
  }

  const department = getDepartmentFromMetadata(authUser.user_metadata);
  const role = getRoleFromMetadata(authUser.user_metadata);

  const [inserted] = await db
    .insert(users)
    .values({
      id: authUser.id,
      email,
      department: department as never,
      role,
    })
    .returning();

  return {
    id: inserted.id,
    email: inserted.email,
    role: inserted.role,
    department: inserted.department,
  };
}

export function getDisplayProfileFromAuthUser(authUser: {
  email: string | null;
  user_metadata?: Record<string, unknown> | null;
}): { fullName: string; departmentLine: string; initials: string } {
  const fullName = asNonEmptyString(authUser.user_metadata?.fullName) ?? "User";
  const dept = asNonEmptyString(authUser.user_metadata?.department) ?? "";
  const position = asNonEmptyString(authUser.user_metadata?.position) ?? "";

  const departmentLine = [dept, position].filter(Boolean).join(" | ");

  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

  return { fullName, departmentLine, initials: initials || "U" };
}
