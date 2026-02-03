"use client";

import React from "react";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  XCircle,
  Wallet,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import WorkflowProgress, {
  type WorkflowEvent,
  type WorkflowStep,
} from "@/app/dashboard/requests/[id]/_components/WorkflowProgress";

interface Item {
  id: string;
  description: string;
  quantity: number;
  unit_cost: string;
  total_cost: string;
  quarter: string;
}

interface BudgetDetails {
  id: string;
  displayId: string;
  projectName: string;
  projectSub: string;
  type: string;
  totalAmount: string;
  requester: string;
  createdDate: string;
  updatedDate: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  variance_explanation?: string | null;
}

interface AuditLog {
  id: string;
  action: string;
  description: string;
  actor: string;
  date: string;
  comment?: string | null;
}

interface BudgetTrackingViewProps {
  budget: BudgetDetails;
  items: Item[];
  auditHistory: AuditLog[];
  backHref: string;
}

function typePill(type: string) {
  const base =
    "inline-flex items-center rounded-md px-3 py-1 text-xs font-medium";
  return type.toLowerCase() === "capex"
    ? `${base} bg-blue-100 text-blue-700`
    : `${base} bg-purple-100 text-purple-700`;
}

function statusMeta(status: string) {
  if (status === "approved") {
    return {
      label: "Approved",
      cls: "bg-green-100 text-green-700",
      icon: <CheckCircle2 className="h-4 w-4" />,
    };
  }
  if (status === "rejected") {
    return {
      label: "Rejected",
      cls: "bg-red-100 text-red-700",
      icon: <XCircle className="h-4 w-4" />,
    };
  }
  if (status === "revision_requested") {
    return {
      label: "Needs Revision",
      cls: "bg-orange-100 text-orange-700",
      icon: <XCircle className="h-4 w-4" />,
    };
  }
  if (status === "verified") {
    return {
      label: "Verified",
      cls: "bg-green-100 text-green-700",
      icon: <CheckCircle2 className="h-4 w-4" />,
    };
  }
  if (status === "verified_by_reviewer") {
    return {
      label: "Reviewed",
      cls: "bg-yellow-100 text-yellow-800",
      icon: <CheckCircle2 className="h-4 w-4" />,
    };
  }
  if (status === "submitted") {
    return {
      label: "Submitted",
      cls: "bg-yellow-100 text-yellow-700",
      icon: <CheckCircle2 className="h-4 w-4" />,
    };
  }
  return {
    label: "Created",
    cls: "bg-gray-100 text-gray-700",
    icon: <CheckCircle2 className="h-4 w-4" />,
  };
}

function actionLabel(action: string) {
  if (action === "create_draft") return "Created";
  if (action === "submit") return "Submitted";
  if (action === "reviewed") return "Reviewed";
  if (action === "verify") return "Verified";
  if (action === "request_revision") return "Revision requested";
  if (action === "approve") return "Approved";
  if (action === "reject") return "Rejected";
  if (action === "revoke") return "Revoked";
  return action
    .split("_")
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function computeSteps(status: string): WorkflowStep[] {
  const steps: Array<{ key: string; label: string }> = [
    { key: "created", label: "Created" },
    { key: "submitted", label: "Submitted" },
    { key: "reviewed", label: "Review" },
    { key: "verified", label: "Verified" },
    { key: "approved", label: "Approved" },
  ];

  const activeIndex = (() => {
    if (status === "draft") return 0;
    if (status === "submitted") return 1;
    if (
      status === "revision_requested" ||
      status === "verified_by_reviewer" ||
      status === "rejected"
    )
      return 2;
    if (status === "verified") return 3;
    if (status === "approved") return 4;
    return 0;
  })();

  if (status === "revision_requested" && activeIndex === 2) {
    steps[2] = { ...steps[2], label: "Revision" };
  } else if (status === "rejected" && activeIndex === 2) {
    steps[2] = { ...steps[2], label: "Rejected" };
  }

  return steps.map((s, idx) => {
    if (idx < activeIndex) return { ...s, state: "done" as const };
    if (idx === activeIndex) {
      return {
        ...s,
        state: "current" as const,
        statusType: status as string,
      };
    }
    return { ...s, state: "todo" as const };
  });
}

function formatPhp(amount: string) {
  const n = Number(amount.replace(/[^0-9.-]+/g, ""));
  if (!Number.isFinite(n)) return amount;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function BudgetTrackingView({
  budget,
  items,
  auditHistory,
  backHref,
}: BudgetTrackingViewProps) {
  const status = statusMeta(budget.status);
  const steps = computeSteps(budget.status);

  // Map AuditLog to WorkflowEvent
  const events: WorkflowEvent[] = auditHistory.map((log) => ({
    id: log.id,
    at: log.date,
    title: actionLabel(log.action),
    description: log.description,
    actorName: log.actor,
    note: log.comment,
    action: log.action,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-4">
            <Link
              href={backHref}
              className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Budget Tracking
              </h1>
              <div className="text-sm text-gray-500">
                Track the complete lifecycle and history of this budget request
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm ring-1 ring-gray-200 hover:text-gray-900 transition-colors">
            <Bell className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">
                {budget.projectName}
              </h2>
              <span className={typePill(budget.type) + " uppercase"}>
                {budget.type.toUpperCase()}
              </span>
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {budget.displayId} - {budget.projectSub}
            </div>
          </div>

          <div
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-wide ${status.cls}`}
          >
            {status.icon}
            {status.label}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-8 rounded-2xl bg-gray-50 p-6 md:grid-cols-4">
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Total Amount
            </div>
            <div className="mt-2 text-xl font-bold text-gray-900 break-words">
              {budget.totalAmount}
            </div>
          </div>
          <div className="text-center min-w-0">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Requester
            </div>
            <div className="mt-2 text-base md:text-lg font-bold text-gray-900 break-all md:break-words line-clamp-2">
              {budget.requester}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Created
            </div>
            <div className="mt-2 text-lg font-bold text-gray-900">
              {budget.createdDate}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Last Updated
            </div>
            <div className="mt-2 text-lg font-bold text-gray-900">
              {budget.updatedDate}
            </div>
          </div>
        </div>

        <div className="mt-10 border-b border-gray-100 pb-10">
          <WorkflowProgress steps={steps} events={events} />
        </div>

        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div>
            <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-900">
              <Wallet className="h-5 w-5 text-gray-400" /> Cost Breakdown
            </h3>

            {items.length === 0 ? (
              <div className="text-sm text-gray-500">No line items.</div>
            ) : (
              <div className="space-y-4">
                {items.slice(0, 5).map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between rounded-xl bg-gray-50 p-4"
                  >
                    <div>
                      <div className="font-bold text-gray-900">
                        {it.description}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {it.quarter ? `${it.quarter} | ` : ""} Qty:{" "}
                        {it.quantity}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-gray-900">
                      {formatPhp(it.total_cost)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-900">
              <Calendar className="h-5 w-5 text-gray-400" /> Project timeline
            </h3>
            <div className="space-y-6 rounded-xl bg-gray-50 p-6">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Start Date
                </div>
                <div className="font-bold text-gray-900">
                  {budget.startDate || "-"}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  End Date
                </div>
                <div className="font-bold text-gray-900">
                  {budget.endDate || "-"}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                  Variance Explanation
                </div>
                {budget.variance_explanation ? (
                  <div className="text-sm font-medium text-gray-900 break-words whitespace-pre-wrap">
                    {budget.variance_explanation}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    No variance explanation provided
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
