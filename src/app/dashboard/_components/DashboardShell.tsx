"use client";

import Link from "next/link";
import {
  Bell,
  LogOut,
  ShieldCheck,
  LayoutDashboard,
  ListChecks,
} from "lucide-react";
import { signOut } from "@/actions/auth";
import { usePathname } from "next/navigation";

type Role = "requester" | "reviewer" | "approver" | "superadmin";

type Profile = { fullName: string; departmentLine: string; initials: string };

type NavItem = {
  key: string;
  label: string;
  href: string;
  isActive?: (pathname: string) => boolean;
  icon?: React.ComponentType<{ className?: string }>;
};

function roleLabel(role: Role) {
  if (role === "superadmin") return "Superadmin";
  if (role === "reviewer") return "Reviewer";
  if (role === "approver") return "Approver";
  return "Requester";
}

function buildNav(role: Role): { title?: string; items: NavItem[] }[] {
  const requesterSection: NavItem[] = [
    {
      key: "dashboard",
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      isActive: (p) => p === "/dashboard",
    },
    {
      key: "create",
      label: "Create Request",
      href: "/dashboard/budget/create",
      icon: ListChecks,
      isActive: (p) => p.startsWith("/dashboard/budget/create"),
    },
    {
      key: "mine",
      label: "Your Requests",
      href: "/dashboard/requests",
      isActive: (p) => p.startsWith("/dashboard/requests"),
    },
    {
      key: "list",
      label: "List of Requests",
      href: "/dashboard/budget",
      isActive: (p) => p.startsWith("/dashboard/budget"),
    },
  ];

  if (role === "superadmin") {
    return [
      { title: "Requester", items: requesterSection },
      {
        title: "Admin",
        items: [
          {
            key: "approvals",
            label: "User Approvals",
            href: "/dashboard/admin/approvals",
            icon: ShieldCheck,
            isActive: (p) => p.startsWith("/dashboard/admin/approvals"),
          },
        ],
      },
    ];
  }

  // For now other roles use the requester section (until their pages exist)
  return [{ items: requesterSection }];
}

export default function DashboardShell({
  children,
  profile,
  role,
}: {
  children: React.ReactNode;
  profile: Profile;
  role: Role;
}) {
  const pathname = usePathname() ?? "/dashboard";
  const showDashboardHeader = pathname === "/dashboard";
  const sections = buildNav(role);

  const navItem = (item: NavItem) => {
    const isActive = item.isActive
      ? item.isActive(pathname)
      : pathname === item.href;
    const Icon = item.icon;

    return (
      <Link
        key={item.key}
        href={item.href}
        className={
          "flex items-center gap-2 rounded-lg px-4 py-2 text-base " +
          (isActive
            ? "bg-[#D7F7D6] text-[#2F5E3D]"
            : "text-gray-700 hover:bg-black/5")
        }
      >
        {Icon && <Icon className="h-4 w-4" />}
        {item.label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-[#C7C800] to-[#2F5E3D] p-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
          {/* Sidebar */}
          <aside className="rounded-2xl bg-white/95 shadow-sm ring-1 ring-black/5 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-[#358334] flex items-center justify-center text-white font-semibold">
                  {profile.initials}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 truncate">
                    {profile.fullName}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {profile.departmentLine}
                  </div>
                </div>
              </div>
            </div>

            <nav className="px-4 pb-4 space-y-4">
              {sections.map((section, idx) => (
                <div key={idx}>
                  {section.title && (
                    <div className="px-4 pb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      {section.title}
                    </div>
                  )}
                  <div className="space-y-1">{section.items.map(navItem)}</div>
                </div>
              ))}
            </nav>

            <div className="mt-2 border-t border-black/10" />

            <div className="p-4">
              <form action={signOut}>
                <button
                  type="submit"
                  className="inline-flex w-full items-center gap-2 rounded-lg px-4 py-2 text-sm text-[#E34B33] hover:bg-[#E34B33]/10"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </form>
            </div>
          </aside>

          {/* Main */}
          <section className="rounded-2xl bg-[#F7F7F3] shadow-sm ring-1 ring-black/5 p-8">
            {showDashboardHeader && (
              <div className="flex items-start justify-between gap-6 mb-8">
                <div className="min-w-0">
                  <div className="text-3xl font-semibold text-gray-900 truncate">
                    Welcome back, {profile.fullName.split(" ")[0]}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {roleLabel(role)} Dashboard
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Notifications"
                  className="rounded-full p-2 text-gray-700 hover:bg-black/5"
                >
                  <Bell className="h-5 w-5" />
                </button>
              </div>
            )}

            {children}
          </section>
        </div>
      </div>
    </div>
  );
}
