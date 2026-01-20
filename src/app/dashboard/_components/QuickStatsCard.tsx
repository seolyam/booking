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
        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Quick stats</h2>

            <div className="space-y-3">
                <div className="flex justify-between items-center p-4 bg-gray-50/50 rounded-xl">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Project Duration</span>
                    <span className="text-sm font-bold text-gray-900">{projectDuration}</span>
                </div>

                <div className="flex justify-between items-center p-4 bg-gray-50/50 rounded-xl">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cost Items</span>
                    <span className="text-sm font-bold text-gray-900">{costItems}</span>
                </div>

                <div className="flex justify-between items-center p-4 bg-gray-50/50 rounded-xl">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Average Items Cost</span>
                    <span className="text-sm font-bold text-gray-900">{averageItemsCost}</span>
                </div>
            </div>
        </div>
    );
}
