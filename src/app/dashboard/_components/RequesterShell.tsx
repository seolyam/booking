"use client";

import Link from "next/link";
import { Bell, LogOut } from "lucide-react";
import { signOut } from "@/actions/auth";
import { usePathname } from "next/navigation";

export default function RequesterShell({
  children,
  profile,
  active,
}: {
  children: React.ReactNode;
  profile: { fullName: string; departmentLine: string; initials: string };
  active?: "dashboard" | "create" | "mine" | "list";
}) {
  const pathname = usePathname();
  const showDashboardHeader = pathname === "/dashboard";

  const inferredActive: "dashboard" | "create" | "mine" | "list" = (() => {
    if (!pathname) return "dashboard";
    if (pathname.startsWith("/dashboard/budget/create")) return "create";
    if (pathname.startsWith("/dashboard/requests")) return "mine";
    if (pathname.startsWith("/dashboard/budget")) return "list";
    return "dashboard";
  })();

  const resolvedActive = active ?? inferredActive;

  const navItem = (
    key: NonNullable<typeof active>,
    label: string,
    href: string
  ) => {
    const isActive = resolvedActive === key;
    return (
      <Link
        href={href}
        className={
          "block rounded-lg px-4 py-2 text-base " +
          (isActive
            ? "bg-[#D7F7D6] text-[#2F5E3D]"
            : "text-gray-700 hover:bg-black/5")
        }
      >
        {label}
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

            <nav className="px-4 pb-4 space-y-1">
              {navItem("dashboard", "Dashboard", "/dashboard")}
              {navItem("create", "Create Request", "/dashboard/budget/create")}
              {navItem("mine", "Your Requests", "/dashboard/requests")}
              {navItem("list", "List of Requests", "/dashboard/budget")}
            </nav>

            <div className="mt-6 border-t border-black/10" />

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
                    Requester Dashboard
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
