"use client";

import React, { useState } from "react";
import { Calendar, TrendingUp, History } from "lucide-react";
import BudgetComparisonChart from "./BudgetComparisonChart";
import BudgetComparisonModal, {
  type SimilarProject,
} from "./BudgetComparisonModal";

interface BudgetComparisonProps {
  currentAmount: number;
  departmentName: string;
  budgetType: string;
  lastYearAmount: number | null;
  lastYearBudget: {
    id: string;
    date: string;
    status: string;
    projectCode: string;
  } | null;
  currentYear: number;
  lastYear: number;
}

export default function BudgetComparisonAnalysis({
  currentAmount,
  departmentName,
  budgetType,
  lastYearAmount,
  lastYearBudget,
  currentYear,
  lastYear,
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
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
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

        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-12">
          {/* Functional Donut Chart */}
          <BudgetComparisonChart
            currentAmount={currentAmount}
            historicalAverage={lastYearAmount || currentAmount} // Fallback to current if no history (100% match)
            size={160}
          />

          <div className="flex-1 w-full space-y-4">
            <div className="p-4 bg-green-50 rounded-xl flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">
                  Current request ({currentYear})
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
                  Last Year ({lastYear})
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {lastYearAmount !== null ? formatPhp(lastYearAmount) : "N/A"}
                </p>
              </div>
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <History className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-xs text-gray-500 font-medium">
          Comparing {currentYear} vs {lastYear} for {budgetType} project code{" "}
          {lastYearBudget?.projectCode || "(no match)"}.
        </p>
      </div>

      <BudgetComparisonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentAmount={currentAmount}
        lastYearAmount={lastYearAmount}
        lastYearBudget={lastYearBudget}
        currentYear={currentYear}
        lastYear={lastYear}
        budgetType={budgetType}
      />
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
