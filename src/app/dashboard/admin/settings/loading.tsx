export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-32 bg-gray-200 rounded-lg" />
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/50 max-w-md space-y-4">
        <div className="h-5 w-40 bg-gray-200 rounded" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-32 bg-gray-100 rounded" />
            <div className="h-10 w-full bg-gray-100 rounded-lg" />
          </div>
        ))}
        <div className="h-10 w-full bg-gray-200 rounded-lg mt-4" />
      </div>
    </div>
  );
}
