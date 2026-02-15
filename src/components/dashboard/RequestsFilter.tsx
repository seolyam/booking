"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Filter } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/db/schema";
import { cn } from "@/lib/utils";

const DATE_PRESETS = [
    { label: "All", value: "all" },
    { label: "Yesterday", value: "yesterday" },
    { label: "Daily", value: "daily" },
    { label: "Weekly", value: "weekly" },
    { label: "Monthly", value: "monthly" },
];

const STATUS_OPTIONS = [
    { label: "All", value: "all" },
    { label: "Open", value: "open" },
    { label: "Pending", value: "pending" },
    { label: "Resolved", value: "resolved" },
    { label: "Cancelled", value: "cancelled" },
];

export function RequestsFilter() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Initialize state from URL
    const [dateFilter, setDateFilter] = useState(searchParams.get("datePreset") || "all");
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>(() => {
        const s = searchParams.getAll("status");
        if (s.length === 0) return ["all"];
        return s.includes("all") ? ["all"] : s;
    });
    const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
        const c = searchParams.getAll("category");
        if (c.length === 0) return ["all"];
        return c.includes("all") ? ["all"] : c;
    });

    const [open, setOpen] = useState(false);

    const handleOpenChange = (newOpen: boolean) => {
        if (newOpen) {
            setDateFilter(searchParams.get("datePreset") || "all");
            const s = searchParams.getAll("status");
            setSelectedStatuses(s.length === 0 || s.includes("all") ? ["all"] : s);
            const c = searchParams.getAll("category");
            setSelectedCategories(c.length === 0 || c.includes("all") ? ["all"] : c);
        }
        setOpen(newOpen);
    };

    const handleStatusToggle = (val: string) => {
        if (val === "all") {
            setSelectedStatuses(["all"]);
            return;
        }
        setSelectedStatuses(prev => {
            const newSet = prev.filter(p => p !== "all");
            if (newSet.includes(val)) {
                const filtered = newSet.filter(v => v !== val);
                return filtered.length === 0 ? ["all"] : filtered;
            } else {
                return [...newSet, val];
            }
        });
    };

    const handleCategoryToggle = (val: string) => {
        if (val === "all") {
            setSelectedCategories(["all"]);
            return;
        }
        setSelectedCategories(prev => {
            const newSet = prev.filter(p => p !== "all");
            if (newSet.includes(val)) {
                const filtered = newSet.filter(v => v !== val);
                return filtered.length === 0 ? ["all"] : filtered;
            } else {
                return [...newSet, val];
            }
        });
    };

    const applyFilters = () => {
        const params = new URLSearchParams(searchParams);

        // Date
        if (dateFilter && dateFilter !== "all") {
            params.set("datePreset", dateFilter);

            const now = new Date();
            // Start of today in local time
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            let from: Date | undefined;
            let to: Date | undefined;

            if (dateFilter === "yesterday") {
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                from = yesterday; // 00:00:00

                const yEnd = new Date(yesterday);
                yEnd.setHours(23, 59, 59, 999);
                to = yEnd;
            } else if (dateFilter === "daily") { // Daily = Today
                from = today; // 00:00:00

                const tEnd = new Date(today);
                tEnd.setHours(23, 59, 59, 999);
                to = tEnd;
            } else if (dateFilter === "weekly") {
                const lastWeek = new Date(today);
                lastWeek.setDate(lastWeek.getDate() - 7);
                from = lastWeek;
                to = now; // up to now
            } else if (dateFilter === "monthly") {
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                from = startOfMonth;
                to = now; // up to now
            }

            if (from) params.set("from", from.toISOString());
            if (to) params.set("to", to.toISOString());

        } else {
            params.delete("datePreset");
            params.delete("from");
            params.delete("to");
        }

        // Status
        params.delete("status"); // Clear existing
        if (!selectedStatuses.includes("all")) {
            selectedStatuses.forEach(s => params.append("status", s));
        }

        // Category
        params.delete("category");
        if (!selectedCategories.includes("all")) {
            selectedCategories.forEach(c => params.append("category", c));
        }

        router.push(`${pathname}?${params.toString()}`);
        setOpen(false);
    };

    const activeCount = useMemo(() => {
        let count = 0;
        if (dateFilter !== "all") count++;
        if (!selectedStatuses.includes("all")) count += selectedStatuses.length;
        if (!selectedCategories.includes("all")) count += selectedCategories.length;
        return count;
    }, [dateFilter, selectedStatuses, selectedCategories]);

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" className={cn("h-10 w-10 relative bg-white hover:bg-gray-50 border-gray-200 text-gray-500", activeCount > 0 && "border-green-500 text-green-600 bg-green-50 hover:bg-green-100")}>
                    <Filter className="h-4 w-4" />
                    {activeCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white" />
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white gap-6">
                <DialogHeader>
                    <DialogTitle>Filter Tickets</DialogTitle>
                </DialogHeader>

                {/* Date Section */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">Date</label>
                    <div className="flex flex-wrap gap-2">
                        {DATE_PRESETS.map((preset) => (
                            <button
                                key={preset.value}
                                onClick={() => setDateFilter(preset.value)}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-sm border transition-colors",
                                    dateFilter === preset.value
                                        ? "bg-green-100 text-green-700 border-green-200 font-medium"
                                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                                )}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Status Section */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map((opt) => {
                            const isActive = selectedStatuses.includes(opt.value);
                            return (
                                <button
                                    key={opt.value}
                                    onClick={() => handleStatusToggle(opt.value)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-lg text-sm border transition-colors",
                                        isActive
                                            ? "bg-green-100 text-green-700 border-green-200 font-medium"
                                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                                    )}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Title/Category Section */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">Type</label>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => handleCategoryToggle("all")}
                            className={cn(
                                "px-4 py-1.5 rounded-lg text-sm border transition-colors min-w-[3rem]",
                                selectedCategories.includes("all")
                                    ? "bg-green-100 text-green-700 border-green-200 font-medium"
                                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                            )}
                        >
                            All
                        </button>
                        {CATEGORIES.map((cat) => {
                            const isActive = selectedCategories.includes(cat.key);
                            return (
                                <button
                                    key={cat.key}
                                    onClick={() => handleCategoryToggle(cat.key)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-sm border transition-colors",
                                        isActive
                                            ? "bg-blue-50 text-blue-700 border-blue-200 font-medium"
                                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                                    )}
                                    title={cat.label}
                                >
                                    {cat.code}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="pt-2">
                    <Button onClick={applyFilters} className="w-full bg-[#22C55E] hover:bg-[#16A34A] text-white font-medium h-11 rounded-xl shadow-sm text-base">
                        Apply Filters
                    </Button>
                </div>

            </DialogContent>
        </Dialog>
    );
}
