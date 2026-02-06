"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MobileCardData {
  id: string;
  displayId: string;
  title: string;
  subtitle?: string;
  type?: "CapEx" | "OpEx"; // Can be adapted or ignored if not used
  amount?: string;
  status: {
    label: string;
    variant: "success" | "warning" | "error" | "info" | "default";
  };
  date?: string;
  actionHref: string;
  actionLabel?: "View" | "Edit" | "Review";
}

const statusColors = {
  success: "bg-green-50 text-green-700 ring-1 ring-green-200",
  warning: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  error: "bg-red-50 text-red-700 ring-1 ring-red-200",
  info: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  default: "bg-gray-100 text-gray-700 ring-1 ring-gray-200",
};

const typeColors = {
  CapEx: "bg-blue-100 text-blue-700",
  OpEx: "bg-purple-100 text-purple-700",
};

export function MobileDataCard({
  data,
  showAmount = true,
  className,
}: {
  data: MobileCardData;
  showAmount?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={data.actionHref}
      className={cn(
        "block bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow active:bg-gray-50",
        className,
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-400 truncate">
              {data.displayId}
            </span>
            {data.type && (
              <span
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                  typeColors[data.type],
                )}
              >
                {data.type}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
            {data.title}
          </h3>
          {data.subtitle && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {data.subtitle}
            </p>
          )}
        </div>
        <ChevronRight className="h-5 w-5 text-gray-300 shrink-0" />
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-50">
        <span
          className={cn(
            "px-2.5 py-1 rounded-full text-xs font-semibold",
            statusColors[data.status.variant],
          )}
        >
          {data.status.label}
        </span>

        <div className="flex items-center gap-3 text-xs">
          {showAmount && data.amount && (
            <span className="font-bold text-gray-900">{data.amount}</span>
          )}
          {data.date && (
            <span className="text-gray-400 font-medium">{data.date}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function MobileCardList({
  items,
  emptyMessage = "No items found",
  showAmount = true,
}: {
  items: MobileCardData[];
  emptyMessage?: string;
  showAmount?: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-400 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <MobileDataCard key={item.id} data={item} showAmount={showAmount} />
      ))}
    </div>
  );
}
