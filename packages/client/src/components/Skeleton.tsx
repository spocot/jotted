export function SkeletonLine({ width = "100%" }: { width?: string }) {
  return (
    <div
      className="h-3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"
      style={{ width }}
    />
  );
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-gray-200 dark:bg-gray-800 rounded animate-pulse ${className}`} />
  );
}

export function NoteListSkeleton() {
  return (
    <div className="grid gap-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg"
        >
          <SkeletonLine width="60%" />
          <div className="mt-2 space-y-1.5">
            <SkeletonLine width="100%" />
            <SkeletonLine width="80%" />
          </div>
          <div className="mt-2">
            <SkeletonLine width="30%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EditorSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <SkeletonLine width="50%" />
      <div className="space-y-2">
        <SkeletonLine width="100%" />
        <SkeletonLine width="100%" />
        <SkeletonLine width="90%" />
        <SkeletonLine width="70%" />
        <SkeletonLine width="100%" />
        <SkeletonLine width="60%" />
      </div>
    </div>
  );
}
