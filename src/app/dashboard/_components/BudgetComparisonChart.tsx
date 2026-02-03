"use client";

import React from "react";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

interface DonutComparisonChartProps {
    currentAmount: number;
    historicalAverage: number;
    size?: number;
    label?: string;
}

export default function BudgetComparisonChart({
    currentAmount,
    historicalAverage,
    size = 160,
    label = "Variance",
}: DonutComparisonChartProps) {
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
                    <p className="text-xs font-bold text-gray-400 uppercase">{label}</p>
                    <p className="text-lg font-bold text-gray-900">{deltaLabel}</p>
                </div>
            </div>
        </div>
    );
}