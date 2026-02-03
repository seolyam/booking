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
  historicalAverage,
  historicalMin,
  historicalMax,
  similarProjects,
}: BudgetComparisonModalProps) {
  if (!isOpen) return null;

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
                historicalAverage={historicalAverage}
                size={200}
              />
              <div className="absolute -right-4 top-0 md:-right-32 md:top-1/4 space-y-2 md:space-y-3 bg-white/90 p-2 rounded-lg shadow-sm md:shadow-none md:bg-transparent md:p-0 border border-gray-100 md:border-none">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full bg-green-500`}
                  ></div>
                  <span className="text-xs md:text-sm font-semibold text-gray-600">
                    Your Request
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-200"></div>
                  <span className="text-xs md:text-sm font-semibold text-gray-600">
                    Avg Baseline
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Range Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="p-4 md:p-6 bg-blue-50/50 rounded-2xl border border-blue-50 text-center space-y-1">
              <p className="text-xs md:text-sm font-bold text-blue-800 uppercase tracking-wider">
                Current Request:
              </p>
              <p className="text-2xl md:text-3xl font-black text-gray-900">
                {formatPhp(currentAmount)}
              </p>
            </div>
            <div className="p-4 md:p-6 bg-purple-50/50 rounded-2xl border border-purple-50 text-center space-y-1">
              <p className="text-xs md:text-sm font-bold text-purple-800 uppercase tracking-wider">
                Historical Range:
              </p>
              <div className="flex items-center justify-center gap-4">
                <p className="text-[10px] md:text-xs font-bold text-gray-500">
                  Min:{" "}
                  <span className="text-gray-900">
                    {formatPhp(historicalMin)}
                  </span>
                </p>
                <p className="text-[10px] md:text-xs font-bold text-gray-500">
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
            <h3 className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-widest sticky top-0 bg-white py-2">
              Similar Approved Budget
            </h3>
            <div className="space-y-3">
              {similarProjects.length > 0 ? (
                similarProjects.map((project) => (
                  <div
                    key={project.id}
                    className="p-3 md:p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center group hover:bg-white hover:shadow-md transition-all"
                  >
                    <div className="space-y-1 min-w-0 flex-1 mr-4">
                      <p className="text-xs md:text-sm font-bold text-gray-900 truncate">
                        {project.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <span>{project.date}</span>
                        <span className="hidden md:inline">•</span>
                        <span className="truncate max-w-[100px] md:max-w-none">
                          {project.requester}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs md:text-sm font-black text-gray-900">
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
  );
}
