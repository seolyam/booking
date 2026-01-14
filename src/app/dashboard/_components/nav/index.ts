import type { NavSection, Role } from "./types";
import { approverNav } from "./approver";
import { requesterNav } from "./requester";
import { reviewerNav } from "./reviewer";
import { superadminNav } from "./superadmin";

export type { NavItem, NavSection, Role } from "./types";

export function buildNav(role: Role): NavSection[] {
  if (role === "superadmin") return superadminNav();
  if (role === "reviewer") return reviewerNav();
  if (role === "approver") return approverNav();
  return requesterNav();
}
