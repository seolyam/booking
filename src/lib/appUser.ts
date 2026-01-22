import { db } from "@/db";
import { departmentEnum, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";

const FALLBACK_DEPARTMENT = "Finance" as const;

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function getDepartmentFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): string {
  // The DB enum is strict; only accept exact matches. Otherwise fall back.
  const department = asNonEmptyString(metadata?.department);
  if (!department) return FALLBACK_DEPARTMENT;
  return departmentEnum.enumValues.includes(department as never)
    ? department
    : FALLBACK_DEPARTMENT;
}

function getRoleFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): "requester" | "reviewer" | "approver" | "superadmin" {
  const role = asNonEmptyString(metadata?.requestedRole);
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
  approvalStatus: "pending" | "approved" | "rejected";
  requestedRole: "requester" | "reviewer" | "approver" | "superadmin";
};

// Cached lookup for existing users - reduces DB calls on navigation
const getCachedAppUser = unstable_cache(
  async (userId: string) => {
    const existing = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    return existing;
  },
  ["app-user"],
  {
    revalidate: 60, // Cache for 60 seconds
    tags: ["app-user"],
  },
);

export async function getOrCreateAppUserFromAuthUser(authUser: {
  id: string;
  email: string | null;
  user_metadata?: Record<string, unknown> | null;
}): Promise<AppUser> {
  // Use cached lookup first
  const existing = await getCachedAppUser(authUser.id);

  if (existing) {
    return {
      id: existing.id,
      email: existing.email,
      role: existing.role,
      department: existing.department,
      approvalStatus: existing.approval_status,
      requestedRole: existing.requested_role,
    };
  }

  const email = authUser.email ?? "";
  if (!email) {
    // Shouldn’t happen for email/password auth, but avoid inserting invalid records.
    throw new Error("Authenticated user has no email");
  }

  const department = getDepartmentFromMetadata(authUser.user_metadata);
  const requestedRole = getRoleFromMetadata(authUser.user_metadata);
  const fullName = asNonEmptyString(authUser.user_metadata?.fullName);
  const position = asNonEmptyString(authUser.user_metadata?.position);
  const idNumber = asNonEmptyString(authUser.user_metadata?.idNumber);

  // Avoid race conditions: the auth callback and the dashboard can both attempt
  // to provision the same app user concurrently.
  await db
    .insert(users)
    .values({
      id: authUser.id,
      email,
      department: department as never,
      role: "requester", // New users start as requesters; admin promotes after approval
      requested_role: requestedRole,
      full_name: fullName,
      position: position,
      id_number: idNumber,
    })
    .onConflictDoNothing({ target: users.id });

  const createdOrExisting = await db.query.users.findFirst({
    where: eq(users.id, authUser.id),
  });

  if (!createdOrExisting) {
    throw new Error("Failed to provision app user record");
  }

  return {
    id: createdOrExisting.id,
    email: createdOrExisting.email,
    role: createdOrExisting.role,
    department: createdOrExisting.department,
    approvalStatus: createdOrExisting.approval_status,
    requestedRole: createdOrExisting.requested_role,
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
