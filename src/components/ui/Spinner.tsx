'use client';

/**
 * Hairline ring spinner. The storefront's loading idiom: a `line`-coloured ring
 * with a single bronze arc, never a thick two-tone SaaS spinner.
 */
export default function Spinner({
  size = 20,
  tone = 'bronze',
  className = '',
}: {
  size?: number;
  /** `current` inherits the parent's text colour — used inside buttons. */
  tone?: 'bronze' | 'ink' | 'current';
  className?: string;
}) {
  const tones = {
    bronze: 'border-line border-t-bronze',
    ink: 'border-line border-t-ink',
    current: 'border-current/25 border-t-current',
  } as const;

  return (
    <span
      role="status"
      aria-label="Loading"
      style={{ width: size, height: size }}
      className={`inline-block shrink-0 rounded-full border animate-spin ${tones[tone]} ${className}`}
    />
  );
}
