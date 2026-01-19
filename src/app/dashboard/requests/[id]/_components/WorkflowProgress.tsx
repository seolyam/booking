"use client";

import * as React from "react";
import { Check } from "lucide-react";

export type WorkflowStep = {
  key: string;
  label: string;
  state: "done" | "current" | "todo";
};

export type WorkflowEvent = {
  id: string;
  at: string;
  title: string;
  description: string;
  actorName?: string | null;
  note?: string | null;
};

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function StepDot({ state }: { state: WorkflowStep["state"] }) {
  const isDone = state === "done";
  const isCurrent = state === "current";

  return (
    <div
      className={classNames(
        "flex h-10 w-10 items-center justify-center rounded-full border",
        isDone || isCurrent
          ? "border-[#358334] bg-[#D7F7D6]"
          : "border-black/15 bg-white"
      )}
      aria-hidden="true"
    >
      {isDone ? <Check className="h-5 w-5 text-[#358334]" /> : null}
      {isCurrent && !isDone ? (
        <div className="h-2.5 w-2.5 rounded-full bg-[#358334]" />
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
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold text-gray-900">
          Workflow progress
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="text-sm text-gray-700 hover:underline"
        >
          Expand
        </button>
      </div>

      <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/5 p-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-5">
          {steps.map((s, idx) => (
            <div key={s.key} className="relative">
              {idx !== 0 ? (
                <div
                  className={classNames(
                    "absolute left-[-50%] top-5 hidden h-0.5 w-full sm:block",
                    steps[idx - 1]?.state === "done" || s.state !== "todo"
                      ? "bg-[#358334]"
                      : "bg-black/10"
                  )}
                  aria-hidden="true"
                />
              ) : null}
              <div className="flex flex-col items-center gap-2">
                <StepDot state={s.state} />
                <div className="text-xs font-medium text-gray-700">
                  {s.label}
                </div>
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
                    className="absolute left-4 top-2 bottom-2 w-0.5 bg-[#358334]"
                    aria-hidden="true"
                  />
                  <div className="space-y-4">
                    {events.map((e) => (
                      <div key={e.id} className="relative pl-10">
                        <div
                          className="absolute left-2.75 top-6 h-4 w-4 rounded-full bg-[#358334] ring-4 ring-white"
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
                    ))}
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
