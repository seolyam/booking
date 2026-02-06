import type { NavSection, Role } from "./types";
import { adminNav } from "./admin";
import { requesterNav } from "./requester";
import { superadminNav } from "./superadmin";

export type { NavItem, NavSection, Role } from "./types";

export function buildNav(role: Role): NavSection[] {
  if (role === "superadmin") return superadminNav();
  if (role === "admin") return adminNav();
  return requesterNav();
}
