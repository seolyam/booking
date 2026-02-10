import type { NavSection } from "./types";

export function adminNav(): NavSection[] {
  return [
    {
      title: "Overview",
      items: [
        {
          key: "dashboard",
          label: "Dashboard",
          href: "/dashboard",
          activeMatch: (p) => p === "/dashboard",
        },
      ],
    },
    {
      title: "Requests",
      items: [

        {
          key: "requests",
          label: "Your Requests",
          href: "/dashboard/requests",
          activeMatch: (p) =>
            p === "/dashboard/requests" ||
            (p.startsWith("/dashboard/requests/") &&
              !p.startsWith("/dashboard/requests/create")),
        },
      ],
    },
    {
      title: "Administration",
      items: [
        {
          key: "all_requests",
          label: "All Requests",
          href: "/dashboard/admin/requests",
        },
        {
          key: "approvals",
          label: "Approvals",
          href: "/dashboard/admin/approvals",
        },
        {
          key: "manage_forms",
          label: "Manage Forms",
          href: "/dashboard/manage-forms",
        },
      ],
    },
  ];
}
