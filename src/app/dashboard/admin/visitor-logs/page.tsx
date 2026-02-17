import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { getVisitorLogs } from "@/actions/visitor-logs";
import { VisitorLogsClient } from "./_components/VisitorLogsClient";

export const dynamic = "force-dynamic";

export default async function VisitorLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  }>;
}) {
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

  const params = await searchParams;

  const logs = await getVisitorLogs({
    search: params.search || undefined,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
    status: (params.status as "ACTIVE" | "COMPLETED" | "AUTO_CLOSED") || undefined,
  });

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

      <VisitorLogsClient
        logs={logs}
        initialFilters={{
          search: params.search ?? "",
          dateFrom: params.dateFrom ?? "",
          dateTo: params.dateTo ?? "",
          status: (params.status as "" | "ACTIVE" | "COMPLETED" | "AUTO_CLOSED") ?? "",
        }}
      />
    </div>
  );
}
