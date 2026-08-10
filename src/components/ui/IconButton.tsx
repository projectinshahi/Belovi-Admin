'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * Square icon control for table rows. Replaces the tinted rounded squares that
 * were pasted per page (`w-[36px] h-[36px] rounded-[10px] bg-[#fef2f2]` etc).
 *
 * `label` is required — these are icon-only, so without it they are unreadable
 * to a screen reader. It doubles as the tooltip.
 */
export default function IconButton({
  children,
  label,
  tone = 'neutral',
  className = '',
  ...rest
}: {
  children: ReactNode;
  label: string;
  tone?: 'neutral' | 'danger';
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const tones = {
    neutral: 'text-muted hover:text-ink hover:border-ink/40 hover:bg-beige',
    danger: 'text-muted hover:text-danger hover:border-danger/40 hover:bg-danger-tint',
  } as const;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`w-8 h-8 inline-flex items-center justify-center border border-line bg-transparent transition-colors duration-300 ease-editorial disabled:opacity-40 disabled:pointer-events-none ${tones[tone]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
