"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  PlusCircle,
  List,
  CheckSquare,
  ClipboardCheck,
  Users,
  Shield,
  User,
  FileSearch,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "./nav";

interface NavItemConfig {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  activeMatch?: (pathname: string) => boolean;
}

function getNavItems(role: Role): NavItemConfig[] {
  const requesterItems: NavItemConfig[] = [
    {
      key: "dashboard",
      label: "Home",
      href: "/dashboard",
      icon: Home,
      activeMatch: (p) => p === "/dashboard",
    },
    {
      key: "create",
      label: "Create",
      href: "/dashboard/budget/create",
      icon: PlusCircle,
      activeMatch: (p) => p.startsWith("/dashboard/budget/create"),
    },
    {
      key: "requests",
      label: "Requests",
      href: "/dashboard/requests",
      icon: FileText,
      activeMatch: (p) => p.startsWith("/dashboard/requests"),
    },
    {
      key: "list",
      label: "All",
      href: "/dashboard/budget",
      icon: List,
      activeMatch: (p) =>
        p.startsWith("/dashboard/budget") &&
        !p.startsWith("/dashboard/budget/create"),
    },
  ];

  const reviewerItems: NavItemConfig[] = [
    {
      key: "dashboard",
      label: "Home",
      href: "/dashboard",
      icon: Home,
      activeMatch: (p) => p === "/dashboard",
    },
    {
      key: "review",
      label: "Review",
      href: "/dashboard/reviewer/review",
      icon: CheckSquare,
      activeMatch: (p) => p.startsWith("/dashboard/reviewer"),
    },
    {
      key: "list",
      label: "All",
      href: "/dashboard/budget",
      icon: List,
      activeMatch: (p) => p.startsWith("/dashboard/budget"),
    },
  ];

  const approverItems: NavItemConfig[] = [
    {
      key: "dashboard",
      label: "Home",
      href: "/dashboard",
      icon: Home,
      activeMatch: (p) => p === "/dashboard",
    },
    {
      key: "approvals",
      label: "Approvals",
      href: "/dashboard/approver/approvals",
      icon: ClipboardCheck,
      activeMatch: (p) => p.startsWith("/dashboard/approver"),
    },
    {
      key: "list",
      label: "All",
      href: "/dashboard/budget",
      icon: List,
      activeMatch: (p) => p.startsWith("/dashboard/budget"),
    },
  ];

  const superadminItems: NavItemConfig[] = [
    {
      key: "dashboard",
      label: "Home",
      href: "/dashboard",
      icon: Home,
      activeMatch: (p) => p === "/dashboard",
    },
    {
      key: "users",
      label: "Users",
      href: "/dashboard/admin/approvals",
      icon: Users,
      activeMatch: (p) => p.startsWith("/dashboard/admin"),
    },
    {
      key: "review",
      label: "Review",
      href: "/dashboard/reviewer/review",
      icon: CheckSquare,
      activeMatch: (p) => p.startsWith("/dashboard/reviewer"),
    },
    {
      key: "approvals",
      label: "Approve",
      href: "/dashboard/approver/approvals",
      icon: ClipboardCheck,
      activeMatch: (p) => p.startsWith("/dashboard/approver"),
    },
  ];

  if (role === "superadmin") return superadminItems;
  if (role === "reviewer") return reviewerItems;
  if (role === "approver") return approverItems;
  return requesterItems;
}

export default function MobileBottomNav({ role }: { role: Role }) {
  const pathname = usePathname() ?? "/dashboard";
  const [activeRole, setActiveRole] = React.useState<Role | null>(null);

  // For non-superadmins, render standard nav
  if (role !== "superadmin") {
    const items = getNavItems(role);
    return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16 px-2">
          {items.map((item) => (
            <NavButton key={item.key} item={item} pathname={pathname} />
          ))}
        </div>
      </nav>
    );
  }

  // Superadmin: Role Selection vs Role Menu
  const isRoleSelection = activeRole === null;

  return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 px-2">
        {isRoleSelection ? (
          <>
            <RoleButton
              icon={Shield}
              label="Super Admin"
              onClick={() => setActiveRole("superadmin")}
            />
            <RoleButton
              icon={User}
              label="Requester"
              onClick={() => setActiveRole("requester")}
            />
            <RoleButton
              icon={FileSearch}
              label="Reviewer"
              onClick={() => setActiveRole("reviewer")}
            />
            <RoleButton
              icon={CheckCircle}
              label="Approver"
              onClick={() => setActiveRole("approver")}
            />
          </>
        ) : (
          <>
            {/* Back Button */}
            <button
              onClick={() => setActiveRole(null)}
              className="relative flex flex-col items-center justify-center flex-1 py-2 px-1 min-h-14 rounded-lg transition-colors text-gray-500 hover:text-gray-700 active:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5 mb-1 text-gray-400" />
              <span className="text-[10px] font-medium">Back</span>
            </button>

            {/* Role Items */}
            {getNavItems(activeRole).map((item) => (
              <NavButton key={item.key} item={item} pathname={pathname} />
            ))}
          </>
        )}
      </div>
    </nav>
  );
}

// Helper components
function RoleButton({
  icon: Icon,
  label,
  onClick,
  isActive = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  isActive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center flex-1 py-2 px-1 min-h-14 rounded-lg transition-colors",
        isActive
          ? "text-[#358334]"
          : "text-gray-500 hover:text-gray-700 active:bg-gray-100",
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5 mb-1",
          isActive ? "text-[#358334]" : "text-gray-400",
        )}
      />
      <span
        className={cn(
          "text-[10px] font-medium",
          isActive ? "font-semibold" : "",
        )}
      >
        {label}
      </span>
      {isActive && (
        <div className="absolute bottom-1 w-1 h-1 rounded-full bg-[#358334]" />
      )}
    </button>
  );
}

function NavButton({
  item,
  pathname,
}: {
  item: NavItemConfig;
  pathname: string;
}) {
  const isActive = item.activeMatch
    ? item.activeMatch(pathname)
    : pathname === item.href;

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative flex flex-col items-center justify-center flex-1 py-2 px-1 min-h-14 rounded-lg transition-colors",
        isActive
          ? "text-[#358334]"
          : "text-gray-500 hover:text-gray-700 active:bg-gray-100",
      )}
    >
      <item.icon
        className={cn(
          "h-5 w-5 mb-1",
          isActive ? "text-[#358334]" : "text-gray-400",
        )}
      />
      <span
        className={cn(
          "text-[10px] font-medium",
          isActive ? "font-semibold" : "",
        )}
      >
        {item.label}
      </span>
      {isActive && (
        <div className="absolute bottom-1 w-1 h-1 rounded-full bg-[#358334]" />
      )}
    </Link>
  );
}
