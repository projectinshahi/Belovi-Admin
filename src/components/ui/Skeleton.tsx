'use client';

/**
 * Loading placeholders. The `.skeleton` class in globals.css supplies a warm
 * sand base with an ivory sweep, so waiting reads as part of the brand rather
 * than a grey SaaS shimmer.
 */

export function Skeleton({
  className = '',
  rounded = false,
}: {
  className?: string;
  /** Only for genuine circles (avatars). Everything else stays square. */
  rounded?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`skeleton block ${rounded ? 'rounded-full' : ''} ${className}`}
    />
  );
}

/** Placeholder rows matching the Table primitive's rhythm. */
export function SkeletonTable({
  rows = 5,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="divide-y divide-line border-t border-line" aria-busy="true">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 py-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className="h-3"
              // Vary the widths so the block reads as text, not a grid.
              {...{ style: { width: c === 0 ? '22%' : c === cols - 1 ? '12%' : '18%' } }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Placeholder for the dashboard stat tiles. */
export function SkeletonStat() {
  return (
    <div className="bg-cream border border-line p-5" aria-busy="true">
      <Skeleton className="h-2 w-20 mb-4" />
      <Skeleton className="h-7 w-28" />
    </div>
  );
}

export default Skeleton;
