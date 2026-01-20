"use client";

import React from "react";
import {
  ArrowLeft,
  Bell,
  Check,
  Clock,
  BadgeCheck,
  AlertCircle,
  Calendar,
  X,
  CircleDashed,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface Milestone {
  id: string;
  description: string;
  target_quarter: string | null;
}

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
  milestones: Milestone[];
  auditHistory: AuditLog[];
  backHref: string;
}

export default function BudgetTrackingView({
  budget,
  items,
  milestones,
  auditHistory,
  backHref,
}: BudgetTrackingViewProps) {
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "revision_requested":
        return {
          label: "Revision Needed",
          color: "bg-orange-50 text-orange-600 border-orange-100",
          icon: <AlertCircle className="w-4 h-4" />,
        };
      case "rejected":
        return {
          label: "Rejected",
          color: "bg-red-50 text-red-600 border-red-100",
          icon: <XCircle className="w-4 h-4" />,
        };
      case "approved":
        return {
          label: "Approved",
          color: "bg-green-50 text-green-600 border-green-100",
          icon: <BadgeCheck className="w-4 h-4" />,
        };
      case "verified":
        return {
          label: "Verified",
          color: "bg-green-50 text-green-600 border-green-100",
          icon: <Check className="w-4 h-4" />,
        };
      case "verified_by_reviewer":
        return {
          label: "Reviewed",
          color: "bg-yellow-50 text-yellow-700 border-yellow-200",
          icon: <Clock className="w-4 h-4" />,
        };
      case "submitted":
        return {
          label: "Submitted",
          color: "bg-gray-50 text-gray-700 border-gray-100",
          icon: <Clock className="w-4 h-4" />,
        };
      default:
        return {
          label: "Draft",
          color: "bg-gray-50 text-gray-600 border-gray-100",
          icon: <CircleDashed className="w-4 h-4" />,
        };
    }
  };

  const statusConfig = getStatusConfig(budget.status);

  const getSteps = (status: string) => {
    const steps = [
      { id: "draft", label: "Created" },
      { id: "submitted", label: "Submitted" },
      { id: "review", label: "Review" },
      { id: "verified", label: "Verified" },
      { id: "approved", label: "Approved" },
    ];

    const currentIndex = (() => {
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

    // Adjust labels for terminal review outcomes
    if (status === "revision_requested") {
      steps[2] = { ...steps[2], label: "Revision" };
    } else if (status === "rejected") {
      steps[2] = { ...steps[2], label: "Rejected" };
    } else if (status === "verified_by_reviewer") {
      steps[2] = { ...steps[2], label: "Reviewed" };
    }

    return steps.map((s, idx) => {
      const isDone = idx < currentIndex;
      const isCurrent = idx === currentIndex;

      let icon: React.ReactNode = null;
      let color = "bg-gray-50 text-gray-400 border-gray-300";
      let lineColor = "bg-gray-200";

      if (isDone) {
        // Check if we're looking at a step before a revision/rejected status
        // If the current status is revision or rejected, don't color previous steps green past submitted
        if (
          (status === "revision_requested" || status === "rejected") &&
          idx >= 2
        ) {
          // Steps at or after review should not be green if revision/rejected
          icon = null;
          color = "bg-gray-50 text-gray-400 border-gray-300";
          lineColor = "bg-gray-200";
        } else {
          icon = <Check className="w-4 h-4" />;
          color = "bg-green-100 text-green-600 border-green-500";
          lineColor = "bg-green-500";
        }
      } else if (isCurrent) {
        if (status === "revision_requested") {
          icon = <AlertCircle className="w-4 h-4" />;
          color = "bg-orange-100 text-orange-600 border-orange-500";
        } else if (status === "rejected") {
          icon = <XCircle className="w-4 h-4" />;
          color = "bg-red-100 text-red-600 border-red-500";
        } else if (status === "verified_by_reviewer") {
          icon = <Clock className="w-4 h-4" />;
          color = "bg-yellow-100 text-yellow-700 border-yellow-500";
        } else {
          icon = <Clock className="w-4 h-4" />;
          color = "bg-blue-100 text-blue-600 border-blue-500";
        }
        lineColor = "bg-gray-200";
      }

      return {
        ...s,
        icon,
        color,
        line: idx < steps.length - 1 ? lineColor : null,
      };
    });
  };

  const steps = getSteps(budget.status);

  // Map status to current step for visual highlight (simplification for demo)
  // In a real app, logic would be more robust.

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8">
      {/* Header Area */}
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={backHref}
              className="p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-[#1E293B]">
                Budget Tracking
              </h1>
              <p className="text-gray-500">
                Track the complete lifecycle and history of this budget request
              </p>
            </div>
          </div>
          <button className="p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200 relative">
            <Bell className="w-6 h-6 text-gray-600" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full"></span>
          </button>
        </div>

        {/* Main Brief Card */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between mb-8">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-[#1E293B]">
                  {budget.projectName}
                </h2>
                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-md text-xs font-semibold uppercase tracking-wider">
                  {budget.type}
                </span>
              </div>
              <p className="text-gray-500 font-medium">
                {budget.displayId} - {budget.projectSub}
              </p>
            </div>
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-full border ${statusConfig.color}`}
            >
              {statusConfig.icon}
              <span className="text-sm font-bold uppercase tracking-wide">
                {statusConfig.label}
              </span>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-4 p-6 bg-gray-50/50 rounded-2xl">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                Total amount
              </p>
              <p className="text-lg font-bold text-[#1E293B]">
                {budget.totalAmount}
              </p>
            </div>
            <div className="space-y-1 text-center">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                Requester
              </p>
              <p className="text-lg font-bold text-[#1E293B]">
                {budget.requester}
              </p>
            </div>
            <div className="space-y-1 text-center">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                Created
              </p>
              <p className="text-lg font-bold text-[#1E293B]">
                {budget.createdDate}
              </p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                Last Updated
              </p>
              <p className="text-lg font-bold text-[#1E293B]">
                {budget.updatedDate}
              </p>
            </div>
          </div>

          {/* Workflow Progress */}
          <div className="mt-12 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1E293B]">
                Workflow progress
              </h3>
              <button
                onClick={() => setIsAuditModalOpen(true)}
                className="text-gray-500 text-sm font-semibold hover:underline"
              >
                Expand
              </button>
            </div>

            <div className="flex items-center px-4">
              {steps.map((step, idx) => (
                <React.Fragment key={idx}>
                  <div className="flex flex-col items-center relative z-10">
                    <div
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${step.color} bg-white transition-all`}
                    >
                      {step.icon}
                    </div>
                    <span className="mt-2 text-xs font-bold text-[#334155] absolute -bottom-6 whitespace-nowrap">
                      {step.label}
                    </span>
                  </div>
                  {step.line && (
                    <div
                      className={`flex-1 h-1 mx-0.5 ${step.line} transition-all`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-8">
            {/* Cost Breakdown */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-[#1E293B]">
                  ₱ Cost Breakdown
                </span>
              </div>
              <div className="space-y-2">
                {items.length > 0 ? (
                  items.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-gray-50/50 hover:bg-gray-100 transition-colors rounded-xl flex justify-between items-center group"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-[#1E293B]">
                          {item.description}
                        </p>
                        <p className="text-xs text-gray-500 font-medium">
                          Equipment | Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-[#1E293B]">
                        ₱ {Number(item.total_cost).toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm italic">
                    No items listed
                  </p>
                )}
              </div>
            </div>

            {/* Project Timeline */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-700" />
                <span className="text-lg font-bold text-[#1E293B]">
                  Project timeline
                </span>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between p-3 bg-gray-50/50 rounded-xl">
                    <span className="text-sm text-gray-500 font-bold uppercase tracking-wider">
                      Start Date
                    </span>
                    <span className="text-sm font-bold text-[#1E293B]">
                      {budget.startDate || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between p-3 bg-gray-50/50 rounded-xl">
                    <span className="text-sm text-gray-500 font-bold uppercase tracking-wider">
                      End Date
                    </span>
                    <span className="text-sm font-bold text-[#1E293B]">
                      {budget.endDate || "N/A"}
                    </span>
                  </div>
                </div>

                <div className="p-5 bg-gray-50/30 rounded-2xl border border-gray-100">
                  <p className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">
                    Milestones:
                  </p>
                  <ul className="space-y-2">
                    {milestones.length > 0 ? (
                      milestones.map((m) => (
                        <li
                          key={m.id}
                          className="flex items-center gap-2 text-sm font-semibold text-[#475569]"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          {m.description}{" "}
                          {m.target_quarter ? `- ${m.target_quarter}` : ""}
                        </li>
                      ))
                    ) : (
                      <>
                        <li className="flex items-center gap-2 text-sm font-semibold text-[#475569]">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          Equipment Procurement - Q1
                        </li>
                        <li className="flex items-center gap-2 text-sm font-semibold text-[#475569]">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          Installation - Q2
                        </li>
                        <li className="flex items-center gap-2 text-sm font-semibold text-[#475569]">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          Testing & Commissioning - Q3
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Timeline */}
          <div className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[#1E293B]">
                Complete Timeline
              </h3>
            </div>

            <div className="relative pl-8 space-y-8">
              {/* Vertical Line */}
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200" />

              {auditHistory.length > 0 ? (
                auditHistory.map((log) => {
                  const isRevision = log.action === "revision_requested";
                  const isRejected =
                    log.action === "reject" || log.action === "rejected";
                  let dotColor =
                    "bg-green-500 shadow-[0_0_0_4px_rgba(34,197,94,0.1)]";
                  if (isRevision)
                    dotColor =
                      "bg-orange-500 shadow-[0_0_0_4px_rgba(249,115,22,0.1)]";
                  if (isRejected)
                    dotColor =
                      "bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.1)]";

                  const statusLabel =
                    log.action.replace(/_/g, " ").charAt(0).toUpperCase() +
                    log.action.replace(/_/g, " ").slice(1);

                  return (
                    <div key={log.id} className="relative group">
                      {/* Step Dot */}
                      <div
                        className={`absolute -left-5.5 top-1.5 w-3 h-3 rounded-full ${dotColor} z-10`}
                      />

                      <div className="bg-gray-50/50 p-5 rounded-2xl group-hover:bg-gray-100/80 transition-colors border border-gray-200/50 group-hover:border-gray-300 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-bold text-[#1E293B]">
                              {statusLabel}
                            </p>
                            <p className="text-xs text-[#475569] font-medium mt-1">
                              {log.description}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-[#1E293B] bg-white px-3 py-1 rounded-lg border border-gray-100 whitespace-nowrap ml-4">
                            {log.date}
                          </span>
                        </div>

                        <div className="pt-3 border-t border-gray-200/50">
                          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
                            Comment:
                          </p>
                          <p className="text-sm text-[#1E293B] font-medium bg-white p-3 rounded-lg border border-gray-100">
                            {log.comment && log.comment.trim() ? (
                              log.comment
                            ) : (
                              <span className="text-gray-400 italic">
                                No comment provided
                              </span>
                            )}
                          </p>
                        </div>

                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider pt-1">
                          by {log.actor}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 italic text-center py-8">
                  No audit logs found
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Audit Tracking Modal */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsAuditModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <h2 className="text-2xl font-bold text-[#1E293B]">
                    Complete Audit Tracking
                  </h2>
                </div>
                <button
                  onClick={() => setIsAuditModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="relative pl-8 space-y-12">
                {/* Vertical Line */}
                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-100" />

                {auditHistory.length > 0 ? (
                  auditHistory.map((log) => {
                    const isRevision = log.action === "revision_requested";
                    const isRejected =
                      log.action === "reject" || log.action === "rejected";
                    let dotColor =
                      "bg-green-500 shadow-[0_0_0_4px_rgba(34,197,94,0.1)]";
                    if (isRevision)
                      dotColor =
                        "bg-orange-500 shadow-[0_0_0_4px_rgba(249,115,22,0.1)]";
                    if (isRejected)
                      dotColor =
                        "bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.1)]";

                    const statusLabel =
                      log.action.replace(/_/g, " ").charAt(0).toUpperCase() +
                      log.action.replace(/_/g, " ").slice(1);

                    return (
                      <div key={log.id} className="relative group">
                        {/* Step Dot */}
                        <div
                          className={`absolute -left-5.5 top-1.5 w-3 h-3 rounded-full ${dotColor} z-10`}
                        />

                        <div className="flex justify-between items-start bg-gray-50/50 p-4 rounded-2xl group-hover:bg-gray-100/80 transition-colors">
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-[#1E293B]">
                              {statusLabel}
                            </p>
                            <p className="text-xs text-[#475569] font-medium">
                              {log.description}
                            </p>
                            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                              by {log.actor}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-[#1E293B] bg-white px-3 py-1 rounded-lg border border-gray-100">
                            {log.date}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 italic text-center py-8">
                    No audit logs found
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
