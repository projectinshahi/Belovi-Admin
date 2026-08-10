'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Client-side pager for the table pages. Kept deliberately plain: a count on
 * the left, prev/next on the right, hairline rule above. No numbered page
 * pills — they'd fight the type system at these sizes.
 */
export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  itemLabel = 'items',
}: {
  /** 1-indexed. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  const navBtn =
    'inline-flex items-center gap-1.5 eyebrow-tight px-3 py-2 border border-line text-ink ' +
    'transition-colors duration-300 ease-editorial hover:border-ink hover:bg-ink hover:text-ivory ' +
    'disabled:opacity-40 disabled:pointer-events-none';

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pt-5 mt-1 border-t border-line">
      <p className="font-sans text-[12px] text-faint">
        Showing <span className="text-muted">{first}</span>–
        <span className="text-muted">{last}</span> of{' '}
        <span className="text-muted">{total}</span> {itemLabel}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className={navBtn}
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={13} />
          Prev
        </button>
        <span className="font-sans text-[12px] text-faint px-1 tabular-nums">
          {page} / {pageCount}
        </span>
        <button
          type="button"
          className={navBtn}
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
        >
          Next
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
