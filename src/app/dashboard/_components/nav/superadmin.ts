import type { NavSection } from "./types";
import { adminNav } from "./admin";

export function superadminNav(): NavSection[] {
  const adminSections = adminNav();

  return [
    ...adminSections,
    {
      title: "System",
      items: [
        {
          key: "users",
          label: "Manage Users",
          href: "/dashboard/admin/users",
        },
        {
          key: "settings",
          label: "Settings",
          href: "/dashboard/admin/settings",
        },
      ],
    },
  ];
}
