export type Role = "requester" | "admin" | "superadmin";

export type NavItem = {
  key: string;
  label: string;
  href: string;
  activeMatch?: (pathname: string) => boolean;
};

export type NavSection = {
  title?: string;
  items: NavItem[];
};
