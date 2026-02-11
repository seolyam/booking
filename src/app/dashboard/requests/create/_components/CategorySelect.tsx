"use client";

import {
  Plane,
  Hotel,
  UtensilsCrossed,
  DoorOpen,
  FileCheck,
  Radio,
  HardHat,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CategoryMeta } from "@/db/schema";

const iconMap: Record<string, React.ElementType> = {
  Plane,
  Hotel,
  UtensilsCrossed,
  DoorOpen,
  FileCheck,
  Radio,
  HardHat,
  Package,
};

export function CategorySelect({
  categories,
  selected,
  onSelect,
  onNext,
  onCancel,
}: {
  categories: CategoryMeta[];
  selected: CategoryMeta | null;
  onSelect: (c: CategoryMeta) => void;
  onNext: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {categories.map((cat) => {
          const Icon = iconMap[cat.icon] ?? Package;
          const isSelected = selected?.key === cat.key;

          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => onSelect(cat)}
              className={cn(
                "flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all hover:shadow-md",
                isSelected
                  ? "border-[#358334] bg-[#358334]/5 shadow-md"
                  : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
                  isSelected
                    ? "bg-[#358334] text-white"
                    : "bg-gray-100 text-gray-500"
                )}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      isSelected ? "text-[#358334]" : "text-gray-900"
                    )}
                  >
                    {cat.label}
                  </p>
                  <span
                    className={cn(
                      "text-xs font-mono px-1.5 py-0.5 rounded",
                      isSelected
                        ? "bg-[#358334]/10 text-[#358334]"
                        : "bg-gray-100 text-gray-500"
                    )}
                  >
                    {cat.code}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {cat.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onNext} disabled={!selected}>
          Next
        </Button>
      </div>
    </div>
  );
}
