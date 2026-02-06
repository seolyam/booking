"use client";

import * as React from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut } from "@/actions/auth";
import { usePathname } from "next/navigation";

import NotificationsPopover from "@/components/NotificationsPopover";

import { buildNav, type NavItem, type Role } from "./nav";
import MobileNavbar from "./MobileNavbar";
import MobileBottomNav from "./MobileBottomNav";

type Profile = { fullName: string; positionLine: string; initials: string };

function roleLabel(role: Role) {
  if (role === "superadmin") return "Superadmin";
  if (role === "admin") return "Admin";
  return "Requester";
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
  const sections = buildNav(role);

  const navItem = (item: NavItem) => {
    const isActive = item.activeMatch
      ? item.activeMatch(pathname)
      : pathname === item.href;

    return (
      <Link
        key={item.key}
        href={item.href}
        className={
          "flex items-center rounded-lg px-4 py-2 text-base " +
          (isActive
            ? "bg-[#D7F7D6] text-[#2F5E3D]"
            : "text-gray-700 hover:bg-black/5")
        }
      >
        {item.label}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Navigation - only visible on small screens */}
      <MobileNavbar profile={profile} role={role} />

      {/* Desktop Layout - static, simplified */}
      <div className="hidden md:block h-dvh overflow-hidden bg-linear-to-b from-[#C7C800] to-[#2F5E3D] p-6">
        <div className="mx-auto h-full w-full max-w-[1600px] flex gap-4">
          {/* Sidebar */}
          <aside className="w-[240px] shrink-0 flex flex-col rounded-2xl bg-white/95 shadow-sm ring-1 ring-black/5 overflow-hidden">
            {/* Header */}
            <div className="p-5 shrink-0 border-b border-black/5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#358334] flex items-center justify-center text-white font-semibold shadow-sm shrink-0">
                  {profile.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-gray-900 truncate leading-tight">
                    {profile.fullName}
                  </div>
                  <div className="text-xs text-gray-500 truncate mt-0.5">
                    {profile.positionLine
                      ? `${roleLabel(role)} • ${profile.positionLine}`
                      : roleLabel(role)}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <nav className="px-3 py-4 space-y-4">
                {sections.map((section, idx) => (
                  <div key={idx}>
                    {section.title && (
                      <div className="px-4 pb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase">
                        {section.title}
                      </div>
                    )}
                    <div className="space-y-1">
                      {section.items.map(navItem)}
                    </div>
                  </div>
                ))}
              </nav>
            </div>

            {/* Footer */}
            <div className="border-t border-black/5 shrink-0">
              <div className="p-3">
                <form action={signOut}>
                  <button
                    type="submit"
                    className="inline-flex w-full items-center gap-2 rounded-lg px-4 py-2 text-sm text-[#E34B33] hover:bg-[#E34B33]/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </form>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0 flex flex-col rounded-2xl bg-[#F7F7F3] shadow-sm ring-1 ring-black/5 overflow-hidden">
            <div className="h-full overflow-y-auto p-8 relative">
              <div className="absolute top-6 right-8 z-10">
                <NotificationsPopover />
              </div>
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Content Area */}
      <div className="md:hidden min-h-svh w-full overflow-x-hidden pt-15 pb-32 bg-[#F7F7F3]">
        <div className="px-3 py-3 w-full max-w-[100vw]">{children}</div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav role={role} />
    </>
  );
}
