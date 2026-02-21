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
      title: "Tickets",
      items: [

        {
          key: "requests",
          label: "Your Tickets",
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
          label: "All Tickets",
          href: "/dashboard/admin/requests",
        },

        {
          key: "visitor_logs",
          label: "Visitor Logs",
          href: "/dashboard/admin/visitor-logs",
        },
        {
          key: "audit_logs",
          label: "Audit Logs",
          href: "/dashboard/admin/audit-logs",
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
