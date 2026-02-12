import { getAuthUser } from "@/lib/supabase/server";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";

/**
 * Verifies the current user is authenticated and has the "superadmin" role.
 * Throws if not authenticated or not a superadmin.
 * Returns the app-level user record.
 */
export async function requireSuperadmin() {
  const authUser = await getAuthUser();
  if (!authUser) throw new Error("Not authenticated");

  const appUser = await getOrCreateAppUserFromAuthUser({
    id: authUser.id,
    email: authUser.email ?? null,
    user_metadata: authUser.user_metadata ?? null,
  });

  if (appUser.role !== "superadmin") {
    throw new Error("Unauthorized: Superadmin access required");
  }
  return appUser;
}
