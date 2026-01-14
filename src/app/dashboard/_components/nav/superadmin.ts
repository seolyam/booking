import { ShieldCheck } from "lucide-react";
import type { NavItem, NavSection } from "./types";
import { requesterNav } from "./requester";

export function superadminNav(): NavSection[] {
  const requester = requesterNav();

  const adminItems: NavItem[] = [
    {
      key: "approvals",
      label: "User Approvals",
      href: "/dashboard/admin/approvals",
      icon: ShieldCheck,
      isActive: (p) => p.startsWith("/dashboard/admin/approvals"),
    },
  ];

  return [
    { title: "Requester", items: requester[0]?.items ?? [] },
    { title: "Admin", items: adminItems },
  ];
}
