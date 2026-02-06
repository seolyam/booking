"use client";

import * as React from "react";
import { LogOut } from "lucide-react";
import { signOut } from "@/actions/auth";
import type { Role } from "./nav";

type Profile = { fullName: string; positionLine: string; initials: string };

function roleLabel(role: Role) {
  if (role === "superadmin") return "Superadmin";
  if (role === "admin") return "Admin";
  return "Requester";
}

export default function MobileNavbar({
  profile,
  role,
}: {
  profile: Profile;
  role: Role;
}) {
  return (
    <>
      {/* Mobile Top Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-15 bg-white/95 backdrop-blur-sm shadow-sm flex items-center justify-between px-4 md:hidden">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-[#358334] flex items-center justify-center text-white font-semibold text-sm">
            {profile.initials}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 text-sm truncate max-w-40">
              {profile.fullName}
            </div>
            <div className="text-[10px] text-gray-500 truncate">
              {roleLabel(role)}
            </div>
          </div>
        </div>

        <form action={signOut}>
          <button
            type="submit"
            className="p-2 rounded-lg hover:bg-black/5 min-h-11 min-w-11 flex items-center justify-center"
            aria-label="Logout"
          >
            <LogOut className="h-5 w-5 text-[#E34B33]" />
          </button>
        </form>
      </header>
    </>
  );
}
