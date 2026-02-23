import type { NavSection } from "./types";

export function requesterNav(): NavSection[] {
  return [
    {
      items: [
        
        {
          key: "create",
          label: "Create Ticket",
          href: "/dashboard/requests/create",
        },
        {
          key: "requests",
          label: "My Tickets",
          href: "/dashboard/requests",
          activeMatch: (p) =>
            p === "/dashboard/requests" ||
            (p.startsWith("/dashboard/requests/") &&
              !p.startsWith("/dashboard/requests/create")),
        },
      ],
    },
  ];
}
