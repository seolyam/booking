"use client";

import Link from "next/link";

export function StatCard({
  icon,
  value,
  label,
  href,
  colorClass,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  href: string;
  colorClass: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col justify-between rounded-2xl md:rounded-[2rem] bg-white shadow-sm p-4 md:p-6 hover:shadow-md transition-shadow group h-full border border-gray-100/50"
    >
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${colorClass} mb-4 transition-transform group-hover:scale-105`}>
        {icon}
      </div>
      <div>
        <div className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight mb-2">
          {value}
        </div>
        <div className="text-sm font-semibold text-gray-500">
          {label}
        </div>
      </div>
    </Link>
  );
}
