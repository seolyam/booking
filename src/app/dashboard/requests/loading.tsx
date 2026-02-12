export default function RequestsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 w-48 bg-gray-200 rounded-lg" />
          <div className="h-4 w-64 bg-gray-100 rounded mt-2" />
        </div>
        <div className="h-10 w-36 bg-gray-200 rounded-xl" />
      </div>

      {/* Filters skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-10 flex-1 bg-gray-100 rounded-lg" />
        <div className="h-10 w-10 bg-gray-100 rounded-lg" />
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100/50">
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3">
              <div className="h-4 w-16 bg-gray-100 rounded" />
              <div className="h-4 w-40 bg-gray-100 rounded" />
              <div className="h-4 w-20 bg-gray-100 rounded" />
              <div className="h-4 w-24 bg-gray-100 rounded" />
              <div className="h-6 w-16 bg-gray-100 rounded-full" />
              <div className="h-4 w-20 bg-gray-100 rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
