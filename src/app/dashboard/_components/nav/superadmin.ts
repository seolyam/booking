import type { NavSection } from "./types";
import { adminNav } from "./admin";

export function superadminNav(): NavSection[] {
  const adminSections = adminNav().map((section) => {
    if (section.title === "Requests") {
      return {
        ...section,
        items: [
          {
            key: "create_request",
            label: "Create Request",
            href: "/dashboard/requests/create",
          },
          ...section.items,
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
