"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { signOut } from "@/actions/auth";
import { buildNav, type NavItem, type Role } from "./nav";

type Profile = { fullName: string; departmentLine: string; initials: string };

function roleLabel(role: Role) {
  if (role === "superadmin") return "Superadmin";
  if (role === "reviewer") return "Reviewer";
  if (role === "approver") return "Approver";
  return "Requester";
}

export default function MobileNavbar({
  profile,
  role,
}: {
  profile: Profile;
  role: Role;
}) {
  const pathname = usePathname() ?? "/dashboard";
  const sections = buildNav(role);
  const [isOpen, setIsOpen] = React.useState(false);

  // Close drawer when route changes
  React.useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const navItem = (item: NavItem) => {
    const isActive = item.isActive
      ? item.isActive(pathname)
      : pathname === item.href;

    return (
      <Link
        key={item.key}
        href={item.href}
        onClick={() => setIsOpen(false)}
        className={
          "flex items-center rounded-lg px-4 py-3 text-base min-h-[44px] " +
          (isActive
            ? "bg-[#D7F7D6] text-[#2F5E3D] font-semibold"
            : "text-gray-700 hover:bg-black/5")
        }
      >
        {item.icon && <item.icon className="h-5 w-5 mr-3" />}
        {item.label}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Top Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-[60px] bg-white/95 backdrop-blur-sm shadow-sm flex items-center justify-between px-4 md:hidden">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-[#358334] flex items-center justify-center text-white font-semibold text-sm">
            {profile.initials}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 text-sm truncate max-w-[160px]">
              {profile.fullName}
            </div>
            <div className="text-[10px] text-gray-500 truncate">
              {roleLabel(role)}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-black/5 min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <X className="h-6 w-6 text-gray-700" />
          ) : (
            <Menu className="h-6 w-6 text-gray-700" />
          )}
        </button>
      </header>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-in Drawer */}
      <aside
        className={`fixed top-[60px] right-0 bottom-0 z-50 w-[280px] max-w-[85vw] bg-white shadow-xl transform transition-transform duration-300 ease-out md:hidden flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex-1 overflow-y-auto">
          <nav className="p-4 space-y-4">
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
        </div>

        <div className="border-t border-black/10 p-4 shrink-0">
          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex w-full items-center gap-2 rounded-lg px-4 py-3 text-sm text-[#E34B33] hover:bg-[#E34B33]/10 min-h-[44px]"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
