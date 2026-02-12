import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, visitorLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { VisitorLogsClient } from "./_components/VisitorLogsClient";

export const dynamic = "force-dynamic";

export default async function VisitorLogsPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const appUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  });

  if (!appUser || (appUser.role !== "superadmin" && appUser.role !== "admin")) {
    redirect("/dashboard");
  }

  const logs = await db
    .select()
    .from(visitorLogs)
    .orderBy(desc(visitorLogs.time_in));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Visitor Logs</h1>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          &larr; Back to dashboard
        </Link>
      </div>

      <VisitorLogsClient logs={logs} />
    </div>
  );
}
