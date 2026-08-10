'use client';

import type { ReactNode } from 'react';

/**
 * The system's surface primitive: clean white panel with a subtle premium shadow
 * on top of the ivory layout background.
 */
export function Card({
  children,
  className = '',
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  /** Turn off for cards whose child is a full-bleed table. */
  padded?: boolean;
}) {
  return (
    <div
      className={`bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-line ${padded ? 'p-5 sm:p-6' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * The eyebrow-over-serif unit that opens nearly every module in the storefront.
 * This is the single most repeated pattern in the design language.
 */
export function CardHeader({
  eyebrow,
  title,
  description,
  action,
  className = '',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-4 ${className}`}
    >
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow text-bronze-deep mb-1.5">{eyebrow}</p>}
        <h2 className="font-display font-light text-2xl leading-tight text-ink">
          {title}
        </h2>
        {description && (
          <p className="font-sans text-[13px] text-muted mt-1.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export default Card;
