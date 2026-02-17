import type { NavSection } from "./types";
import { adminNav } from "./admin";

export function superadminNav(): NavSection[] {
  const adminSections = adminNav().map((section) => {
    if (section.title === "Tickets") {
      return {
        ...section,
        items: [
          {
            key: "create_request",
            label: "Create Ticket",
            href: "/dashboard/requests/create",
          },
          ...section.items,
        ],
      };
    }
    if (section.title === "Administration") {
      return {
        ...section,
        items: [
          ...section.items,
          {
            key: "approvals",
            label: "Approvals",
            href: "/dashboard/admin/approvals",
          },
        ],
      };
    }
    return section;
  });

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
