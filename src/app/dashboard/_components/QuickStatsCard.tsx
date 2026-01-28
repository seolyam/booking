"use client";

interface QuickStatsCardProps {
    projectDuration: string;
    costItems: number;
    averageItemsCost: string;
}

export default function QuickStatsCard({
    projectDuration,
    costItems,
    averageItemsCost,
}: QuickStatsCardProps) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Quick stats</h2>
            </div>

            <div className="space-y-3">
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Timeline
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                        {projectDuration}
                    </span>
                </div>

                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Cost Items
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{costItems}</span>
                </div>

                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Average Items Cost
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                        {averageItemsCost}
                    </span>
                </div>
            </div>
        </div>
    );
}
