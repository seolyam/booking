import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, activityLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { User, Calendar, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

function getInitials(email: string) {
  if (!email) return "?";
  const parts = email.split("@")[0].split(/[._]/).filter(Boolean);
  return parts.map(p => p[0].toUpperCase()).join("") || email[0].toUpperCase();
}

function formatDate(date: Date | string) {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const STATUS_CONFIG = {
  open: { label: "Open", color: "success" },
  pending: { label: "Pending", color: "warning" },
  resolved: { label: "Resolved", color: "info" },
  cancelled: { label: "Cancelled", color: "error" },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

function beautifyAction(action: string) {
  if (!action) return "—";
  let str = action.replaceAll("_", " ");
  str = str.charAt(0).toUpperCase() + str.slice(1);
  // Custom handling for status changes
  if (/status changed to (open|pending|resolved|cancelled)/i.test(str)) {
    const m = str.match(/status changed to (\w+)/i);
    if (m) {
      const statusKey = m[1].toLowerCase();
      if (isStatusKey(statusKey)) {
        const config = STATUS_CONFIG[statusKey];
        return `Changed status to ${config.label}`;
      }
      return `Changed status to ${m[1]}`;
    }
  }
  return str.replace(/([A-Z])/g, " $1").replace(/  +/g, " ").trim();
}

function isStatusKey(key: string): key is StatusKey {
  return ["open", "pending", "resolved", "cancelled"].includes(key);
}

function getStatusBadge(action: string) {
  const m = action.match(/status_changed_to_(open|pending|resolved|cancelled)/);
  if (!m) return null;
  const statusKey = m[1] as string;
  if (isStatusKey(statusKey)) {
    const config = STATUS_CONFIG[statusKey];
    return <Badge variant={config.color}>{config.label}</Badge>;
  }
  return null;
}

function isEmptyObject(obj: unknown): boolean {
  return typeof obj === "object" && obj !== null && Object.keys(obj).length === 0;
}

export default async function AuditLogsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const appUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  });
  if (!appUser || appUser.role !== "superadmin") {
    redirect("/dashboard");
  }

  const logs = await db.query.activityLogs.findMany({
    orderBy: [desc(activityLogs.created_at)],
    limit: 200,
  });
  const usersList = await db.query.users.findMany();
  const userMap = Object.fromEntries(usersList.map(u => [u.id, u]));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-6 w-6 text-gray-600" />
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          &larr; Back to dashboard
        </Link>
      </div>
      <div className="bg-white rounded-xl shadow p-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Time</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const userObj = userMap[log.actor_id];
              const email = userObj?.email || "-";
              const initials = getInitials(email);
              return (
                <tr key={log.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap flex items-center gap-3">
                    <span className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-bold mr-2">
                      {initials.length > 1 ? initials.slice(0, 2) : <User className="h-5 w-5" />}
                    </span>
                    <span className="truncate text-sm font-medium text-gray-800">{email}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span>{beautifyAction(log.action)}</span> {getStatusBadge(log.action)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-700">
                    {log.metadata == null || log.metadata == undefined || log.metadata === "null" || isEmptyObject(log.metadata) ? (
                      <span className="text-gray-300">—</span>
                    ) : (
                      <span className="font-mono bg-gray-50 px-2 py-1 rounded text-xs">{typeof log.metadata === "object" ? JSON.stringify(log.metadata) : String(log.metadata)}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="text-gray-400 text-center mt-6">No audit logs found.</div>
        )}
      </div>
    </div>
  );
}
