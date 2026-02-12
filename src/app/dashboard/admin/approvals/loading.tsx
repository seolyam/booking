export default function ApprovalsLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-9 w-40 bg-gray-200 rounded-lg" />
        <div className="h-4 w-36 bg-gray-100 rounded" />
      </div>

      {/* Tabs skeleton */}
      <div className="rounded-2xl bg-white shadow-sm border border-gray-100/50 overflow-hidden">
        <div className="flex gap-4 border-b border-gray-100 p-4">
          <div className="h-8 w-32 bg-gray-100 rounded" />
          <div className="h-8 w-32 bg-gray-100 rounded" />
        </div>
        <div className="p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl">
              <div className="h-12 w-12 bg-gray-100 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-gray-200 rounded" />
                <div className="h-3 w-56 bg-gray-100 rounded" />
              </div>
              <div className="h-8 w-20 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
