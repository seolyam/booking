import { ArrowLeftRight, LayoutDashboard, ListChecks } from "lucide-react";
import type { NavItem, NavSection } from "./types";

export function reviewerNav(): NavSection[] {
  const items: NavItem[] = [
    {
      key: "dashboard",
      label: "Dashboard",
      href: "/dashboard/reviewer",
      icon: LayoutDashboard,
      isActive: (p) => p === "/dashboard/reviewer",
    },
    {
      key: "review",
      label: "Budget Review",
      href: "/dashboard/reviewer/review",
      icon: ListChecks,
      isActive: (p) => p.startsWith("/dashboard/reviewer/review"),
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
