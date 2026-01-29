"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Search, X, Filter } from "lucide-react";

interface MobileSearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  showFilter?: boolean;
  onFilterClick?: () => void;
  filterActive?: boolean;
  className?: string;
}

export function MobileSearchBar({
  placeholder = "Search...",
  value = "",
  onChange,
  onSearch,
  showFilter = false,
  onFilterClick,
  filterActive = false,
  className,
}: MobileSearchBarProps) {
  const [localValue, setLocalValue] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange?.(newValue);
  };

  const handleClear = () => {
    setLocalValue("");
    onChange?.("");
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(localValue);
  };

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={localValue}
            onChange={handleChange}
            placeholder={placeholder}
            className="w-full h-12 pl-10 pr-10 text-base bg-gray-100 border-0 rounded-xl outline-none focus:ring-2 focus:ring-[#358334]/20 focus:bg-white transition-all"
          />
          {localValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          )}
        </div>

        {showFilter && (
          <button
            type="button"
            onClick={onFilterClick}
            className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center transition-colors shrink-0",
              filterActive
                ? "bg-[#358334] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            )}
          >
            <Filter className="h-5 w-5" />
          </button>
        )}
      </div>
    </form>
  );
}

interface FilterChipProps {
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
  variant?: "default" | "success" | "warning" | "error" | "info";
}

const chipVariants = {
  default: {
    active: "bg-gray-800 text-white border-gray-800",
    inactive: "bg-white text-gray-600 border-gray-200 hover:border-gray-300",
  },
  success: {
    active: "bg-green-500 text-white border-green-500",
    inactive: "bg-white text-green-600 border-green-200 hover:border-green-300",
  },
  warning: {
    active: "bg-orange-500 text-white border-orange-500",
    inactive:
      "bg-white text-orange-600 border-orange-200 hover:border-orange-300",
  },
  error: {
    active: "bg-red-500 text-white border-red-500",
    inactive: "bg-white text-red-600 border-red-200 hover:border-red-300",
  },
  info: {
    active: "bg-blue-500 text-white border-blue-500",
    inactive: "bg-white text-blue-600 border-blue-200 hover:border-blue-300",
  },
};

export function FilterChip({
  label,
  active = false,
  count,
  onClick,
  variant = "default",
}: FilterChipProps) {
  const colors = chipVariants[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all min-h-[40px]",
        active ? colors.active : colors.inactive,
      )}
    >
      {label}
      {count !== undefined && (
        <span
          className={cn(
            "text-xs px-1.5 py-0.5 rounded-full",
            active ? "bg-white/20" : "bg-gray-100",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function FilterChipGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide",
        className,
      )}
    >
      {children}
    </div>
  );
}

// Pull to refresh component
interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = React.useState(0);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const startYRef = React.useRef(0);

  const threshold = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop !== 0 || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;

    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.5, threshold * 1.5));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      await onRefresh();
      setIsRefreshing(false);
    }
    setPullDistance(0);
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative overflow-auto"
    >
      {/* Refresh indicator */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center transition-transform"
        style={{
          transform: `translateY(${pullDistance - 40}px)`,
          opacity: pullDistance / threshold,
        }}
      >
        <div
          className={cn(
            "h-8 w-8 rounded-full border-2 border-[#358334] border-t-transparent",
            isRefreshing && "animate-spin",
          )}
        />
      </div>

      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 ? "transform 0.2s" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
