"use client";

import React, { useState } from "react";
import { ArrowLeft, X, Calendar, TrendingUp, History } from "lucide-react";

interface SimilarProject {
  id: string;
  name: string;
  amount: string;
  date: string;
  requester: string;
  profit?: string;
}

interface BudgetComparisonProps {
  currentAmount: number;
  historicalAverage: number;
  historicalMin: number;
  historicalMax: number;
  similarProjects: SimilarProject[];
  departmentName: string;
  budgetType: string;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function DonutComparisonChart({
  currentAmount,
  historicalAverage,
  size = 160,
}: {
  currentAmount: number;
  historicalAverage: number;
  size?: number;
}) {
  const avg = historicalAverage > 0 ? historicalAverage : 1;
  const ratio = currentAmount / avg;

  const baseProgress = clamp(ratio, 0, 1);
  const overRatio = Math.max(ratio - 1, 0);
  const overMax = 0.5; // Visualize up to +50% over average
  const overProgress = clamp(overRatio / overMax, 0, 1);

  const deltaPct = ((currentAmount - avg) / avg) * 100;
  const deltaLabel = Number.isFinite(deltaPct)
    ? `${deltaPct >= 0 ? "+" : ""}${Math.round(deltaPct)}%`
    : "—";

  const isHigher = currentAmount > avg;

  const vb = 100;
  const center = vb / 2;
  const rInner = 34;
  const rOuter = 41;
  const cInner = 2 * Math.PI * rInner;
  const cOuter = 2 * Math.PI * rOuter;

  const innerDash = `${baseProgress * cInner} ${cInner}`;
  const outerDash = `${overProgress * cOuter} ${cOuter}`;

  const ringColor = isHigher ? "#f59e0b" : "#22c55e"; // amber / green

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      aria-label="Budget comparison chart"
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${vb} ${vb}`}
        role="img"
        aria-hidden="true"
      >
        <g transform={`rotate(-90 ${center} ${center})`}>
          {/* Base track */}
          <circle
            cx={center}
            cy={center}
            r={rInner}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={12}
          />
          {/* Base progress: current vs average (0..100%) */}
          <circle
            cx={center}
            cy={center}
            r={rInner}
            fill="none"
            stroke={ringColor}
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={innerDash}
          />

          {/* Overage ring: +0..50% */}
          {overProgress > 0 ? (
            <>
              <circle
                cx={center}
                cy={center}
                r={rOuter}
                fill="none"
                stroke="#f3f4f6"
                strokeWidth={6}
              />
              <circle
                cx={center}
                cy={center}
                r={rOuter}
                fill="none"
                stroke="#fb923c"
                strokeWidth={6}
                strokeLinecap="round"
                strokeDasharray={outerDash}
              />
            </>
          ) : null}
        </g>
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xs font-bold text-gray-400 uppercase">Vs Avg</p>
          <p className="text-lg font-bold text-gray-900">{deltaLabel}</p>
        </div>
      </div>
    </div>
  );
}

export default function BudgetComparisonAnalysis({
  currentAmount,
  historicalAverage,
  historicalMin,
  historicalMax,
  similarProjects,
  departmentName,
  budgetType,
}: BudgetComparisonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatPhp = (amount: number | string) => {
    const n = typeof amount === "string" ? Number(amount) : amount;
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(n);
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">
              Budget comparison analysis
            </h2>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-green-600 text-sm font-semibold hover:underline"
          >
            Expand
          </button>
        </div>

        <div className="flex items-center gap-12">
          {/* Functional Donut Chart */}
          <DonutComparisonChart
            currentAmount={currentAmount}
            historicalAverage={historicalAverage}
            size={160}
          />

          <div className="flex-1 space-y-4">
            <div className="p-4 bg-green-50 rounded-xl flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">
                  Current request
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {formatPhp(currentAmount)}
                </p>
              </div>
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                  Historical average
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {formatPhp(historicalAverage)}
                </p>
              </div>
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <History className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-xs text-gray-500 font-medium">
          Compared against {similarProjects.length} similar {budgetType} budgets
          from {departmentName} department
        </p>
      </div>

      {/* Comparison Analysis Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <h2 className="text-2xl font-bold text-[#1E293B]">
                    Comparison Analysis
                  </h2>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-8">
                {/* Visual Chart Area */}
                <div className="flex justify-center py-4">
                  <div className="relative" style={{ width: 240, height: 240 }}>
                    <DonutComparisonChart
                      currentAmount={currentAmount}
                      historicalAverage={historicalAverage}
                      size={240}
                    />
                    <div className="absolute -right-32 top-1/4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-sm font-semibold text-gray-600">
                          Your Request
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                        <span className="text-sm font-semibold text-gray-600">
                          Avg Baseline
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Range Stats */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-50 text-center space-y-1">
                    <p className="text-sm font-bold text-blue-800 uppercase tracking-wider">
                      Current Request:
                    </p>
                    <p className="text-3xl font-black text-gray-900">
                      {formatPhp(currentAmount)}
                    </p>
                  </div>
                  <div className="p-6 bg-purple-50/50 rounded-2xl border border-purple-50 text-center space-y-1">
                    <p className="text-sm font-bold text-purple-800 uppercase tracking-wider">
                      Historical Range:
                    </p>
                    <div className="flex items-center justify-center gap-4">
                      <p className="text-xs font-bold text-gray-500">
                        Min:{" "}
                        <span className="text-gray-900">
                          {formatPhp(historicalMin)}
                        </span>
                      </p>
                      <p className="text-xs font-bold text-gray-500">
                        Max:{" "}
                        <span className="text-gray-900">
                          {formatPhp(historicalMax)}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Similar Projects List */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                    Similar Approved Budget
                  </h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {similarProjects.length > 0 ? (
                      similarProjects.map((project) => (
                        <div
                          key={project.id}
                          className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center group hover:bg-white hover:shadow-md transition-all"
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-gray-900">
                              {project.name}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                              <span>{project.date}</span>
                              <span>•</span>
                              <span>{project.requester}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-gray-900">
                              {formatPhp(project.amount)}
                            </p>
                            {project.profit && (
                              <p className="text-[10px] font-bold text-green-600">
                                +{project.profit} Profit
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 italic text-center py-4">
                        No similar projects found
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #ddd;
          border-radius: 10px;
        }
      `}</style>
    </>
  );
}
