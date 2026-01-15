import { LayoutDashboard, ListChecks } from "lucide-react";
import type { NavItem, NavSection } from "./types";

export function requesterNav(): NavSection[] {
  const items: NavItem[] = [
    {
      key: "dashboard",
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      isActive: (p) => p === "/dashboard",
    },
    {
      key: "create",
      label: "Create Request",
      href: "/dashboard/budget/create",
      icon: ListChecks,
      isActive: (p) => p.startsWith("/dashboard/budget/create"),
    },
    {
      key: "mine",
      label: "Your Requests",
      href: "/dashboard/requests",
      isActive: (p) => p.startsWith("/dashboard/requests"),
    },
    {
      key: "list",
      label: "List of Requests",
      href: "/dashboard/budget",
      isActive: (p) => p === "/dashboard/budget" || (p.startsWith("/dashboard/budget/") && !p.startsWith("/dashboard/budget/create")),
    },
  ];

  return [{ items }];
}
