"use client";

import * as React from "react";
import { Check, Clock } from "lucide-react";

export type WorkflowStep = {
  key: string;
  label: string;
  state: "done" | "current" | "todo";
  statusType?: string; // Optional status for color differentiation
};

export type WorkflowEvent = {
  id: string;
  at: string;
  title: string;
  description: string;
  actorName?: string | null;
  note?: string | null;
  action?: string; // Action type for color determination
};

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function StepDot({
  state,
  statusType,
}: {
  state: WorkflowStep["state"];
  statusType?: string;
}) {
  const isDone = state === "done";
  const isCurrent = state === "current";

  // Determine colors based on state and statusType
  let borderColor = "";
  let bgColor = "";
  let iconColor = "";

  if (isDone) {
    // Completed steps are green
    borderColor = "border-green-500";
    bgColor = "bg-white";
    iconColor = "text-green-500";
  } else if (isCurrent) {
    if (statusType === "revision_requested") {
      borderColor = "border-orange-500";
      bgColor = "bg-white";
      iconColor = "text-orange-600";
    } else if (statusType === "rejected") {
      borderColor = "border-red-500";
      bgColor = "bg-white";
      iconColor = "text-red-600";
    } else {
      // Normal current step (waiting) -> Blue
      borderColor = "border-blue-500"; // Blue-500
      bgColor = "bg-white";
      iconColor = "text-blue-500";
    }
  } else {
    // Todo
    borderColor = "border-gray-200";
    bgColor = "bg-white";
    iconColor = "text-gray-300";
  }

  return (
    <div
      className={classNames(
        "flex h-10 w-10 items-center justify-center rounded-full border-[3px] bg-white relative z-10",
        borderColor,
        bgColor,
      )}
      aria-hidden="true"
    >
      {isDone ? (
        <Check className={`h-5 w-5 ${iconColor}`} strokeWidth={3} />
      ) : null}
      {isCurrent && !isDone ? (
        <Clock className={`h-5 w-5 ${iconColor}`} strokeWidth={2.5} />
      ) : null}
    </div>
  );
}

export default function WorkflowProgress({
  steps,
  events,
}: {
  steps: WorkflowStep[];
  events: WorkflowEvent[];
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg font-bold text-gray-900">Workflow progress</h3>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          Expand
        </button>
      </div>

      <div className="relative px-4">
        <div className="grid grid-cols-5 gap-0">
          {steps.map((s, idx) => (
            <div key={s.key} className="relative flex flex-col items-center">
              {idx !== 0 ? (
                <div
                  className={classNames(
                    "absolute top-5 right-[50%] h-[3px] w-full -translate-y-1/2 block",
                    steps[idx - 1]?.state === "done"
                      ? "bg-green-500"
                      : "bg-gray-200",
                  )}
                  aria-hidden="true"
                />
              ) : null}
              <StepDot state={s.state} statusType={s.statusType} />
              <div className="mt-3 text-xs font-bold text-gray-900 text-center">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Complete Audit Tracking"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

          <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-xl ring-1 ring-black/10">
            <div className="flex items-center gap-3 border-b border-black/10 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-gray-700 hover:bg-black/5"
                aria-label="Close"
              >
                <span aria-hidden="true">←</span>
              </button>
              <div className="text-base font-semibold text-gray-900">
                Complete Audit Tracking
              </div>
            </div>

            <div className="max-h-[75vh] overflow-auto px-6 py-5">
              {events.length === 0 ? (
                <div className="text-sm text-gray-600">No activity yet.</div>
              ) : (
                <div className="relative">
                  <div
                    className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                  <div className="space-y-4">
                    {events.map((e) => {
                      // Determine dot color based on action
                      const getDotColor = () => {
                        if (e.action === "request_revision")
                          return "bg-orange-500";
                        if (e.action === "reject") return "bg-red-500";
                        return "bg-green-500";
                      };

                      return (
                        <div key={e.id} className="relative pl-10">
                          <div
                            className={`absolute left-2.75 top-6 h-4 w-4 rounded-full ${getDotColor()} ring-4 ring-white`}
                            aria-hidden="true"
                          />

                          <div className="rounded-xl bg-black/5 px-4 py-3">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {e.title}
                                </div>
                                <div className="mt-0.5 text-sm text-gray-700">
                                  {e.description}
                                </div>
                                <div className="mt-1 text-xs text-gray-600">
                                  {e.actorName ? `by ${e.actorName}` : ""}
                                </div>
                                {e.note ? (
                                  <div className="mt-1 text-xs text-gray-700">
                                    {e.note}
                                  </div>
                                ) : null}
                              </div>
                              <div className="shrink-0 text-sm font-semibold text-gray-900">
                                {e.at}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
