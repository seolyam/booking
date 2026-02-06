"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  PlusCircle,
  ClipboardList,
  Shield,
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
      label: "New",
      href: "/dashboard/requests/create",
      icon: PlusCircle,
      activeMatch: (p) => p.startsWith("/dashboard/requests/create"),
    },
    {
      key: "requests",
      label: "Requests",
      href: "/dashboard/requests",
      icon: FileText,
      activeMatch: (p) =>
        p === "/dashboard/requests" ||
        (p.startsWith("/dashboard/requests/") &&
          !p.startsWith("/dashboard/requests/create")),
    },
  ];

  const adminItems: NavItemConfig[] = [
    ...requesterItems,
    {
      key: "admin_requests",
      label: "All Req",
      href: "/dashboard/admin/requests",
      icon: ClipboardList,
      activeMatch: (p) => p.startsWith("/dashboard/admin/requests"),
    },
  ];

  const superadminItems: NavItemConfig[] = [
    ...adminItems,
    {
      key: "approvals",
      label: "Approvals",
      href: "/dashboard/admin/approvals",
      icon: Shield,
      activeMatch: (p) => p.startsWith("/dashboard/admin/approvals"),
    },
  ];

  if (role === "superadmin") return superadminItems.slice(0, 5); // Limit to 5 for bottom bar
  if (role === "admin") return adminItems;
  return requesterItems;
}

export default function MobileBottomNav({ role }: { role: Role }) {
  const pathname = usePathname() ?? "/dashboard";
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
