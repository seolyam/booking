"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

// Finds the ID of the most recent pending user with the requested role
export async function findPendingUserToApprove(requestedRole: "admin" | "requester" | "superadmin") {
  const user = await db.query.users.findFirst({
    where: and(
      eq(users.requested_role, requestedRole),
      eq(users.approval_status, "pending")
    ),
    orderBy: [desc(users.created_at)],
    columns: { id: true, email: true }
  });
  return user;
}
