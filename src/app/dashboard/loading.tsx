export default function DashboardLoading() {
  return (
    <div className="space-y-10 animate-pulse">
      {/* Stats skeleton */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-white shadow-sm p-6 border border-gray-100/50"
          >
            <div className="h-12 w-12 rounded-xl bg-gray-200" />
            <div className="mt-6 h-10 w-16 bg-gray-200 rounded" />
            <div className="mt-2 h-4 w-24 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-4xl bg-white shadow-sm overflow-hidden border border-gray-100">
        <div className="p-8">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div className="h-6 w-48 bg-gray-200 rounded" />
            <div className="h-10 w-36 bg-gray-200 rounded-xl" />
          </div>

          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 py-4 border-b border-gray-50"
              >
                <div className="h-4 w-20 bg-gray-100 rounded" />
                <div className="h-4 w-40 bg-gray-200 rounded" />
                <div className="h-6 w-16 bg-gray-100 rounded-md" />
                <div className="h-4 w-24 bg-gray-200 rounded" />
                <div className="h-6 w-20 bg-gray-100 rounded-full" />
                <div className="h-4 w-16 bg-gray-100 rounded" />
                <div className="ml-auto h-8 w-16 bg-gray-200 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
