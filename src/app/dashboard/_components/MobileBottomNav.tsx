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
      href: "/dashboard/reviewer",
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
      href: "/dashboard/reviewer",
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
  const items = getNavItems(role);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg md:hidden safe-area-pb">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const isActive = item.activeMatch
            ? item.activeMatch(pathname)
            : pathname === item.href;

          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-2 px-1 min-h-[56px] rounded-lg transition-colors",
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
        })}
      </div>
    </nav>
  );
}
