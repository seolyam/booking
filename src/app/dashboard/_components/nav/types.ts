export type Role = "requester" | "reviewer" | "approver" | "superadmin";

export type NavItem = {
  key: string;
  label: string;
  href: string;
  isActive?: (pathname: string) => boolean;
  icon?: React.ComponentType<{ className?: string }>;
};

export type NavSection = { title?: string; items: NavItem[] };
