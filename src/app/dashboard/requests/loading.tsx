export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-4 mb-8">
        <div className="h-10 w-10 bg-gray-200 rounded-lg" />
        <div>
          <div className="h-6 w-48 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-32 bg-gray-100 rounded" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl bg-white shadow-sm overflow-hidden border border-gray-100">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="h-6 w-40 bg-gray-200 rounded" />
            <div className="h-10 w-32 bg-gray-200 rounded-lg" />
          </div>

          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 py-3 border-b border-gray-50"
              >
                <div className="h-4 w-16 bg-gray-100 rounded" />
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-5 w-14 bg-gray-100 rounded-md" />
                <div className="h-4 w-20 bg-gray-200 rounded" />
                <div className="h-5 w-16 bg-gray-100 rounded-full" />
                <div className="ml-auto h-8 w-14 bg-gray-200 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
