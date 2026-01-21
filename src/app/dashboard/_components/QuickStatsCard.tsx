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
        <div className="bg-white rounded-4xl p-10 border border-gray-100 shadow-sm space-y-8">
            <h2 className="text-2xl font-black text-gray-900">Quick stats</h2>

            <div className="space-y-4">
                <div className="flex justify-between items-center p-5 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                    <span className="text-sm text-gray-400 font-bold uppercase tracking-wider">
                        Timeline
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                        {projectDuration}
                    </span>
                </div>

                <div className="flex justify-between items-center p-5 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                    <span className="text-sm text-gray-400 font-bold uppercase tracking-wider">
                        Cost Items
                    </span>
                    <span className="text-lg font-bold text-gray-900">{costItems}</span>
                </div>

                <div className="flex justify-between items-center p-5 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                    <span className="text-sm text-gray-400 font-bold uppercase tracking-wider">
                        Average Items Cost
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                        {averageItemsCost}
                    </span>
                </div>
            </div>
        </div>
    );
}
