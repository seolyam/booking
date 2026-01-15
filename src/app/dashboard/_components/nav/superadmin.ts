import { ShieldCheck, LayoutDashboard, ListChecks } from "lucide-react";
import type { NavItem, NavSection } from "./types";

export function superadminNav(): NavSection[] {
  const adminItems: NavItem[] = [
    {
      key: "dashboard",
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      isActive: (p) => p === "/dashboard",
    },
    {
      key: "approvals",
      label: "User Approvals",
      href: "/dashboard/admin/approvals",
      icon: ShieldCheck,
      isActive: (p) => p.startsWith("/dashboard/admin/approvals"),
    },
  ];

  const requesterItems: NavItem[] = [
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
      isActive: (p) =>
        p === "/dashboard/budget" ||
        (p.startsWith("/dashboard/budget/") &&
          !p.startsWith("/dashboard/budget/create")),
    },
  ];

  return [
    { title: "Admin", items: adminItems },
    { title: "Requester", items: requesterItems },
  ];
}
