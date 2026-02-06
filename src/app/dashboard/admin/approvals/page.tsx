import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { approveUser, rejectUser } from "@/actions/admin";
import { Check, X } from "lucide-react";
import IdDocumentImage from "./_components/IdDocumentImage";
import Link from "next/link";

// Force dynamic rendering - requires auth and DB access
export const dynamic = "force-dynamic";

export default async function AdminApprovalsPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const appUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  });

  if (!appUser || appUser.role !== "superadmin") {
    redirect("/dashboard");
  }

  const pendingUsers = await db.query.users.findMany({
    where: or(
      eq(users.approval_status, "pending"),
      eq(users.approval_status, "rejected"),
    ),
    orderBy: (users, { desc }) => [desc(users.created_at)],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">User Approvals</h1>
        <Link
          href="/dashboard"
          className="text-sm text-gray-600 hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>

      {pendingUsers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            No pending applications
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {pendingUsers.map((u) => (
            <Card key={u.id}>
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center justify-between">
                  <span>
                    {u.full_name || u.email}
                    <span className="ml-3 text-sm font-normal text-gray-500">
                      {u.approval_status === "pending" && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          Pending
                        </span>
                      )}
                      {u.approval_status === "rejected" && (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded">
                          Rejected
                        </span>
                      )}
                    </span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: User Details */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Email</p>
                        <p className="font-medium text-gray-900">{u.email}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Department</p>
                        <p className="font-medium text-gray-900">
                          {u.department || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Position</p>
                        <p className="font-medium text-gray-900">
                          {u.position || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Requested Role</p>
                        <p className="font-medium text-gray-900 capitalize">
                          {u.requested_role}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-600">Registered</p>
                        <p className="font-medium text-gray-900">
                          {u.created_at.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: ID Document */}
                  <div>
                    <p className="text-gray-600 mb-2">ID Document</p>
                    {u.id_document_path ? (
                      <IdDocumentImage filePath={u.id_document_path} />
                    ) : (
                      <div className="flex items-center justify-center h-48 w-full rounded-md border bg-gray-50">
                        <p className="text-sm text-gray-500">No ID document uploaded</p>
                      </div>
                    )}
                  </div>
                </div>

                {u.rejection_reason && (
                  <div className="pt-4">
                    <p className="text-gray-600 text-sm">Rejection reason</p>
                    <p className="text-red-700">{u.rejection_reason}</p>
                  </div>
                )}

                {u.approval_status === "pending" && (
                  <div className="flex gap-3 pt-4 border-t mt-4">
                    <form
                      action={async () => {
                        "use server";
                        await approveUser(u.id);
                      }}
                    >
                      <Button
                        type="submit"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </form>
                    <form
                      action={async () => {
                        "use server";
                        await rejectUser(u.id, "Does not meet requirements");
                      }}
                    >
                      <Button
                        type="submit"
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </form>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
