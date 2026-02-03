"use client";

import { useState, useEffect } from "react";
import { Bell, Info, AlertTriangle, XCircle, CheckCircle2, Loader2 } from "lucide-react";
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from "@/actions/notifications";
import Link from "next/link";
import type { Notification as DbNotification } from "@/db/schema";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogTrigger,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

export default function NotificationsPopover() {
    const [notifications, setNotifications] = useState<DbNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [filter, setFilter] = useState<"all" | "unread">("all");

    useEffect(() => {
        // Initial fetch of count
        fetchCount();

        // Poll for unread count every 30s
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchCount = async () => {
        try {
            const count = await getUnreadCount();
            setUnreadCount(count);
        } catch (e) {
            console.error(e);
        }
    };

    const handleOpenChange = async (open: boolean) => {
        setIsOpen(open);
        if (open) {
            setLoading(true);
            try {
                const data = await getNotifications();
                setNotifications(data);
                // Switch to 'unread' default if there are pending items? No, standard is 'all' usually or 'unread' if explicitly designed. Let's stick to 'all' as default but maybe 'unread' if high volume. User asked for filters, so 'all' default is safer.
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleMarkRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        // If it was unread, decrement count
        const wasUnread = notifications.find(n => n.id === id && !n.is_read);
        if (wasUnread) {
            setUnreadCount(prev => Math.max(0, prev - 1));
        }

        await markAsRead(id);
    };

    const handleMarkAllRead = async () => {
        // Optimistic
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
        await markAllAsRead();
    };

    const displayedNotifications = notifications.filter(n => {
        if (filter === "unread") return !n.is_read;
        return true;
    });

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <button
                    className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-gray-500 hover:bg-white hover:text-gray-900 transition-all shadow-sm ring-1 ring-gray-200 focus:outline-none"
                >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2.5 right-3 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                    )}
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden rounded-2xl bg-white text-gray-900 border-gray-100 shadow-xl">
                <div className="flex flex-col border-b border-gray-100 bg-white">
                    <div className="flex items-center justify-between px-6 py-5 pb-2">
                        <div>
                            <DialogTitle className="text-xl font-bold text-gray-900 tracking-tight">Notifications</DialogTitle>
                        </div>
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleMarkAllRead}
                                className="h-8 px-3 text-xs font-semibold text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Mark all as read
                            </Button>
                        )}
                    </div>

                    <div className="px-6 pb-0 flex items-center gap-6">
                        <button
                            onClick={() => setFilter("all")}
                            className={cn(
                                "pb-3 text-sm font-medium border-b-2 transition-all",
                                filter === "all"
                                    ? "border-gray-900 text-gray-900"
                                    : "border-transparent text-gray-500 hover:text-gray-700"
                            )}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter("unread")}
                            className={cn(
                                "pb-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2",
                                filter === "unread"
                                    ? "border-blue-600 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700"
                            )}
                        >
                            Unread
                            {unreadCount > 0 && (
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded-full text-[10px] leading-none",
                                    filter === "unread" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                                )}>
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                <ScrollArea className="h-[60vh] max-h-[500px] bg-white">
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-gray-400">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-200" />
                        </div>
                    ) : displayedNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500 gap-4">
                            <div className="h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center">
                                {filter === "unread" ? (
                                    <CheckCircle2 className="h-8 w-8 text-gray-300" />
                                ) : (
                                    <Bell className="h-8 w-8 text-gray-300" />
                                )}
                            </div>
                            <div>
                                <p className="text-base font-semibold text-gray-900">
                                    {filter === "unread" ? "No unread messages" : "All caught up"}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {filter === "unread"
                                        ? "You've read all your notifications."
                                        : "No new notifications to show."}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {displayedNotifications.map((n) => (
                                <div
                                    key={n.id}
                                    onClick={() => !n.is_read ? handleMarkRead(n.id, { stopPropagation: () => { }, preventDefault: () => { } } as React.MouseEvent) : undefined}
                                    className={cn(
                                        "flex gap-4 p-5 transition-all hover:bg-gray-50/80 cursor-pointer group relative",
                                        !n.is_read ? "bg-white" : "bg-white/50"
                                    )}
                                >
                                    {/* Unread Indicator Bar */}
                                    {!n.is_read && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                                    )}

                                    <div className="mt-1 shrink-0">
                                        {n.type === "success" ? (
                                            <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center ring-1 ring-green-100">
                                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                            </div>
                                        ) : n.type === "error" ? (
                                            <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center ring-1 ring-red-100">
                                                <XCircle className="h-5 w-5 text-red-600" />
                                            </div>
                                        ) : n.type === "warning" ? (
                                            <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center ring-1 ring-amber-100">
                                                <AlertTriangle className="h-5 w-5 text-amber-600" />
                                            </div>
                                        ) : (
                                            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center ring-1 ring-blue-100">
                                                <Info className="h-5 w-5 text-blue-600" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4">
                                            <p className={cn("text-sm text-gray-900 leading-snug", !n.is_read ? "font-bold" : "font-semibold")}>
                                                {n.title}
                                            </p>
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap">
                                                    {new Date(n.created_at).toLocaleDateString(undefined, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                                </span>
                                                {!n.is_read ? (
                                                    <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1.5">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                                                        Unread
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-medium text-gray-400">Read</span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="mt-1 text-sm text-gray-600 leading-relaxed line-clamp-2">
                                            {n.message}
                                        </p>

                                        {n.link && (
                                            <div className="mt-3 flex items-center">
                                                <Link
                                                    href={n.link.replace("/reviewer/review/", "/reviewer/")}
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Prevent parent div click
                                                        setIsOpen(false);
                                                        if (!n.is_read) handleMarkRead(n.id, { stopPropagation: () => { }, preventDefault: () => { } } as React.MouseEvent);
                                                    }}
                                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 px-3 py-1.5 rounded-lg transition-all shadow-sm"
                                                >
                                                    View Details
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

            </DialogContent>
        </Dialog>
    );
}
