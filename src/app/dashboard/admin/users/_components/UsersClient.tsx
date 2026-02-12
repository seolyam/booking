"use client";

import { useDeferredValue, useState, useTransition } from "react";
import {
  Pencil,
  Search,
  ShieldOff,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import {
  MobileCardList,
  type MobileCardData,
} from "@/components/ui/mobile-card";
import { UserFormDialog } from "./UserFormDialog";
import { type UserRow, toggleUserStatus } from "@/actions/users";

// ---------------------------------------------------------------------------
// Role badge styling
// ---------------------------------------------------------------------------

const ROLE_STYLES: Record<string, string> = {
  superadmin:
    "bg-green-50 text-green-700 ring-1 ring-green-200",
  admin:
    "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  requester:
    "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
};

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Superadmin",
  admin: "Approver",
  requester: "Requester",
};

function roleBadge(role: string) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_STYLES[role] ?? ROLE_STYLES.requester}`}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Status dot
// ---------------------------------------------------------------------------

function statusDot(status: string) {
  const isActive = status === "approved";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span
        className={`h-2 w-2 rounded-full ${isActive ? "bg-green-500" : "bg-red-500"}`}
      />
      {isActive ? "Active" : "Suspended"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Initials helper
// ---------------------------------------------------------------------------

function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function UsersClient(props: {
  rows: UserRow[];
  branches: { id: string; name: string }[];
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [isPending, startTransition] = useTransition();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

  // Client-side search filter
  const filteredRows = props.rows.filter((u) => {
    if (!deferredQuery.trim()) return true;
    const term = deferredQuery.toLowerCase();
    return (
      (u.fullName?.toLowerCase().includes(term) ?? false) ||
      u.email.toLowerCase().includes(term) ||
      (u.branchName?.toLowerCase().includes(term) ?? false) ||
      u.role.toLowerCase().includes(term)
    );
  });

  // Mobile cards
  const mobileCards: MobileCardData[] = filteredRows.map((u) => ({
    id: u.id,
    displayId: u.role.toUpperCase(),
    title: u.fullName ?? u.email,
    subtitle: u.branchName ?? "No branch",
    status: {
      label: u.approvalStatus === "approved" ? "Active" : "Suspended",
      variant: u.approvalStatus === "approved" ? ("success" as const) : ("error" as const),
    },
    actionHref: "#",
    actionLabel: "Edit" as const,
  }));

  function handleAdd() {
    setEditingUser(null);
    setDialogOpen(true);
  }

  function handleEdit(user: UserRow) {
    setEditingUser(user);
    setDialogOpen(true);
  }

  async function handleToggleStatus(userId: string) {
    const user = props.rows.find((u) => u.id === userId);
    const action = user?.approvalStatus === "approved" ? "suspend" : "reactivate";
    const confirmed = window.confirm(
      `Are you sure you want to ${action} this user?`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await toggleUserStatus(userId);
      if (result.error) {
        alert(result.error);
      }
    });
  }

  return (
    <>
      <div className="-m-4 md:-m-8 p-4 md:p-8 w-full mx-auto flex flex-col min-h-[calc(100vh-theme(spacing.16))]">
        {/* Mobile Header */}
        <div className="md:hidden mb-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900">Manage Users</h1>
            <button
              onClick={handleAdd}
              className="h-10 w-10 rounded-full bg-[#358334] text-white flex items-center justify-center shadow-lg"
              aria-label="Add User"
            >
              <UserPlus className="h-5 w-5" />
            </button>
          </div>

          {/* Mobile Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users..."
              className="h-12 w-full rounded-xl bg-gray-100 pl-11 pr-4 text-base outline-none focus:ring-2 focus:ring-[#358334]/20 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Mobile Card List */}
        <div className="md:hidden">
          <MobileCardList
            items={mobileCards}
            emptyMessage="No users found."
            showAmount={false}
          />
        </div>

        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-[#358334] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2F5E3D] transition-colors shadow-sm"
          >
            <UserPlus className="h-4 w-4" />
            Add User
          </button>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:flex flex-col flex-1 w-full rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden h-full">
          {/* Search Bar */}
          <div className="p-5 md:p-6 border-b border-gray-100 shrink-0">
            <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search users..."
                  className="h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                />
              </div>
              <div className="text-sm text-gray-400">
                {filteredRows.length} user{filteredRows.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="py-6 pl-8 pr-4 font-semibold w-[300px]">
                    User
                  </th>
                  <th className="py-6 px-4 font-semibold w-[120px]">Role</th>
                  <th className="py-6 px-4 font-semibold w-[160px]">Branch</th>
                  <th className="py-6 px-4 font-semibold w-[100px]">Status</th>
                  <th className="py-6 px-4 pr-8 font-semibold text-right w-[140px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-16 text-center text-sm text-gray-500"
                    >
                      {deferredQuery.trim()
                        ? "No users match your search."
                        : "No users yet."}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((u) => {
                    const isSelf = u.id === props.currentUserId;
                    const isSuspended = u.approvalStatus !== "approved";

                    return (
                      <tr
                        key={u.id}
                        className={`group hover:bg-gray-50/50 transition-colors ${isSuspended ? "opacity-60 bg-gray-50/30" : ""}`}
                      >
                        {/* User: Avatar + Name + Email */}
                        <td className="py-5 pl-8 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#358334] text-xs font-bold text-white">
                              {getInitials(u.fullName)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-gray-900 text-sm truncate">
                                {u.fullName ?? "Unnamed"}
                              </div>
                              <div className="text-xs text-gray-400 truncate">
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-5 px-4">{roleBadge(u.role)}</td>

                        {/* Branch */}
                        <td className="py-5 px-4">
                          <span className="text-sm text-gray-600">
                            {u.branchName ?? "—"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-5 px-4">{statusDot(u.approvalStatus)}</td>

                        {/* Actions */}
                        <td className="py-5 px-4 pr-8 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleEdit(u)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2C3E50] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1a252f] transition-colors shadow-sm"
                              title="Edit user"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleStatus(u.id)}
                              disabled={isSelf || isPending}
                              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors shadow-sm ${
                                isSelf
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                  : isSuspended
                                    ? "bg-green-50 text-green-700 hover:bg-green-100 ring-1 ring-green-200"
                                    : "bg-red-50 text-red-700 hover:bg-red-100 ring-1 ring-red-200"
                              }`}
                              title={
                                isSelf
                                  ? "Cannot deactivate your own account"
                                  : isSuspended
                                    ? "Reactivate user"
                                    : "Suspend user"
                              }
                            >
                              {isSuspended ? (
                                <ShieldCheck className="h-3.5 w-3.5" />
                              ) : (
                                <ShieldOff className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <UserFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={editingUser}
        branches={props.branches}
        currentUserId={props.currentUserId}
      />
    </>
  );
}
