"use client";

import { ArrowLeft, X } from "lucide-react";

export interface SimilarProject {
  id: string;
  name: string;
  amount: string;
  date: string;
  requester: string;
  profit?: string;
}

interface BudgetComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAmount: number;
  historicalAverage: number;
  historicalMin: number;
  historicalMax: number;
  similarProjects: SimilarProject[];
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

// Extracted Chart Component (from BudgetComparisonAnalysis.tsx)
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

  const vb = 100;
  const center = vb / 2;
  const rInner = 34;
  const rOuter = 41;
  const cInner = 2 * Math.PI * rInner;
  const cOuter = 2 * Math.PI * rOuter;

  const innerDash = `${baseProgress * cInner} ${cInner}`;
  const outerDash = `${overProgress * cOuter} ${cOuter}`;

  const ringColor = "#22c55e"; // always green for current request
  // Base track now represents Historical Average (Blue)
  const trackColor = "#bfdbfe"; // blue-200

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
          {/* Base track (Historical Average) */}
          <circle
            cx={center}
            cy={center}
            r={rInner}
            fill="none"
            stroke={trackColor}
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
                stroke={ringColor}
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

const formatPhp = (amount: number | string) => {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);
};

export default function BudgetComparisonModal({
  isOpen,
  onClose,
  currentAmount,
  lastYearAmount,
  lastYearBudget,
  currentYear,
  lastYear,
  budgetType,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentAmount: number;
  lastYearAmount: number | null;
  lastYearBudget: {
    id: string;
    date: string;
    status: string;
    projectCode: string;
  } | null;
  currentYear: number;
  lastYear: number;
  budgetType: string;
}) {
  if (!isOpen) return null;

  const delta = lastYearAmount ? currentAmount - lastYearAmount : 0;
  const deltaPercent = lastYearAmount && lastYearAmount > 0 
    ? ((currentAmount - lastYearAmount) / lastYearAmount) * 100 
    : lastYearAmount === 0 && currentAmount > 0 
      ? 100 // Treat 0 -> >0 as 100% (or we could use Infinity/null but 100% or just showing the delta is safer for UI)
      : 0;
  const isIncrease = delta > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 md:p-6 overflow-hidden">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh] md:max-h-[90vh] animate-in fade-in zoom-in duration-200">
        <div className="p-4 md:p-8 flex-shrink-0 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h2 className="text-lg md:text-2xl font-bold text-[#1E293B] truncate">
                Comparison Analysis
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-4 md:p-8 overflow-y-auto space-y-6 md:space-y-8 custom-scrollbar">
          {/* Visual Chart Area */}
          <div className="flex justify-center py-2 md:py-4">
            <div className="relative" style={{ width: 200, height: 200 }}>
              <DonutComparisonChart
                currentAmount={currentAmount}
                historicalAverage={lastYearAmount || currentAmount} // Fallback to current if no history (100% match)
                size={200}
              />
              <div className="absolute -right-4 top-0 md:-right-32 md:top-1/4 space-y-2 md:space-y-3 bg-white/90 p-2 rounded-lg shadow-sm md:shadow-none md:bg-transparent md:p-0 border border-gray-100 md:border-none">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full bg-green-500`}
                  ></div>
                  <span className="text-xs md:text-sm font-semibold text-gray-600">
                    {currentYear} Request
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-200"></div>
                  <span className="text-xs md:text-sm font-semibold text-gray-600">
                    {lastYear} Spending
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Side by Side Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
             {/* Last Year Card */}
            <div className="p-4 md:p-6 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm font-bold text-blue-800 uppercase tracking-wider">
                  {lastYear} ({budgetType})
                </p>
                 {lastYearBudget ? (
                    <span className="px-2 py-1 rounded-md bg-white text-xs font-semibold text-blue-700 border border-blue-100">
                      {lastYearBudget.status}
                    </span>
                 ) : (
                    <span className="px-2 py-1 rounded-md bg-gray-100 text-xs font-semibold text-gray-500">
                      Not Found
                    </span>
                 )}
              </div>
              
              {lastYearBudget && lastYearAmount !== null ? (
                <>
                  <p className="text-2xl md:text-3xl font-black text-gray-900">
                    {formatPhp(lastYearAmount)}
                  </p>
                  <div className="pt-2 border-t border-blue-100">
                     <p className="text-xs text-blue-600 font-medium">
                        Project Code: <span className="text-blue-900">{lastYearBudget.projectCode}</span>
                     </p>
                     <p className="text-xs text-blue-600 font-medium mt-1">
                        Date: <span className="text-blue-900">{lastYearBudget.date}</span>
                     </p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                    <p className="text-gray-400 italic font-medium">No record found for {lastYear}</p>
                </div>
              )}
            </div>

            {/* Current Year Card */}
            <div className="p-4 md:p-6 bg-green-50/50 rounded-2xl border border-green-100 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm font-bold text-green-800 uppercase tracking-wider">
                  {currentYear} ({budgetType})
                </p>
                <span className="px-2 py-1 rounded-md bg-white text-xs font-semibold text-green-700 border border-green-100">
                  Current
                </span>
              </div>
              <p className="text-2xl md:text-3xl font-black text-gray-900">
                {formatPhp(currentAmount)}
              </p>
               <div className="pt-2 border-t border-green-100">
                   {lastYearAmount ? (
                       <div className="flex items-center gap-2">
                           <span className={`text-sm font-bold ${isIncrease ? 'text-red-600' : 'text-green-600'}`}>
                               {isIncrease ? "+" : ""}{formatPhp(delta)}
                           </span>
                           <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${isIncrease ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                               {isIncrease ? "Increase" : "Decrease"} ({Math.abs(Math.round(deltaPercent))}%)
                           </span>
                       </div>
                   ) : (
                       <p className="text-xs text-gray-500 italic">No historical data for comparison</p>
                   )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
