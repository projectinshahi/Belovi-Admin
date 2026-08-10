'use client';

import type { ReactNode } from 'react';

/**
 * Shown when a collection is empty or a search returns nothing. Uses the
 * eyebrow-over-serif unit so an empty table still looks composed rather than
 * broken — the storefront's "graceful degradation" principle applied to data.
 */
export default function EmptyState({
  eyebrow = 'Nothing here yet',
  title,
  message,
  action,
  icon,
}: {
  eyebrow?: string;
  title: string;
  message?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {icon && (
        <div className="w-12 h-12 mb-5 flex items-center justify-center border border-line text-faint">
          {icon}
        </div>
      )}
      <p className="eyebrow text-bronze-deep mb-2">{eyebrow}</p>
      <h3 className="font-display font-light text-2xl text-ink leading-tight">
        {title}
      </h3>
      {message && (
        <p className="font-sans text-[13px] text-muted mt-2 max-w-sm leading-relaxed">
          {message}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
