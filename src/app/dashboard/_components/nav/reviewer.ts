import { LayoutDashboard, ListChecks } from "lucide-react";
import type { NavItem, NavSection } from "./types";

export function reviewerNav(): NavSection[] {
  const items: NavItem[] = [
    {
      key: "dashboard",
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      isActive: (p) => p === "/dashboard",
    },
    {
      key: "review",
      label: "Budget Review",
      href: "/dashboard/reviewer/review",
      icon: ListChecks,
      isActive: (p) => p.startsWith("/dashboard/reviewer"),
    },
    {
      key: "list",
      label: "List of Requests",
      href: "/dashboard/budget",
      isActive: (p) => p.startsWith("/dashboard/budget"),
    },
  ];

  return [{ items }];
}
