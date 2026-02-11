"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkflowStep = {
  key: string;
  label: string;
  state: "done" | "current" | "todo";
  statusType?: string;
};

export type WorkflowEvent = {
  id: string;
  at: string;
  title: string;
  description: string;
  actorName?: string | null;
  note?: string | null;
  action?: string;
};

function statusToActionColor(action?: string): string {
  if (!action) return "bg-gray-300";
  const lowerAction = action.toLowerCase();
  if (["approved", "verified", "submitted", "created", "added", "resubmitted"].some(s => lowerAction.includes(s))) return "bg-green-500";
  if (["returned", "rejected", "cancelled"].some(s => lowerAction.includes(s))) return "bg-red-500";
  if (["reviewing", "on_hold", "pending"].some(s => lowerAction.includes(s))) return "bg-blue-500";
  if (["needs_revision", "revision"].some(s => lowerAction.includes(s))) return "bg-amber-500";
  return "bg-gray-300";
}

export default function WorkflowProgress({
  steps,
  events,
}: {
  steps: WorkflowStep[];
  events: WorkflowEvent[];
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Close on Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  // Lock body scroll
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Calculate progress percentage for the continuous line
  const activeIndex = steps.findIndex((s) => s.state === "current");
  const progressIndex = activeIndex === -1 ? (steps.every(s => s.state === 'done') ? steps.length - 1 : 0) : activeIndex;
  const progressPercentage = (progressIndex / (steps.length - 1)) * 100;

  return (
    <div className="bg-white rounded-xl shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-sm font-semibold text-gray-900">Activity Timeline</h3>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="text-xs font-medium text-gray-900 underline decoration-gray-400 underline-offset-4 hover:decoration-gray-900 transition-all"
        >
          Expand
        </button>
      </div>

      <div className="relative mx-2">
        {/* Continuous Lines Container */}
        {/* 
            left-4/right-4 logic: 
            Container has mx-2 (8px). 
            Item is w-8 (32px). Center is 16px from item edge.
            First item starts at 0 relative to this container. Center is 16px.
            Last item ends at 100%. Center is 100% - 16px.
            Line should start at 16px (left-4) and end at 16px (right-4).
        */}
        <div className="absolute left-4 right-4 top-[15px] h-[2px] -z-0">
          {/* Background Gray Line */}
          <div className="absolute inset-0 bg-gray-100" />
          
          {/* Active Green Line */}
          <div 
            className="absolute left-0 top-0 bottom-0 bg-green-600 transition-all duration-500 ease-in-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        {/* Steps Container */}
        <div className="flex justify-between relative z-10 w-full">
          {steps.map((s, idx) => {
            const isCompleted = s.state === "done" || s.state === "current";
            
            return (
              <div key={s.key} className="w-8 flex flex-col items-center relative group">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors duration-200 bg-white",
                    isCompleted
                      ? "bg-green-600 border-green-600"
                      : "border-gray-200"
                  )}
                >
                  {isCompleted && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
                </div>
                {/* Absolute positioned label to prevent flex layout distortion */}
                <div className="absolute top-10 left-1/2 -translate-x-1/2 w-max max-w-[100px] text-center">
                  <span className="text-[10px] md:text-xs font-medium text-gray-500 block leading-tight">
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Spacer for the absolute labels */}
        <div className="h-8" aria-hidden="true" />
      </div>

      {/* Modal / Expanded View */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">Activity History</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
              >
                <span className="sr-only">Close</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="overflow-y-auto p-6">
              {events.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-8">No activity recorded yet.</div>
              ) : (
                <div className="relative ml-3">
                  {/* Vertical line */}
                  <div className="absolute left-2.5 top-2 bottom-2 w-1 bg-gray-200" />
                  
                  {events.map((e) => (
                    <div key={e.id} className="relative flex items-start gap-5 pb-8">
                      {/* Dot */}
                      <div className={cn("relative z-10 h-5 w-5 rounded-full ring-4 ring-white", statusToActionColor(e.action))} />
                      
                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-gray-900">{e.title}</p>
                          <span className="text-xs text-gray-400 font-medium">{e.at}</span>
                        </div>
                        {e.description && (
                          <p className="text-sm text-gray-900 mt-1">{e.description}</p>
                        )}
                        {e.actorName && (
                          <p className="text-xs text-gray-500 mt-2">by {e.actorName}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
