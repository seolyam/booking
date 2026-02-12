export default function RequestDetailLoading() {
  return (
    <div className="space-y-6 md:space-y-8 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 bg-gray-200 rounded-full" />
        <div>
          <div className="h-7 w-48 bg-gray-200 rounded-lg" />
          <div className="h-4 w-72 bg-gray-100 rounded mt-2" />
        </div>
      </div>

      {/* Title & Status */}
      <div className="px-1">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-7 w-64 bg-gray-200 rounded-lg" />
          <div className="h-6 w-12 bg-gray-100 rounded" />
        </div>
        <div className="h-4 w-48 bg-gray-100 rounded" />
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* Left column */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/50 space-y-6">
            <div className="h-5 w-40 bg-gray-200 rounded" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="h-3 w-16 bg-gray-100 rounded mb-2" />
                  <div className="h-5 w-24 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-6">
              <div className="h-3 w-24 bg-gray-100 rounded mb-2" />
              <div className="h-16 w-full bg-gray-100 rounded" />
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/50 h-48" />
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/50 h-32" />
        </div>
      </div>
    </div>
  );
}
