export default function QuickLoading() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Header skeleton */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="h-7 w-36 rounded bg-gray-200 animate-pulse" />
      </div>

      {/* Form skeleton */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          {/* Title input */}
          <div className="h-14 rounded-lg bg-gray-200 animate-pulse" />
          {/* Date picker */}
          <div className="h-12 rounded-lg bg-gray-100 animate-pulse" />
          {/* Submit button */}
          <div className="h-14 rounded-lg bg-gray-200 animate-pulse" />
          {/* Secondary buttons */}
          <div className="flex gap-2">
            <div className="flex-1 h-10 rounded-lg bg-gray-100 animate-pulse" />
            <div className="flex-1 h-10 rounded-lg bg-gray-100 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
