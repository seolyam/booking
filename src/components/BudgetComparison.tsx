"use client";

import { useState } from "react";

interface ComparableBudget {
  id: string;
  projectName: string;
  date: string;
  amount: number;
  profitMargin: number;
  approver: string;
}

interface BudgetComparisonProps {
  currentAmount: number;
  historicalMin?: number;
  historicalMax?: number;
  historicalAverage?: number;
  comparableBudgets: ComparableBudget[];
}

function formatPhp(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function BudgetComparison({
  currentAmount,
  historicalMin,
  historicalMax,
  historicalAverage,
  comparableBudgets,
}: BudgetComparisonProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasHistoricalData = historicalAverage && historicalMin && historicalMax;
  
  const departmentDisplay = "Operations department";

  return (
    <>
      {/* Compact Card View */}
      <div className="bg-white rounded-lg border border-gray-200 border-l-4 p-6">
        {/* Header with Expand Button */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-gray-900">
            Budget comparison analysis
          </h2>
          <button
            onClick={() => setIsExpanded(true)}
            className="text-green-600 hover:text-green-700 font-medium text-sm underline transition-colors"
          >
            Expand
          </button>
        </div>

        {/* Main Content - Horizontal Layout */}
        <div className="flex gap-8">
          {/* Pie Chart - Left Side */}
          <div className="flex-shrink-0">
            <div className="w-40 h-40 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "conic-gradient(from 0deg, rgb(187, 247, 208) 0deg 180deg, rgb(219, 234, 254) 180deg 360deg)" }}>
              <div className="text-center">
                <div className="text-xs text-gray-600 mb-1">Your Request</div>
                <div className="text-lg font-bold text-gray-900">
                  {formatPhp(currentAmount)}
                </div>
              </div>
            </div>
          </div>

          {/* Info Boxes - Right Side */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Current Request Box */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
              <div className="text-xs text-gray-600 font-medium mb-1">
                Current request
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatPhp(currentAmount)}
              </div>
            </div>

            {/* Historical Average Box */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <div className="text-xs text-gray-600 font-medium mb-1">
                Historical average
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {hasHistoricalData ? formatPhp(historicalAverage!) : "N/A"}
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Text */}
        <p className="text-xs text-gray-600 mt-6">
          {comparableBudgets.length > 0
            ? `Compared against ${comparableBudgets.length} similar OpEx budgets from ${departmentDisplay}`
            : "No similar budgets available for comparison yet"}
        </p>
      </div>

      {/* Expanded Modal */}
      {isExpanded && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center gap-4">
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-600 hover:text-gray-900 text-xl font-light"
              >
                ←
              </button>
              <h2 className="text-lg font-semibold text-gray-900">
                Comparison Analysis
              </h2>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-8">
              {/* Pie Chart and Legend - Horizontal Layout */}
              <div className="flex items-center gap-12">
                {/* Pie Chart Center */}
                <div className="flex-shrink-0">
                  <div className="w-48 h-48 rounded-full flex items-center justify-center" style={{ background: "conic-gradient(from 0deg, rgb(187, 247, 208) 0deg 180deg, rgb(219, 234, 254) 180deg 360deg)" }}>
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">
                        Your Request
                      </div>
                      <div className="text-xl font-bold text-gray-900">
                        {formatPhp(currentAmount)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legend on the Right */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-200"></div>
                    <span className="text-xs text-gray-700">Your Request</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-200"></div>
                    <span className="text-xs text-gray-700">Past Projects</span>
                  </div>
                </div>
              </div>

              {/* Info Boxes Below Chart */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <div className="text-xs text-gray-600 font-medium mb-1">
                    Current Request:
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatPhp(currentAmount)}
                  </div>
                </div>

                {hasHistoricalData ? (
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                    <div className="text-xs text-gray-600 font-medium mb-2">
                      Historical Range:
                    </div>
                    <div className="space-y-0.5 text-xs">
                      <div>
                        <span className="text-gray-600">Min:</span>{" "}
                        <span className="font-semibold text-gray-900">
                          {formatPhp(historicalMin!)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Max:</span>{" "}
                        <span className="font-semibold text-gray-900">
                          {formatPhp(historicalMax!)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-xs text-gray-600 font-medium mb-1">
                      Historical Range:
                    </div>
                    <div className="text-sm font-semibold text-gray-500">
                      N/A
                    </div>
                  </div>
                )}
              </div>

              {/* Similar Approved Budgets */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Similar Approved Budget
                </h3>
                {comparableBudgets.length > 0 ? (
                  <div className="space-y-2">
                    {comparableBudgets.map((budget) => (
                      <div
                        key={budget.id}
                        className="flex items-start justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">
                            {budget.projectName}
                          </h4>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {budget.date}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {budget.approver}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-sm font-bold text-gray-900">
                            {formatPhp(budget.amount)}
                          </div>
                          <div
                            className={`text-xs font-medium ${
                              budget.profitMargin > 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {budget.profitMargin > 0 ? "+" : ""}
                            {budget.profitMargin}% Profit
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No Similar Approved Budget Yet
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
