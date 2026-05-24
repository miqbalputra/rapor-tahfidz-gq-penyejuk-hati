import { cn } from "@/lib/utils/cn";

type SkeletonProps = {
  // Skeleton placeholder ringan dengan shimmer animation murni CSS.
  // Tidak ada JS overhead, ukuran dependency = 0.
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-md bg-[var(--surface-soft)]",
        // Shimmer effect via gradient yang bergerak.
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.4s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent dark:before:via-white/10",
        className,
      )}
    />
  );
}

// Beberapa preset skeleton untuk pola umum.
export function SkeletonText({ className, lines = 1 }: { className?: string; lines?: number }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton className={cn("h-4", index === lines - 1 ? "w-2/3" : "w-full")} key={index} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm", className)}>
      <Skeleton className="mb-4 h-6 w-1/3" />
      <SkeletonText lines={3} />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-md border border-[var(--line)]">
      <div className="border-b border-[var(--line)] bg-[var(--surface-soft)] p-3">
        <Skeleton className="h-4 w-1/4" />
      </div>
      <div className="divide-y divide-[var(--line)]">
        {Array.from({ length: rows }).map((_, index) => (
          <div className="flex items-center gap-3 p-3" key={index}>
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-20 shrink-0 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonMetricGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm" key={index}>
          <Skeleton className="mb-3 h-3 w-1/2" />
          <Skeleton className="mb-3 h-9 w-1/3" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}
