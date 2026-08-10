'use client';

import type { ReactNode } from 'react';

/**
 * Page-level eyebrow + serif title + optional action row, closed by a hairline.
 * Every screen opens with this so the studio has one consistent entry rhythm.
 */
export default function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="border-b border-line pb-6 mb-6 sm:mb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow text-bronze-deep mb-2">{eyebrow}</p>}
          <h1 className="font-display font-light text-[clamp(1.9rem,3.2vw,2.6rem)] leading-[1.1] text-ink">
            {title}
          </h1>
          {description && (
            <p className="font-sans text-[13px] text-muted mt-2 leading-relaxed max-w-xl">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
