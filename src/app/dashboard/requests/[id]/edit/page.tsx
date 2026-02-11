import { getAuthUser } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getRequestById } from "@/actions/request";
import { getOrCreateAppUserFromAuthUser } from "@/lib/appUser";
import EditRequestClient from "./_components/EditRequestClient";

export const dynamic = "force-dynamic";

export default async function EditRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getAuthUser();
  if (!user) redirect("/login");

  const appUser = await getOrCreateAppUserFromAuthUser({
    id: user.id,
    email: user.email ?? null,
    user_metadata: (user.user_metadata ?? null) as Record<string, unknown> | null,
  });

  const request = await getRequestById(id);
  if (!request) notFound();

  // Only the owner can edit
  if (request.requester_id !== appUser.id) {
    redirect(`/dashboard/requests/${id}`);
  }

  // Can only edit when status is needs_revision
  if (request.status !== "needs_revision") {
    redirect(`/dashboard/requests/${id}`);
  }

  // Get the latest revision reason from activity logs
  const latestRevisionLog = request.activityLogs.find(
    (log) => log.new_status === "needs_revision"
  );
  const revisionReason = latestRevisionLog?.comment ?? null;

  return (
    <EditRequestClient
      request={request}
      revisionReason={revisionReason}
    />
  );
}
