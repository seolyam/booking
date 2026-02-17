"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Clock,
  LogOut,
  Timer,
  User,
  Building2,
  Phone,
  FileText,
  CheckCircle,
  AlertCircle,
  Plus,
} from "lucide-react";
import {
  resolveVisitState,
  checkInVisitor,
  logOutVisitor,
  extendVisit,
} from "@/actions/visit";
import { DURATION_OPTIONS, EXTEND_OPTIONS } from "@/lib/visitOptions";
import type { VisitState } from "@/actions/visit";
import { cn } from "@/lib/utils";

// ============================================================================
// Local storage helpers
// ============================================================================

const STORAGE_KEY = "active_visit_id";

function getStoredVisitId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

function setStoredVisitId(id: string) {
  localStorage.setItem(STORAGE_KEY, id);
}

function clearStoredVisitId() {
  localStorage.removeItem(STORAGE_KEY);
}

// ============================================================================
// Time formatting
// ============================================================================

function formatTime(date: Date | string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTimeRemaining(endTime: Date | null): string {
  if (!endTime) return "—";
  const now = new Date();
  const end = new Date(endTime);
  const diffMs = end.getTime() - now.getTime();
  if (diffMs <= 0) return "Expired";
  const mins = Math.ceil(diffMs / 60_000);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m remaining`;
  }
  return `${mins}m remaining`;
}

// ============================================================================
// Check-In Form
// ============================================================================

function CheckInForm({
  onCheckedIn,
}: {
  onCheckedIn: (visitId: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [purpose, setPurpose] = useState("");
  const [duration, setDuration] = useState<number | "">("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!purpose.trim()) {
      setError("Purpose of visit is required");
      return;
    }
    if (!duration) {
      setError("Please select estimated visit length");
      return;
    }

    startTransition(async () => {
      const result = await checkInVisitor({
        name: name.trim(),
        company: company.trim() || undefined,
        contact_number: contactNumber.trim() || undefined,
        purpose_of_visit: purpose.trim(),
        expected_duration: duration as number,
      });

      if ("error" in result) {
        setError(result.error);
      } else {
        setStoredVisitId(result.visitId);
        onCheckedIn(result.visitId);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-900 text-center">
        Visitor Check-In
      </h2>
      <p className="text-sm text-gray-500 text-center">
        Please fill out the form below to log your visit.
      </p>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Name */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <User className="h-4 w-4" />
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Juan Dela Cruz"
          required
          className="h-11 w-full rounded-lg border border-gray-300 px-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all placeholder:text-gray-500"
        />
      </div>

      {/* Company */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <Building2 className="h-4 w-4" />
          Company
        </label>
        <input
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Optional"
          className="h-11 w-full rounded-lg border border-gray-300 px-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all placeholder:text-gray-500"
        />
      </div>

      {/* Contact Number */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <Phone className="h-4 w-4" />
          Contact Number
        </label>
        <input
          type="tel"
          value={contactNumber}
          onChange={(e) => setContactNumber(e.target.value)}
          placeholder="Optional"
          className="h-11 w-full rounded-lg border border-gray-300 px-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all placeholder:text-gray-500"
        />
      </div>

      {/* Purpose */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <FileText className="h-4 w-4" />
          Purpose of Visit <span className="text-red-500">*</span>
        </label>
        <textarea
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="Meeting with HR, document pickup, etc."
          required
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all resize-none placeholder:text-gray-500"
        />
      </div>

      {/* Duration Dropdown */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <Timer className="h-4 w-4" />
          Estimated Visit Length <span className="text-red-500">*</span>
        </label>
        <select
          value={duration}
          onChange={(e) =>
            setDuration(e.target.value ? Number(e.target.value) : "")
          }
          required
          className={cn(
            "h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all bg-white",
            duration === "" ? "text-gray-500" : "text-gray-900"
          )}
        >
          <option value="">Select duration...</option>
          {DURATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full h-12 rounded-lg bg-[#358334] text-white font-semibold text-sm hover:bg-[#2d7029] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isPending ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Checking in...
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4" />
            Check In
          </>
        )}
      </button>
    </form>
  );
}

// ============================================================================
// Manage Visit Screen
// ============================================================================

function ManageVisitScreen({
  visit,
  onLoggedOut,
  onExtended,
}: {
  visit: NonNullable<Extract<VisitState, { type: "ACTIVE" }>["visit"]>;
  onLoggedOut: () => void;
  onExtended: (newEndTime: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(
    formatTimeRemaining(visit.expected_end_time),
  );

  // Live countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(visit.expected_end_time));
    }, 30_000);
    return () => clearInterval(interval);
  }, [visit.expected_end_time]);

  function handleLogOut() {
    setError(null);
    startTransition(async () => {
      const result = await logOutVisitor(visit.id);
      if ("error" in result) {
        setError(result.error);
      } else {
        clearStoredVisitId();
        onLoggedOut();
      }
    });
  }

  function handleExtend(minutes: number) {
    setError(null);
    startTransition(async () => {
      const result = await extendVisit({
        visitId: visit.id,
        additionalMinutes: minutes,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        onExtended(result.newEndTime);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-7 w-7 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          You&apos;re Checked In
        </h2>
        <p className="mt-1 text-sm text-gray-500">Welcome, {visit.name}</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Visit Info Card */}
      <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Purpose</span>
          <span className="font-medium text-gray-900">
            {visit.purpose_of_visit}
          </span>
        </div>
        {visit.company && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Company</span>
            <span className="font-medium text-gray-900">{visit.company}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Checked in at</span>
          <span className="font-medium text-gray-900">
            {formatTime(visit.time_in)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Expected until</span>
          <span className="font-medium text-gray-900">
            {formatTime(visit.expected_end_time)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Time remaining</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-200">
            <Clock className="h-3 w-3" />
            {timeRemaining}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-6">
        <div className="flex gap-2">
          {EXTEND_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleExtend(opt.value)}
              disabled={isPending}
              className="flex-1 h-11 rounded-lg bg-blue-50 text-blue-700 font-medium text-sm hover:bg-blue-100 ring-1 ring-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleLogOut}
          disabled={isPending}
          className="w-full h-12 rounded-lg bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Log Out Now
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Success Screen (after check-in)
// ============================================================================

function SuccessScreen({ onNewVisit }: { onNewVisit: () => void }) {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Visit Logged Out</h2>
        <p className="mt-1 text-sm text-gray-500">
          Thank you for visiting. You have been successfully logged out.
        </p>
      </div>
      <button
        onClick={onNewVisit}
        className="w-full h-11 rounded-lg bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200 transition-colors ring-1 ring-gray-200"
      >
        Start New Visit
      </button>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function VisitPage() {
  const [state, setState] = useState<
    | { view: "loading" }
    | { view: "check-in" }
    | {
      view: "manage";
      visit: Extract<VisitState, { type: "ACTIVE" }>["visit"];
    }
    | { view: "success" }
  >({ view: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      const storedId = getStoredVisitId();
      if (!storedId) {
        if (!cancelled) setState({ view: "check-in" });
        return;
      }

      const result = await resolveVisitState(storedId);
      if (cancelled) return;

      switch (result.type) {
        case "NEW":
          clearStoredVisitId();
          setState({ view: "check-in" });
          break;
        case "EXPIRED":
          clearStoredVisitId();
          setState({ view: "check-in" });
          break;
        case "ACTIVE":
          setState({ view: "manage", visit: result.visit });
          break;
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.view === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-[#358334]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
        {state.view === "check-in" && (
          <CheckInForm
            onCheckedIn={async (visitId) => {
              // Re-resolve to get the full visit object
              const result = await resolveVisitState(visitId);
              if (result.type === "ACTIVE") {
                setState({ view: "manage", visit: result.visit });
              } else {
                setState({ view: "check-in" });
              }
            }}
          />
        )}

        {state.view === "manage" && (
          <ManageVisitScreen
            visit={state.visit}
            onLoggedOut={() => setState({ view: "success" })}
            onExtended={async () => {
              // Refresh to get updated end time
              const storedId = getStoredVisitId();
              if (storedId) {
                const result = await resolveVisitState(storedId);
                if (result.type === "ACTIVE") {
                  setState({ view: "manage", visit: result.visit });
                }
              }
            }}
          />
        )}

        {state.view === "success" && (
          <SuccessScreen onNewVisit={() => setState({ view: "check-in" })} />
        )}
      </div>
    </div>
  );
}
