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
          "flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-all " +
          (isActive
            ? "bg-[#D7F7D6] text-[#2F5E3D]"
            : "text-gray-900 hover:bg-gray-50 hover:text-gray-900")
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

      {/* Desktop Layout - Split Panel Architecture */}
      <div className="hidden md:flex h-screen w-full overflow-hidden bg-gradient-to-br from-[#C7C800] to-[#2F5E3D] p-6 gap-6">
        {/* Panel A: Sidebar */}
        <aside className="w-72 shrink-0 flex flex-col rounded-3xl bg-white shadow-xl overflow-hidden">
          {/* Header */}
          <div className="relative p-6 shrink-0 border-b border-gray-100">
            <div className="absolute top-4 right-4 z-10">
              <NotificationsPopover />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-[#358334] flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
                {profile.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-gray-900 truncate leading-tight">
                  {profile.fullName}
                </div>
                <div className="text-xs text-gray-500 truncate mt-1 font-medium">
                  {profile.positionLine
                    ? `${roleLabel(role)} • ${profile.positionLine}`
                    : roleLabel(role)}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 py-6">
            <nav className="space-y-6">
              {sections.map((section, idx) => (
                <div key={idx}>
                  {section.title && (
                    <div className="px-4 pb-3 text-xs font-bold tracking-wider text-gray-400 uppercase">
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
          <div className="p-4 border-t border-gray-100 shrink-0">
            <form action={signOut}>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </form>
          </div>
        </aside>

        {/* Panel B: Main Workspace */}
        <main className="flex-1 min-w-0 flex flex-col rounded-3xl bg-gray-50 shadow-xl overflow-hidden relative">
          <div className="h-full overflow-y-auto p-8 custom-scrollbar">
            {children}
          </div>
        </main>
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
