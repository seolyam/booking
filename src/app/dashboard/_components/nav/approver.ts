import { ArrowLeftRight, LayoutDashboard, ListChecks } from "lucide-react";
import type { NavItem, NavSection } from "./types";

export function approverNav(): NavSection[] {
  const items: NavItem[] = [
    {
      key: "dashboard",
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      isActive: (p) => p === "/dashboard",
    },
    {
      key: "approvals",
      label: "List of Proposals",
      href: "/dashboard/approver/approvals",
      icon: ListChecks,
      isActive: (p) => p.startsWith("/dashboard/approver"),
    },
    {
      key: "list",
      label: "List of Requests",
      href: "/dashboard/budget",
      isActive: (p) => p.startsWith("/dashboard/budget"),
    },
    {
      key: "compare",
      label: "Compare Projects",
      href: "/dashboard/compare",
      icon: ArrowLeftRight,
      isActive: (p) => p.startsWith("/dashboard/compare"),
    },
  ];

  return [{ items }];
}
