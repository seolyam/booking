"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type UserRow, createUser, updateUser } from "@/actions/users";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserRow | null; // null = create mode
  branches: { id: string; name: string }[];
  currentUserId: string;
};

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  branches,
  currentUserId,
}: Props) {
  const isEdit = !!user;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"requester" | "admin" | "superadmin">("requester");
  const [branchId, setBranchId] = useState<string>("none");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");

  // Reset form when dialog opens
  function handleOpenChange(newOpen: boolean) {
    if (newOpen) {
      setError(null);
      if (user) {
        setFullName(user.fullName ?? "");
        setEmail(user.email);
        setRole(user.role);
        setBranchId(user.branchId ?? "none");
        setPosition(user.position ?? "");
        setDepartment(user.department ?? "");
      } else {
        setFullName("");
        setEmail("");
        setPassword("");
        setRole("requester");
        setBranchId("none");
        setPosition("");
        setDepartment("");
      }
    }
    onOpenChange(newOpen);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const branchValue = branchId === "none" ? null : branchId;

      if (isEdit) {
        const result = await updateUser({
          userId: user!.id,
          fullName,
          role,
          branchId: branchValue,
          position: position || undefined,
          department: department || undefined,
        });
        if (result.error) {
          setError(result.error);
        } else {
          onOpenChange(false);
        }
      } else {
        const result = await createUser({
          fullName,
          email,
          password,
          role,
          branchId: branchValue,
          position: position || undefined,
          department: department || undefined,
        });
        if (result.error) {
          setError(result.error);
        } else {
          onOpenChange(false);
        }
      }
    });
  }

  // Prevent superadmin from changing their own role
  const isEditingSelf = isEdit && user?.id === currentUserId;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit User" : "Add New User"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the user's details below."
              : "Create a new system user. They will be able to log in immediately."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Full Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Juan Dela Cruz"
              required
            />
          </div>

          {/* Email (create-only) */}
          {!isEdit && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
            </div>
          )}

          {/* Password (create-only) */}
          {!isEdit && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Password <span className="text-red-500">*</span>
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                minLength={6}
                required
              />
            </div>
          )}

          {/* Role + Branch row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Role <span className="text-red-500">*</span>
              </label>
              <Select
                value={role}
                onValueChange={(v) =>
                  setRole(v as "requester" | "admin" | "superadmin")
                }
                disabled={isEditingSelf}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="requester">Requester</SelectItem>
                  <SelectItem value="admin">Approver</SelectItem>
                  <SelectItem value="superadmin">Superadmin</SelectItem>
                </SelectContent>
              </Select>
              {isEditingSelf && (
                <p className="text-[11px] text-amber-600">
                  Cannot change your own role
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Branch</label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No branch</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Position + Department row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Position</label>
              <Input
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="e.g. Manager"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Department</label>
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Operations"
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          )}

          <DialogFooter className="pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-[#358334] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2F5E3D] transition-colors shadow-sm disabled:opacity-50"
            >
              {isPending
                ? isEdit
                  ? "Saving..."
                  : "Creating..."
                : isEdit
                  ? "Save Changes"
                  : "Create User"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
