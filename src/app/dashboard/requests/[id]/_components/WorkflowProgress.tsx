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
  label: string;
  detail?: string | null;
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
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold text-gray-900">
          Workflow progress
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-sm text-gray-700 hover:underline"
        >
          {expanded ? "Collapse" : "Expand"}
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

        {expanded ? (
          <div className="mt-6 border-t border-black/10 pt-4">
            <div className="text-sm font-semibold text-gray-900">Activity</div>
            {events.length === 0 ? (
              <div className="mt-2 text-sm text-gray-600">No activity yet.</div>
            ) : (
              <ul className="mt-3 space-y-2">
                {events.map((e) => (
                  <li
                    key={e.id}
                    className="rounded-lg bg-black/5 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-gray-900">{e.label}</div>
                      <div className="text-xs text-gray-600">{e.at}</div>
                    </div>
                    {e.detail ? (
                      <div className="mt-1 text-xs text-gray-700">
                        {e.detail}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
