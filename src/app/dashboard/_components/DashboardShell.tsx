"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  Bell,
  LayoutGrid,
  LogOut,
  Maximize2,
  Minimize2,
  MoreVertical,
  RotateCcw,
} from "lucide-react";
import { signOut } from "@/actions/auth";
import { usePathname } from "next/navigation";

import { buildNav, type NavItem, type Role } from "./nav";

type Profile = { fullName: string; departmentLine: string; initials: string };

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

type PanelKey = "sidebar" | "main";

const DEFAULT_LAYOUT: ShellLayout = {
  mode: "floating",
  sidebarWidth: 220,
  sidebarSide: "left",
  floating: {
    sidebar: { x: 0, y: 0, width: 220, height: 720, z: 2 },
    main: { x: 236, y: 0, width: 804, height: 720, z: 1 },
  },
};

const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 420;
const PANEL_MIN_HEIGHT = 360;
const PANEL_MAX_HEIGHT = 1200;
const MAIN_MIN_WIDTH = 520;
const LAYOUT_STORAGE_KEY = "budget.dashboard.shell.layout.v1";

function isDesktopViewport() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(min-width: 768px)").matches;
}

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

    const coercePanel = (
      p: Partial<Panel> | undefined,
      fallback: Panel,
    ): Panel => {
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
        sidebar: coercePanel(
          floating?.sidebar,
          DEFAULT_LAYOUT.floating.sidebar,
        ),
        main: coercePanel(floating?.main, DEFAULT_LAYOUT.floating.main),
      },
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function clampPanelToContainer(
  panel: Panel,
  containerWidth: number,
  containerHeight: number,
  minWidth: number,
) {
  const width = clampNumber(panel.width, minWidth, containerWidth);
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
  const sections = buildNav(role);

  // IMPORTANT: keep the very first render deterministic to avoid hydration mismatches.
  // We load localStorage state only after mount.
  const [{ sidebarWidth, sidebarSide, mode, floating }, setLayout] =
    React.useState<ShellLayout>(() => DEFAULT_LAYOUT);
  const [hasHydratedLayout, setHasHydratedLayout] = React.useState(false);

  React.useEffect(() => {
    setLayout(readLayoutFromStorage());
    setHasHydratedLayout(true);
  }, []);

  // Auto-tile panels on first load for consistent wide layout
  React.useEffect(() => {
    if (!hasHydratedLayout || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;

    if (containerWidth > 0 && containerHeight > 0) {
      const gap = 16;
      const sidebarWidth = clampNumber(
        220,
        SIDEBAR_MIN_WIDTH,
        Math.min(SIDEBAR_MAX_WIDTH, containerWidth - MAIN_MIN_WIDTH - gap),
      );
      setLayout((prev) => ({
        ...prev,
        floating: {
          sidebar: {
            x: 0,
            y: 0,
            width: sidebarWidth,
            height: containerHeight,
            z: 4,
          },
          main: {
            x: sidebarWidth + gap,
            y: 0,
            width: Math.max(
              MAIN_MIN_WIDTH,
              containerWidth - sidebarWidth - gap,
            ),
            height: containerHeight,
            z: 3,
          },
        },
      }));
    }
  }, [hasHydratedLayout]);

  const persistTimerRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasHydratedLayout) return;
    if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          LAYOUT_STORAGE_KEY,
          JSON.stringify({
            sidebarWidth,
            sidebarSide,
            mode,
            floating,
          } satisfies ShellLayout),
        );
      } catch {
        // ignore write failures (private mode, etc.)
      }
    }, 150);
    return () => {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    };
  }, [hasHydratedLayout, sidebarWidth, sidebarSide, mode, floating]);

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = React.useState({
    width: 0,
    height: 0,
  });
  const floatingDragRef = React.useRef<null | {
    panel: "sidebar" | "main";
    action: "move" | "resize";
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startPanel: Panel;
    containerRect: DOMRect;
  }>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;

    const normalize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const containerWidth = rect.width;
      const containerHeight = rect.height;

      setContainerSize({ width: containerWidth, height: containerHeight });

      // Recalculate tiled layout on resize so panels remain full width/height
      const gap = 16;
      setLayout((prev) => {
        const sidebarWidth = clampNumber(
          prev.sidebarWidth,
          SIDEBAR_MIN_WIDTH,
          Math.min(SIDEBAR_MAX_WIDTH, containerWidth - MAIN_MIN_WIDTH - gap),
        );

        const nextFloating = {
          sidebar: {
            x: 0,
            y: 0,
            width: sidebarWidth,
            height: containerHeight,
            z: prev.floating.sidebar.z,
          },
          main: {
            x: sidebarWidth + gap,
            y: 0,
            width: Math.max(
              MAIN_MIN_WIDTH,
              containerWidth - sidebarWidth - gap,
            ),
            height: containerHeight,
            z: prev.floating.main.z,
          },
        } satisfies ShellLayout["floating"];

        return { ...prev, sidebarWidth, floating: nextFloating };
      });
    };

    normalize();

    const ro = new ResizeObserver(() => normalize());
    ro.observe(containerRef.current);
    window.addEventListener("resize", normalize);
    return () => {
      window.removeEventListener("resize", normalize);
      ro.disconnect();
    };
  }, []);

  // Responsive safety: floating mode only on desktop.
  React.useEffect(() => {
    const onResize = () => {
      if (!isDesktopViewport()) {
        setLayout((prev) =>
          prev.mode === "floating" ? { ...prev, mode: "split" } : prev,
        );
      }
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
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

  const onDividerPointerUpOrCancel = (
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
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
        SIDEBAR_MAX_WIDTH,
      ),
    }));
  };

  const bringPanelToFront = (panel: PanelKey) => {
    setLayout((prev) => {
      const nextZ = Math.max(prev.floating.sidebar.z, prev.floating.main.z) + 1;
      return {
        ...prev,
        floating: {
          ...prev.floating,
          [panel]: { ...prev.floating[panel], z: nextZ },
        },
      };
    });
  };

  const startFloatingDrag = (
    e: React.PointerEvent<HTMLDivElement>,
    panel: PanelKey,
    action: "move" | "resize",
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
        const minWidth =
          dragState.panel === "sidebar" ? SIDEBAR_MIN_WIDTH : MAIN_MIN_WIDTH;
        const moved: Panel = clampPanelToContainer(
          {
            ...start,
            x: start.x + dx,
            y: start.y + dy,
            z: prev.floating[dragState.panel].z,
          },
          containerWidth,
          containerHeight,
          minWidth,
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
      const minWidth =
        dragState.panel === "sidebar" ? SIDEBAR_MIN_WIDTH : MAIN_MIN_WIDTH;
      const maxWidth = containerWidth;
      const width = clampNumber(start.width + dx, minWidth, maxWidth);
      const height = clampNumber(
        start.height + dy,
        PANEL_MIN_HEIGHT,
        Math.min(PANEL_MAX_HEIGHT, containerHeight),
      );
      const resized: Panel = clampPanelToContainer(
        {
          ...start,
          width,
          height,
          z: prev.floating[dragState.panel].z,
        },
        containerWidth,
        containerHeight,
        minWidth,
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

    return (
      <Link
        key={item.key}
        href={item.href}
        className={
          "flex items-center rounded-lg px-4 py-2 text-base " +
          (isActive
            ? "bg-[#D7F7D6] text-[#2F5E3D]"
            : "text-gray-700 hover:bg-black/5")
        }
      >
        {item.label}
      </Link>
    );
  };

  const resetLayout = () => {
    setLayout(DEFAULT_LAYOUT);
  };

  const toggleMode = () => {
    setLayout((prev) => ({
      ...prev,
      mode: prev.mode === "floating" ? "split" : "floating",
    }));
  };

  const restoreRef = React.useRef<{
    sidebar?: Panel;
    main?: Panel;
  }>({});

  const maximizePanel = (panel: PanelKey) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;

    setLayout((prev) => {
      const nextZ = Math.max(prev.floating.sidebar.z, prev.floating.main.z) + 1;
      restoreRef.current[panel] = prev.floating[panel];
      return {
        ...prev,
        floating: {
          ...prev.floating,
          [panel]: {
            x: 0,
            y: 0,
            width: containerWidth,
            height: containerHeight,
            z: nextZ,
          },
        },
      };
    });
  };

  const restorePanel = (panel: PanelKey) => {
    const restore = restoreRef.current[panel];
    if (!restore) return;
    setLayout((prev) => ({
      ...prev,
      floating: {
        ...prev.floating,
        [panel]: { ...restore, z: prev.floating[panel].z },
      },
    }));
    restoreRef.current[panel] = undefined;
  };

  const isMaximized = (panel: PanelKey) => {
    const p = floating[panel];
    if (containerSize.width <= 0 || containerSize.height <= 0) return false;
    return (
      p.x === 0 &&
      p.y === 0 &&
      Math.abs(p.width - containerSize.width) < 1 &&
      Math.abs(p.height - containerSize.height) < 1
    );
  };

  const tilePanels = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;
    const gap = 16;
    const sidebarWidth = clampNumber(
      300,
      SIDEBAR_MIN_WIDTH,
      Math.min(SIDEBAR_MAX_WIDTH, containerWidth - MAIN_MIN_WIDTH - gap),
    );
    setLayout((prev) => {
      const nextZ = Math.max(prev.floating.sidebar.z, prev.floating.main.z) + 1;
      return {
        ...prev,
        floating: {
          sidebar: {
            x: 0,
            y: 0,
            width: sidebarWidth,
            height: containerHeight,
            z: nextZ + 1,
          },
          main: {
            x: sidebarWidth + gap,
            y: 0,
            width: Math.max(
              MAIN_MIN_WIDTH,
              containerWidth - sidebarWidth - gap,
            ),
            height: containerHeight,
            z: nextZ,
          },
        },
      };
    });
  };

  const [sidebarMenuOpen, setSidebarMenuOpen] = React.useState(false);
  const sidebarMenuButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const sidebarMenuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!sidebarMenuOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (sidebarMenuRef.current?.contains(target)) return;
      if (sidebarMenuButtonRef.current?.contains(target)) return;
      setSidebarMenuOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarMenuOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [sidebarMenuOpen]);

  const closeSidebarMenu = () => setSidebarMenuOpen(false);

  const onSidebarMenuAction = (action: () => void) => {
    action();
    closeSidebarMenu();
  };

  return (
    <div className="h-dvh overflow-hidden bg-linear-to-b from-[#C7C800] to-[#2F5E3D] p-6">
      <div
        className={
          "mx-auto h-full w-full " +
          (mode === "floating" ? "max-w-none" : "max-w-6xl")
        }
      >
        <div ref={containerRef} className="relative h-full overflow-hidden">
          {mode === "floating" ? (
            <>
              {/* Sidebar window */}
              <aside
                className="rounded-2xl bg-white/95 shadow-sm ring-1 ring-black/5 overflow-hidden md:absolute flex flex-col"
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
                <div className="relative flex items-center justify-between gap-3 border-b border-black/10 bg-white/70 px-4 py-3">
                  <div
                    className="flex items-center gap-3 min-w-0 cursor-move"
                    onPointerDown={(e) =>
                      startFloatingDrag(e, "sidebar", "move")
                    }
                    onPointerMove={onFloatingPointerMove}
                    onPointerUp={endFloatingDrag}
                    onPointerCancel={endFloatingDrag}
                    title="Drag to move"
                  >
                    <div className="h-9 w-9 rounded-full bg-[#358334] flex items-center justify-center text-white font-semibold">
                      {profile.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        {profile.fullName}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {profile.departmentLine
                          ? `${roleLabel(role)} • ${profile.departmentLine}`
                          : roleLabel(role)}
                      </div>
                    </div>
                  </div>

                  <div className="ml-auto shrink-0">
                    <button
                      ref={sidebarMenuButtonRef}
                      type="button"
                      className="inline-flex items-center justify-center rounded-lg p-2 text-gray-700 hover:bg-black/5"
                      aria-label="Layout options"
                      aria-haspopup="menu"
                      aria-expanded={sidebarMenuOpen}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                      }}
                      onClick={() => setSidebarMenuOpen((v) => !v)}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>

                  {sidebarMenuOpen && (
                    <div
                      ref={sidebarMenuRef}
                      role="menu"
                      className="absolute right-3 top-11.5 z-50 w-56 rounded-xl bg-white shadow-lg ring-1 ring-black/10 p-1"
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-800 hover:bg-black/5"
                        onClick={() => onSidebarMenuAction(toggleMode)}
                      >
                        <ArrowLeftRight className="h-4 w-4 text-gray-600" />
                        Switch to Split
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-800 hover:bg-black/5"
                        onClick={() => onSidebarMenuAction(tilePanels)}
                      >
                        <LayoutGrid className="h-4 w-4 text-gray-600" />
                        Tile panels
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-800 hover:bg-black/5"
                        onClick={() => onSidebarMenuAction(resetLayout)}
                      >
                        <RotateCcw className="h-4 w-4 text-gray-600" />
                        Reset layout
                      </button>

                      <div className="my-1 h-px bg-black/10" />

                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-800 hover:bg-black/5"
                        onClick={() =>
                          onSidebarMenuAction(() =>
                            isMaximized("sidebar")
                              ? restorePanel("sidebar")
                              : maximizePanel("sidebar"),
                          )
                        }
                      >
                        {isMaximized("sidebar") ? (
                          <Minimize2 className="h-4 w-4 text-gray-600" />
                        ) : (
                          <Maximize2 className="h-4 w-4 text-gray-600" />
                        )}
                        {isMaximized("sidebar")
                          ? "Restore sidebar"
                          : "Maximize sidebar"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-h-0 overflow-auto">
                  <nav className="px-4 py-4 space-y-4">
                    {sections.map((section, idx) => (
                      <div key={idx}>
                        {section.title && (
                          <div className="px-4 pb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                            {section.title}
                          </div>
                        )}
                        <div className="space-y-1">
                          {section.items.map(navItem)}
                        </div>
                      </div>
                    ))}
                  </nav>
                </div>

                <div className="border-t border-black/10">
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
                  className="absolute bottom-1 right-1 h-6 w-6 cursor-nwse-resize rounded-md hover:bg-black/5"
                  onPointerDown={(e) =>
                    startFloatingDrag(e, "sidebar", "resize")
                  }
                  onPointerMove={onFloatingPointerMove}
                  onPointerUp={endFloatingDrag}
                  onPointerCancel={endFloatingDrag}
                  title="Drag to resize"
                >
                  <div className="absolute bottom-2 right-2 h-3 w-3 border-b-2 border-r-2 border-black/20" />
                </div>
              </aside>

              {/* Main window */}
              <section
                className="rounded-2xl bg-[#F7F7F3] shadow-sm ring-1 ring-black/5 md:absolute flex flex-col overflow-hidden"
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
                  <div className="flex-1" />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-lg p-2 text-gray-600 hover:bg-black/5"
                      onClick={() =>
                        isMaximized("main")
                          ? restorePanel("main")
                          : maximizePanel("main")
                      }
                      title={isMaximized("main") ? "Restore" : "Maximize"}
                      aria-label={isMaximized("main") ? "Restore" : "Maximize"}
                    >
                      {isMaximized("main") ? (
                        <Minimize2 className="h-4 w-4" />
                      ) : (
                        <Maximize2 className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      aria-label="Notifications"
                      className="rounded-lg p-2 text-gray-700 hover:bg-black/5"
                    >
                      <Bell className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-auto p-8">
                  {children}
                </div>

                {/* Resize handle */}
                <div
                  className="absolute bottom-1 right-1 h-6 w-6 cursor-nwse-resize rounded-md hover:bg-black/5"
                  onPointerDown={(e) => startFloatingDrag(e, "main", "resize")}
                  onPointerMove={onFloatingPointerMove}
                  onPointerUp={endFloatingDrag}
                  onPointerCancel={endFloatingDrag}
                  title="Drag to resize"
                >
                  <div className="absolute bottom-2 right-2 h-3 w-3 border-b-2 border-r-2 border-black/20" />
                </div>
              </section>
            </>
          ) : (
            <div
              className={
                "flex flex-col gap-6 md:flex-row md:gap-0 md:h-full md:min-h-0" +
                (sidebarSide === "right" ? " md:flex-row-reverse" : "")
              }
              style={
                {
                  ["--sidebar-width" as never]: `${sidebarWidth}px`,
                } as React.CSSProperties
              }
            >
              {/* Sidebar */}
              <aside className="w-full md:w-(--sidebar-width) md:shrink-0 md:h-full md:min-h-0 rounded-2xl bg-white/95 shadow-sm ring-1 ring-black/5 overflow-hidden flex flex-col">
                <div className="p-6 shrink-0">
                  <div className="relative flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-[#358334] flex items-center justify-center text-white font-semibold">
                      {profile.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        {profile.fullName}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {profile.departmentLine
                          ? `${roleLabel(role)} • ${profile.departmentLine}`
                          : roleLabel(role)}
                      </div>
                    </div>

                    <div className="ml-auto flex items-center gap-1 shrink-0">
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
                            sidebarSide:
                              prev.sidebarSide === "left" ? "right" : "left",
                          }))
                        }
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                      </button>

                      <button
                        ref={sidebarMenuButtonRef}
                        type="button"
                        className="inline-flex items-center justify-center rounded-lg p-2 text-gray-700 hover:bg-black/5"
                        aria-label="Layout options"
                        aria-haspopup="menu"
                        aria-expanded={sidebarMenuOpen}
                        onClick={() => setSidebarMenuOpen((v) => !v)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>

                    {sidebarMenuOpen && (
                      <div
                        ref={sidebarMenuRef}
                        role="menu"
                        className="absolute right-0 top-13 z-50 w-56 rounded-xl bg-white shadow-lg ring-1 ring-black/10 p-1"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-800 hover:bg-black/5"
                          onClick={() => onSidebarMenuAction(toggleMode)}
                        >
                          <ArrowLeftRight className="h-4 w-4 text-gray-600" />
                          Switch to Float
                        </button>

                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-800 hover:bg-black/5"
                          onClick={() => onSidebarMenuAction(resetLayout)}
                        >
                          <RotateCcw className="h-4 w-4 text-gray-600" />
                          Reset layout
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-auto">
                  <nav className="px-4 pb-4 space-y-4">
                    {sections.map((section, idx) => (
                      <div key={idx}>
                        {section.title && (
                          <div className="px-4 pb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                            {section.title}
                          </div>
                        )}
                        <div className="space-y-1">
                          {section.items.map(navItem)}
                        </div>
                      </div>
                    ))}
                  </nav>
                </div>

                <div className="border-t border-black/10 shrink-0">
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
                  setLayout((prev) => ({
                    ...prev,
                    sidebarWidth: DEFAULT_LAYOUT.sidebarWidth,
                  }))
                }
                onKeyDown={onDividerKeyDown}
              >
                <div className="mx-auto w-px bg-black/10 group-hover:bg-black/25 group-focus-visible:bg-black/25" />
              </div>

              {/* Main */}
              <section className="flex-1 min-w-0 md:h-full md:min-h-0 rounded-2xl bg-[#F7F7F3] shadow-sm ring-1 ring-black/5 overflow-hidden">
                <div className="h-full overflow-auto p-8">
                  <div className="flex justify-end mb-4">
                    <button
                      type="button"
                      aria-label="Notifications"
                      className="rounded-full p-2 text-gray-700 hover:bg-black/5"
                    >
                      <Bell className="h-5 w-5" />
                    </button>
                  </div>

                  {children}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
