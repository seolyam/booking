import type { NavSection } from "./types";

export function requesterNav(): NavSection[] {
  return [
    {
      items: [
        {
          key: "dashboard",
          label: "Dashboard",
          href: "/dashboard",
          activeMatch: (p) => p === "/dashboard",
        },
        {
          key: "create",
          label: "Create Request",
          href: "/dashboard/requests/create",
        },
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
  ];
}
