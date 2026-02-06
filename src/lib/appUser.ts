import { db } from "@/db";
import { users, branches } from "@/db/schema";
import { eq } from "drizzle-orm";

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function getRoleFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): "requester" | "admin" | "superadmin" {
  const role = asNonEmptyString(metadata?.requestedRole);
  if (role === "requester" || role === "admin" || role === "superadmin") {
    return role;
  }
  return "requester";
}

export type AppUser = {
  id: string;
  email: string;
  role: "requester" | "admin" | "superadmin";
  branchId: string | null;
  approvalStatus: "pending" | "approved" | "rejected";
  requestedRole: "requester" | "admin" | "superadmin";
  fullName: string | null;
  position: string | null;
  department: string | null;
};

const getCachedAppUser = async (userId: string) => {
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return rows[0];
};

export async function getOrCreateAppUserFromAuthUser(authUser: {
  id: string;
  email: string | null;
  user_metadata?: Record<string, unknown> | null;
}): Promise<AppUser> {
  const existing = await getCachedAppUser(authUser.id);

  if (existing) {
    return {
      id: existing.id,
      email: existing.email,
      role: existing.role,
      branchId: existing.branch_id,
      approvalStatus: existing.approval_status,
      requestedRole: existing.requested_role,
      fullName: existing.full_name,
      position: existing.position,
      department: existing.department,
    };
  }

  const email = authUser.email ?? "";
  if (!email) throw new Error("Authenticated user has no email");

  const requestedRole = getRoleFromMetadata(authUser.user_metadata);
  const fullName = asNonEmptyString(authUser.user_metadata?.fullName);
  const position = asNonEmptyString(authUser.user_metadata?.position);
  const department = asNonEmptyString(authUser.user_metadata?.department);
  const branchId = asNonEmptyString(authUser.user_metadata?.branchId);

  let validBranchId: string | null = null;
  if (branchId) {
    const branchExists = await db.query.branches.findFirst({
      where: eq(branches.id, branchId),
      columns: { id: true },
    });
    if (branchExists) {
      validBranchId = branchId;
    }
  }


  await db
    .insert(users)
    .values({
      id: authUser.id,
      email,
      role: "requester",
      requested_role: requestedRole,
      full_name: fullName,
      position,
      department,
      branch_id: validBranchId,
    })
    .onConflictDoNothing({ target: users.id });

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);
  const createdOrExisting = rows[0];

  if (!createdOrExisting) throw new Error("Failed to provision app user record");

  return {
    id: createdOrExisting.id,
    email: createdOrExisting.email,
    role: createdOrExisting.role,
    branchId: createdOrExisting.branch_id,
    approvalStatus: createdOrExisting.approval_status,
    requestedRole: createdOrExisting.requested_role,
    fullName: createdOrExisting.full_name,
    position: createdOrExisting.position,
    department: createdOrExisting.department,
  };
}

export function getDisplayProfileFromAuthUser(authUser: {
  email: string | null;
  user_metadata?: Record<string, unknown> | null;
}): { fullName: string; positionLine: string; initials: string } {
  const fullName = asNonEmptyString(authUser.user_metadata?.fullName) ?? "User";
  const position = asNonEmptyString(authUser.user_metadata?.position) ?? "";
  const department = asNonEmptyString(authUser.user_metadata?.department) ?? "";

  const positionLine = [position, department].filter(Boolean).join(" | ");

  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

  return { fullName, positionLine, initials: initials || "U" };
}
