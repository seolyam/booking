"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  Bell,
  LogOut,
  RotateCcw,
  ShieldCheck,
  LayoutDashboard,
  ListChecks,
} from "lucide-react";
import { signOut } from "@/actions/auth";
import { usePathname } from "next/navigation";

type Role = "requester" | "reviewer" | "approver" | "superadmin";

type Profile = { fullName: string; departmentLine: string; initials: string };

type NavItem = {
  key: string;
  label: string;
  href: string;
  isActive?: (pathname: string) => boolean;
  icon?: React.ComponentType<{ className?: string }>;
};

type ShellLayout = {
  mode: "split" | "floating";
  sidebarWidth: number;
  sidebarSide: "left" | "right";
  floating: {
    sidebar: Panel;
    main: Panel;
  };
};

type Panel = {
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
};

const DEFAULT_LAYOUT: ShellLayout = {
  mode: "floating",
  sidebarWidth: 260,
  sidebarSide: "left",
  floating: {
    sidebar: { x: 0, y: 0, width: 260, height: 720, z: 2 },
    main: { x: 280, y: 0, width: 760, height: 720, z: 1 },
  },
};

const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 420;
const PANEL_MIN_HEIGHT = 360;
const PANEL_MAX_HEIGHT = 1200;
const MAIN_MIN_WIDTH = 520;
const LAYOUT_STORAGE_KEY = "budget.dashboard.shell.layout.v1";

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function readLayoutFromStorage(): ShellLayout {
  if (typeof window === "undefined") return DEFAULT_LAYOUT;
  try {
    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw) as Partial<ShellLayout>;
    const sidebarWidth = Number(parsed.sidebarWidth);
    const sidebarSide = parsed.sidebarSide;
    const mode = parsed.mode;
    const floating = parsed.floating as ShellLayout["floating"] | undefined;

    const coercePanel = (p: Partial<Panel> | undefined, fallback: Panel): Panel => {
      const x = Number(p?.x);
      const y = Number(p?.y);
      const width = Number(p?.width);
      const height = Number(p?.height);
      const z = Number(p?.z);

      return {
        x: Number.isFinite(x) ? x : fallback.x,
        y: Number.isFinite(y) ? y : fallback.y,
        width: Number.isFinite(width) ? width : fallback.width,
        height: Number.isFinite(height) ? height : fallback.height,
        z: Number.isFinite(z) ? z : fallback.z,
      };
    };

    return {
      mode: mode === "split" ? "split" : "floating",
      sidebarWidth: Number.isFinite(sidebarWidth)
        ? clampNumber(sidebarWidth, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH)
        : DEFAULT_LAYOUT.sidebarWidth,
      sidebarSide: sidebarSide === "right" ? "right" : "left",
      floating: {
        sidebar: coercePanel(floating?.sidebar, DEFAULT_LAYOUT.floating.sidebar),
        main: coercePanel(floating?.main, DEFAULT_LAYOUT.floating.main),
      },
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function clampPanelToContainer(panel: Panel, containerWidth: number, containerHeight: number) {
  const width = clampNumber(panel.width, SIDEBAR_MIN_WIDTH, containerWidth);
  const height = clampNumber(panel.height, PANEL_MIN_HEIGHT, containerHeight);
  const x = clampNumber(panel.x, 0, Math.max(0, containerWidth - width));
  const y = clampNumber(panel.y, 0, Math.max(0, containerHeight - height));
  return { ...panel, x, y, width, height };
}

function roleLabel(role: Role) {
  if (role === "superadmin") return "Superadmin";
  if (role === "reviewer") return "Reviewer";
  if (role === "approver") return "Approver";
  return "Requester";
}

function buildNav(role: Role): { title?: string; items: NavItem[] }[] {
  const requesterSection: NavItem[] = [
    {
      key: "dashboard",
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      isActive: (p) => p === "/dashboard",
    },
    {
      key: "create",
      label: "Create Request",
      href: "/dashboard/budget/create",
      icon: ListChecks,
      isActive: (p) => p.startsWith("/dashboard/budget/create"),
    },
    {
      key: "mine",
      label: "Your Requests",
      href: "/dashboard/requests",
      isActive: (p) => p.startsWith("/dashboard/requests"),
    },
    {
      key: "list",
      label: "List of Requests",
      href: "/dashboard/budget",
      isActive: (p) => p.startsWith("/dashboard/budget"),
    },
  ];

  if (role === "superadmin") {
    return [
      { title: "Requester", items: requesterSection },
      {
        title: "Admin",
        items: [
          {
            key: "approvals",
            label: "User Approvals",
            href: "/dashboard/admin/approvals",
            icon: ShieldCheck,
            isActive: (p) => p.startsWith("/dashboard/admin/approvals"),
          },
        ],
      },
    ];
  }

  // For now other roles use the requester section (until their pages exist)
  return [{ items: requesterSection }];
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
  const showDashboardHeader = pathname === "/dashboard";
  const sections = buildNav(role);

  const [{ sidebarWidth, sidebarSide, mode, floating }, setLayout] =
    React.useState<ShellLayout>(
    () => readLayoutFromStorage()
  );

  React.useEffect(() => {
    try {
      window.localStorage.setItem(
        LAYOUT_STORAGE_KEY,
        JSON.stringify(
          { sidebarWidth, sidebarSide, mode, floating } satisfies ShellLayout
        )
      );
    } catch {
      // ignore write failures (private mode, etc.)
    }
  }, [sidebarWidth, sidebarSide, mode, floating]);

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const nextZRef = React.useRef(3);
  const floatingDragRef = React.useRef<
    | null
    | {
        panel: "sidebar" | "main";
        action: "move" | "resize";
        pointerId: number;
        startClientX: number;
        startClientY: number;
        startPanel: Panel;
        containerRect: DOMRect;
      }
  >(null);

  React.useEffect(() => {
    if (!containerRef.current) return;

    const normalize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const containerWidth = rect.width;
      const containerHeight = rect.height;

      setLayout((prev) => {
        const sidebarNext = clampPanelToContainer(
          prev.floating.sidebar,
          containerWidth,
          containerHeight
        );
        const mainNext = clampPanelToContainer(
          {
            ...prev.floating.main,
            width: clampNumber(
              prev.floating.main.width,
              MAIN_MIN_WIDTH,
              containerWidth
            ),
          },
          containerWidth,
          containerHeight
        );

        const sidebarUnchanged =
          sidebarNext.x === prev.floating.sidebar.x &&
          sidebarNext.y === prev.floating.sidebar.y &&
          sidebarNext.width === prev.floating.sidebar.width &&
          sidebarNext.height === prev.floating.sidebar.height;

        const mainUnchanged =
          mainNext.x === prev.floating.main.x &&
          mainNext.y === prev.floating.main.y &&
          mainNext.width === prev.floating.main.width &&
          mainNext.height === prev.floating.main.height;

        if (sidebarUnchanged && mainUnchanged) return prev;

        return { ...prev, floating: { sidebar: sidebarNext, main: mainNext } };
      });
    };

    normalize();
    window.addEventListener("resize", normalize);
    return () => window.removeEventListener("resize", normalize);
  }, []);

  const dragStateRef = React.useRef<{
    rect: DOMRect;
    pointerId: number;
  } | null>(null);

  const onDividerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const container = e.currentTarget.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    dragStateRef.current = { rect, pointerId: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onDividerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState) return;
    if (dragState.pointerId !== e.pointerId) return;

    const { rect } = dragState;
    const rawWidth =
      sidebarSide === "right" ? rect.right - e.clientX : e.clientX - rect.left;

    setLayout((prev) => ({
      ...prev,
      sidebarWidth: clampNumber(rawWidth, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH),
    }));
  };

  const onDividerPointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState) return;
    if (dragState.pointerId !== e.pointerId) return;
    dragStateRef.current = null;
  };

  const onDividerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 24 : 12;
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();

    const delta = e.key === "ArrowLeft" ? -step : step;
    setLayout((prev) => ({
      ...prev,
      sidebarWidth: clampNumber(
        prev.sidebarWidth + delta,
        SIDEBAR_MIN_WIDTH,
        SIDEBAR_MAX_WIDTH
      ),
    }));
  };

  const bringPanelToFront = (panel: "sidebar" | "main") => {
    const nextZ = nextZRef.current++;
    setLayout((prev) => ({
      ...prev,
      floating: {
        ...prev.floating,
        [panel]: { ...prev.floating[panel], z: nextZ },
      },
    }));
  };

  const startFloatingDrag = (
    e: React.PointerEvent<HTMLDivElement>,
    panel: "sidebar" | "main",
    action: "move" | "resize"
  ) => {
    if (e.button !== 0) return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    bringPanelToFront(panel);

    floatingDragRef.current = {
      panel,
      action,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPanel: floating[panel],
      containerRect: rect,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onFloatingPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const dragState = floatingDragRef.current;
    if (!dragState) return;
    if (dragState.pointerId !== e.pointerId) return;

    const dx = e.clientX - dragState.startClientX;
    const dy = e.clientY - dragState.startClientY;
    const containerWidth = dragState.containerRect.width;
    const containerHeight = dragState.containerRect.height;
    const start = dragState.startPanel;

    setLayout((prev) => {
      const current = prev.floating[dragState.panel];
      if (current.z !== start.z) {
        // If z changed due to other interactions, keep latest z but base movement on start.
      }

      if (dragState.action === "move") {
        const moved: Panel = clampPanelToContainer(
          {
            ...start,
            x: start.x + dx,
            y: start.y + dy,
            z: prev.floating[dragState.panel].z,
          },
          containerWidth,
          containerHeight
        );
        return {
          ...prev,
          floating: {
            ...prev.floating,
            [dragState.panel]: moved,
          },
        };
      }

      // resize
      const minWidth = dragState.panel === "sidebar" ? SIDEBAR_MIN_WIDTH : MAIN_MIN_WIDTH;
      const maxWidth = containerWidth;
      const width = clampNumber(start.width + dx, minWidth, maxWidth);
      const height = clampNumber(start.height + dy, PANEL_MIN_HEIGHT, Math.min(PANEL_MAX_HEIGHT, containerHeight));
      const resized: Panel = clampPanelToContainer(
        {
          ...start,
          width,
          height,
          z: prev.floating[dragState.panel].z,
        },
        containerWidth,
        containerHeight
      );

      return {
        ...prev,
        floating: {
          ...prev.floating,
          [dragState.panel]: resized,
        },
      };
    });
  };

  const endFloatingDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const dragState = floatingDragRef.current;
    if (!dragState) return;
    if (dragState.pointerId !== e.pointerId) return;
    floatingDragRef.current = null;
  };

  const navItem = (item: NavItem) => {
    const isActive = item.isActive
      ? item.isActive(pathname)
      : pathname === item.href;
    const Icon = item.icon;

    return (
      <Link
        key={item.key}
        href={item.href}
        className={
          "flex items-center gap-2 rounded-lg px-4 py-2 text-base " +
          (isActive
            ? "bg-[#D7F7D6] text-[#2F5E3D]"
            : "text-gray-700 hover:bg-black/5")
        }
      >
        {Icon && <Icon className="h-4 w-4" />}
        {item.label}
      </Link>
    );
  };

  const resetLayout = () => {
    setLayout(DEFAULT_LAYOUT);
    nextZRef.current = 3;
  };

  const toggleMode = () => {
    setLayout((prev) => ({
      ...prev,
      mode: prev.mode === "floating" ? "split" : "floating",
    }));
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-[#C7C800] to-[#2F5E3D] p-6">
      <div className="mx-auto w-full max-w-6xl">
        <div
          ref={containerRef}
          className="relative"
          style={{ height: "calc(100vh - 96px)" }}
        >
          {/* Shared controls (always accessible) */}
          <div className="absolute right-0 top-0 z-50 flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg bg-white/90 px-3 py-2 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-black/10 hover:bg-white"
              onClick={toggleMode}
              title={mode === "floating" ? "Switch to split layout" : "Switch to floating layout"}
            >
              {mode === "floating" ? "Split" : "Float"}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-white/90 px-3 py-2 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-black/10 hover:bg-white"
              onClick={resetLayout}
              title="Reset layout"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>

          {mode === "floating" ? (
            <>
              {/* Sidebar window */}
              <aside
                className="rounded-2xl bg-white/95 shadow-sm ring-1 ring-black/5 overflow-hidden md:absolute"
                style={
                  {
                    left: floating.sidebar.x,
                    top: floating.sidebar.y,
                    width: floating.sidebar.width,
                    height: floating.sidebar.height,
                    zIndex: floating.sidebar.z,
                  } as React.CSSProperties
                }
                onPointerDown={() => bringPanelToFront("sidebar")}
              >
                <div
                  className="flex items-center justify-between gap-3 border-b border-black/10 bg-white/70 px-4 py-3 cursor-move"
                  onPointerDown={(e) => startFloatingDrag(e, "sidebar", "move")}
                  onPointerMove={onFloatingPointerMove}
                  onPointerUp={endFloatingDrag}
                  onPointerCancel={endFloatingDrag}
                  title="Drag to move"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-[#358334] flex items-center justify-center text-white font-semibold">
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
                  {mode === "split" && (
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-lg p-2 text-gray-600 hover:bg-black/5"
                      aria-label={
                        sidebarSide === "left"
                          ? "Dock sidebar to the right"
                          : "Dock sidebar to the left"
                      }
                      title={
                        sidebarSide === "left"
                          ? "Dock sidebar to the right"
                          : "Dock sidebar to the left"
                      }
                      onClick={() =>
                        setLayout((prev) => ({
                          ...prev,
                          sidebarSide: prev.sidebarSide === "left" ? "right" : "left",
                        }))
                      }
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="h-full overflow-auto">
                  <nav className="px-4 py-4 space-y-4">
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

                  <div className="mt-2 border-t border-black/10" />

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
                </div>

                {/* Resize handle */}
                <div
                  className="absolute bottom-1 right-1 h-5 w-5 cursor-nwse-resize rounded-sm bg-black/0"
                  onPointerDown={(e) => startFloatingDrag(e, "sidebar", "resize")}
                  onPointerMove={onFloatingPointerMove}
                  onPointerUp={endFloatingDrag}
                  onPointerCancel={endFloatingDrag}
                  title="Drag to resize"
                />
              </aside>

              {/* Main window */}
              <section
                className="rounded-2xl bg-[#F7F7F3] shadow-sm ring-1 ring-black/5 md:absolute"
                style={
                  {
                    left: floating.main.x,
                    top: floating.main.y,
                    width: floating.main.width,
                    height: floating.main.height,
                    zIndex: floating.main.z,
                  } as React.CSSProperties
                }
                onPointerDown={() => bringPanelToFront("main")}
              >
                <div
                  className="flex items-center justify-between gap-3 border-b border-black/10 bg-white/40 px-4 py-3 cursor-move"
                  onPointerDown={(e) => startFloatingDrag(e, "main", "move")}
                  onPointerMove={onFloatingPointerMove}
                  onPointerUp={endFloatingDrag}
                  onPointerCancel={endFloatingDrag}
                  title="Drag to move"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {showDashboardHeader
                        ? `Welcome back, ${profile.fullName.split(" ")[0]}`
                        : roleLabel(role)}
                    </div>
                    {showDashboardHeader && (
                      <div className="text-xs text-gray-500">{roleLabel(role)} Dashboard</div>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label="Notifications"
                    className="rounded-full p-2 text-gray-700 hover:bg-black/5"
                  >
                    <Bell className="h-5 w-5" />
                  </button>
                </div>

                <div className="h-[calc(100%-49px)] overflow-auto p-8">
                  {children}
                </div>

                {/* Resize handle */}
                <div
                  className="absolute bottom-1 right-1 h-5 w-5 cursor-nwse-resize rounded-sm bg-black/0"
                  onPointerDown={(e) => startFloatingDrag(e, "main", "resize")}
                  onPointerMove={onFloatingPointerMove}
                  onPointerUp={endFloatingDrag}
                  onPointerCancel={endFloatingDrag}
                  title="Drag to resize"
                />
              </section>
            </>
          ) : (
            <div
              className={
                "flex flex-col gap-6 md:flex-row md:gap-0" +
                (sidebarSide === "right" ? " md:flex-row-reverse" : "")
              }
              style={
                {
                  ["--sidebar-width" as never]: `${sidebarWidth}px`,
                } as React.CSSProperties
              }
            >
              {/* Sidebar */}
              <aside className="w-full md:w-(--sidebar-width) md:shrink-0 rounded-2xl bg-white/95 shadow-sm ring-1 ring-black/5 overflow-hidden">
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

                    <button
                      type="button"
                      className="ml-auto inline-flex items-center justify-center rounded-lg p-2 text-gray-600 hover:bg-black/5"
                      aria-label={
                        sidebarSide === "left"
                          ? "Dock sidebar to the right"
                          : "Dock sidebar to the left"
                      }
                      title={
                        sidebarSide === "left"
                          ? "Dock sidebar to the right"
                          : "Dock sidebar to the left"
                      }
                      onClick={() =>
                        setLayout((prev) => ({
                          ...prev,
                          sidebarSide: prev.sidebarSide === "left" ? "right" : "left",
                        }))
                      }
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <nav className="px-4 pb-4 space-y-4">
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

                <div className="mt-2 border-t border-black/10" />

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

              {/* Divider (drag to resize) */}
              <div
                role="separator"
                aria-orientation="vertical"
                tabIndex={0}
                className="hidden md:flex w-6 shrink-0 cursor-col-resize items-stretch select-none touch-none group"
                onPointerDown={onDividerPointerDown}
                onPointerMove={onDividerPointerMove}
                onPointerUp={onDividerPointerUpOrCancel}
                onPointerCancel={onDividerPointerUpOrCancel}
                onDoubleClick={() =>
                  setLayout((prev) => ({ ...prev, sidebarWidth: DEFAULT_LAYOUT.sidebarWidth }))
                }
                onKeyDown={onDividerKeyDown}
              >
                <div className="mx-auto w-px bg-black/10 group-hover:bg-black/25 group-focus-visible:bg-black/25" />
              </div>

              {/* Main */}
              <section className="flex-1 rounded-2xl bg-[#F7F7F3] shadow-sm ring-1 ring-black/5 p-8">
                {showDashboardHeader && (
                  <div className="flex items-start justify-between gap-6 mb-8">
                    <div className="min-w-0">
                      <div className="text-3xl font-semibold text-gray-900 truncate">
                        Welcome back, {profile.fullName.split(" ")[0]}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {roleLabel(role)} Dashboard
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
          )}
        </div>
      </div>
    </div>
  );
}
